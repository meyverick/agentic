#!/usr/bin/env python3
"""
Apex Performance Auditor: Static Hotspot Scanner & Statistical Benchmark Harness.

Provides two deterministic subcommands with zero third-party dependencies:
  1. `scan <path>`  : Scans source trees for high-signal performance, allocation,
                      concurrency, I/O, stability, and resilience anti-patterns.
  2. `bench --cmd`  : Executes a workload across warmup and measured iterations,
                      computing p50/p90/p95/p99 latency, CV%, peak RSS memory,
                      and optional percentage deltas against a baseline JSON file.
"""

from __future__ import annotations

import argparse
import json
import math
import os
import re
import statistics
import subprocess
import sys
import time
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any, Dict, List, Optional, Pattern, Tuple

try:
    import resource
except ImportError:
    resource = None  # type: ignore[assignment]


IGNORE_DIRS = {
    ".git",
    ".hg",
    ".svn",
    "node_modules",
    "target",
    "dist",
    "build",
    "out",
    ".next",
    ".nuxt",
    ".venv",
    "venv",
    "__pycache__",
    ".pytest_cache",
    ".mypy_cache",
    ".tox",
    "vendor",
    "coverage",
    "bin",
    "obj",
}

SUPPORTED_EXTENSIONS = {
    ".rs": "rust",
    ".go": "go",
    ".ts": "typescript",
    ".tsx": "typescript",
    ".js": "javascript",
    ".jsx": "javascript",
    ".mjs": "javascript",
    ".py": "python",
    ".cs": "csharp",
    ".java": "java",
    ".kt": "kotlin",
    ".cpp": "cpp",
    ".cc": "cpp",
    ".cxx": "cpp",
    ".c": "c",
    ".h": "cpp",
    ".hpp": "cpp",
    ".sql": "sql",
}


@dataclass
class ScanRule:
    rule_id: str
    dimension: str
    priority_hint: str
    languages: Tuple[str, ...]
    pattern: Pattern[str]
    title: str
    rationale: str
    multiline: bool = False


@dataclass
class ScanFinding:
    rule_id: str
    dimension: str
    priority_hint: str
    language: str
    file: str
    line: int
    title: str
    snippet: str
    rationale: str


RULES: List[ScanRule] = [
    # --- IO & Batching ---
    ScanRule(
        rule_id="IO-LOOP-AWAIT",
        dimension="IO",
        priority_hint="High",
        languages=("typescript", "javascript", "python", "rust", "csharp"),
        pattern=re.compile(
            r"\b(?:for|while)\b[^{:\n]*[ph{:]?(?:[^\n]*\n){0,8}?[^\n]*\bawait\b",
            re.MULTILINE,
        ),
        title="Sequential `await` inside loop body (potential N+1 I/O bottleneck)",
        rationale="Awaiting inside a loop serializes asynchronous I/O round-trips. Batch requests or execute concurrently with bounded concurrency.",
        multiline=True,
    ),
    ScanRule(
        rule_id="IO-LOOP-QUERY",
        dimension="IO",
        priority_hint="Critical",
        languages=("go", "python", "typescript", "javascript", "rust", "csharp", "java"),
        pattern=re.compile(
            r"\b(?:for|while)\b[^{:\n]*[ph{:]?(?:[^\n]*\n){0,10}?[^\n]*\b(?:\.Query|\.QueryRow|\.Exec|cursor\.execute|session\.execute|prisma\.\w+\.\w+|\.findOne|\.findUnique| fetch\(|axios\.|http\.Get|http\.Post)\b",
            re.MULTILINE,
        ),
        title="Database query or network RPC executed inside a loop (N+1 pattern)",
        rationale="Issuing individual queries or HTTP calls per loop iteration multiplies network and query-planner overhead by N.",
        multiline=True,
    ),
    ScanRule(
        rule_id="IO-SQL-SELECT-STAR",
        dimension="IO",
        priority_hint="Medium",
        languages=("sql", "go", "python", "typescript", "javascript", "rust", "csharp", "java"),
        pattern=re.compile(r"\bSELECT\s+\*\s+FROM\b", re.IGNORECASE),
        title="Unbounded `SELECT * FROM` projection",
        rationale="Fetching all columns increases disk I/O, network payload size, and memory materialization while preventing index-only scans.",
    ),
    # --- Compute & Parsing ---
    ScanRule(
        rule_id="COMP-LOOP-REGEX",
        dimension="COMP",
        priority_hint="High",
        languages=("rust", "go", "python", "typescript", "javascript", "csharp", "java"),
        pattern=re.compile(
            r"\b(?:Regex::new|regexp\.MustCompile|regexp\.Compile|re\.compile|new\s+RegExp|new\s+Regex)\s*\("
        ),
        title="Runtime regular expression compilation",
        rationale="Compiling finite automata at call time or inside loops adds high CPU and allocation overhead; hoist into a static/lazy constant.",
    ),
    ScanRule(
        rule_id="COMP-NESTED-SEARCH",
        dimension="COMP",
        priority_hint="High",
        languages=("typescript", "javascript", "python", "rust", "csharp", "java"),
        pattern=re.compile(
            r"\b(?:for|while|\.map\(|\.filter\(|\.forEach\()[^{:\n]*[ph{:]?(?:[^\n]*\n){0,6}?[^\n]*\.(?:includes|indexOf|find|findIndex|contains)\s*\(",
            re.MULTILINE,
        ),
        title="Linear collection scan nested inside iteration (O(N*M) complexity hazard)",
        rationale="Calling linear search methods inside a loop degrades complexity to O(N*M); pre-index the lookup target into a HashSet/Map for O(1) access.",
        multiline=True,
    ),
    # --- Memory Lifecycle ---
    ScanRule(
        rule_id="MEM-READ-ALL",
        dimension="MEM",
        priority_hint="High",
        languages=("go", "rust", "python", "typescript", "javascript", "csharp"),
        pattern=re.compile(
            r"\b(?:io\.ReadAll|ioutil\.ReadAll|fs::read_to_string|fs::read\(|read_to_end\(|fs\.readFileSync\(|File\.ReadAllBytes|File\.ReadAllText)\b"
        ),
        title="Full-payload eager buffering into memory",
        rationale="Loading entire files or network streams into contiguous heap buffers risks OOM spikes under large inputs; prefer bounded streaming/chunked readers.",
    ),
    ScanRule(
        rule_id="MEM-CLONE-IN-LOOP",
        dimension="MEM",
        priority_hint="Medium",
        languages=("rust", "cpp", "csharp", "java", "typescript", "javascript"),
        pattern=re.compile(
            r"\b(?:for|while)\b[^{:\n]*[ph{:]?(?:[^\n]*\n){0,8}?[^\n]*(?:\.clone\(\)|structuredClone\(|JSON\.parse\(JSON\.stringify\()",
            re.MULTILINE,
        ),
        title="Heap cloning or deep copy inside loop body",
        rationale="Deep cloning objects per loop iteration amplifies allocator pressure and cache misses; borrow by reference, slice, or move ownership.",
        multiline=True,
    ),
    # --- Concurrency & Scheduling ---
    ScanRule(
        rule_id="CONC-UNBOUNDED-SPAWN",
        dimension="CONC",
        priority_hint="High",
        languages=("go", "rust", "python", "csharp"),
        pattern=re.compile(
            r"\b(?:for|while)\b[^{:\n]*[ph{:]?(?:[^\n]*\n){0,6}?[^\n]*\b(?:go\s+func|tokio::spawn|async_std::task::spawn|asyncio\.create_task|Task\.Run)\b",
            re.MULTILINE,
        ),
        title="Unbounded task/goroutine spawn inside a loop",
        rationale="Spawning concurrent tasks inside a loop without a bounded worker pool or semaphore can exhaust memory and overwhelm downstream dependencies.",
        multiline=True,
    ),
    ScanRule(
        rule_id="CONC-SYNC-IN-ASYNC",
        dimension="CONC",
        priority_hint="High",
        languages=("rust", "typescript", "javascript", "python"),
        pattern=re.compile(
            r"\b(?:std::thread::sleep|time\.sleep\(|fs\.readFileSync|fs\.writeFileSync|child_process\.execSync|requests\.(?:get|post|put|delete)\()\b"
        ),
        title="Synchronous blocking call capable of starving an async executor",
        rationale="Blocking the OS thread inside an async runtime stalls all concurrent tasks scheduled on that worker thread.",
    ),
    # --- Runtime Stability ---
    ScanRule(
        rule_id="STAB-UNWRAP-PANIC",
        dimension="STAB",
        priority_hint="Medium",
        languages=("rust", "go"),
        pattern=re.compile(r"(?:\.unwrap\(\)|\bpanic!\(|\bpanic\()"),
        title="Explicit unwrap or panic call on execution path",
        rationale="Unhandled unwraps or panics terminate the thread or process on unexpected inputs; propagate structured errors or provide safe fallbacks.",
    ),
    ScanRule(
        rule_id="STAB-SWALLOWED-ERROR",
        dimension="STAB",
        priority_hint="Medium",
        languages=("python", "typescript", "javascript", "csharp", "java"),
        pattern=re.compile(
            r"(?:except\s*(?:Exception|BaseException)?\s*:\s*pass\b|catch\s*\([^)]*\)\s*\{\s*\})",
            re.MULTILINE,
        ),
        title="Silently swallowed exception block",
        rationale="Empty exception handlers hide partial state corruption and transient failures; log context, surface telemetry, or handle specific error types.",
        multiline=True,
    ),
    # --- Resilience & Tail Latency ---
    ScanRule(
        rule_id="RESIL-HTTP-NO-TIMEOUT",
        dimension="RESIL",
        priority_hint="High",
        languages=("go", "python", "rust"),
        pattern=re.compile(
            r"\b(?:http\.Get\(|http\.Post\(|&http\.Client\{\s*\}|reqwest::get\()"
        ),
        title="Default HTTP client or request invoked without an explicit timeout",
        rationale="Default clients without deadlines can hang indefinitely when a downstream peer stalls, exhausting connection pools and worker threads.",
    ),
    ScanRule(
        rule_id="RESIL-UNBOUNDED-QUEUE",
        dimension="RESIL",
        priority_hint="High",
        languages=("rust", "python", "go", "csharp", "java"),
        pattern=re.compile(
            r"\b(?:unbounded_channel\(|asyncio\.Queue\(\s*\)|queue\.Queue\(\s*\)|Channel\.CreateUnbounded|Executors\.newCachedThreadPool)\b"
        ),
        title="Unbounded in-memory channel or queue without backpressure",
        rationale="Unbounded queues grow until OOM when producer throughput exceeds consumer capacity; enforce bounded capacity with explicit backpressure.",
    ),
]


def is_test_path(path: Path) -> bool:
    parts = [p.lower() for p in path.parts]
    if any(p in ("test", "tests", "__tests__", "benches", "fixtures", "examples") for p in parts):
        return True
    name = path.name.lower()
    return (
        name.endswith("_test.go")
        or name.endswith("_test.rs")
        or name.endswith(".test.ts")
        or name.endswith(".spec.ts")
        or name.endswith(".test.js")
        or name.startswith("test_")
    )


def scan_directory(target_path: Path, include_tests: bool = False, max_findings: int = 250) -> Dict[str, Any]:
    findings: List[ScanFinding] = []
    files_scanned = 0
    lines_scanned = 0

    if target_path.is_file():
        candidate_files = [target_path]
    else:
        candidate_files = []
        for root, dirs, files in os.walk(target_path):
            dirs[:] = [d for d in dirs if d not in IGNORE_DIRS and not d.startswith(".")]
            for f in files:
                fpath = Path(root) / f
                if fpath.suffix.lower() in SUPPORTED_EXTENSIONS:
                    if include_tests or not is_test_path(fpath):
                        candidate_files.append(fpath)

    for fpath in sorted(candidate_files):
        lang = SUPPORTED_EXTENSIONS.get(fpath.suffix.lower())
        if not lang:
            continue
        try:
            content = fpath.read_text(encoding="utf-8", errors="replace")
        except OSError:
            continue

        files_scanned += 1
        lines = content.splitlines()
        lines_scanned += len(lines)
        rel_path = str(fpath)

        applicable_rules = [r for r in RULES if lang in r.languages]
        for rule in applicable_rules:
            if rule.multiline:
                for match in rule.pattern.finditer(content):
                    line_no = content.count("\n", 0, match.start()) + 1
                    raw_snippet = match.group(0).strip().splitlines()
                    snippet = " ".join(s.strip() for s in raw_snippet[:3])
                    if len(snippet) > 160:
                        snippet = snippet[:157] + "..."
                    findings.append(
                        ScanFinding(
                            rule_id=rule.rule_id,
                            dimension=rule.dimension,
                            priority_hint=rule.priority_hint,
                            language=lang,
                            file=rel_path,
                            line=line_no,
                            title=rule.title,
                            snippet=snippet,
                            rationale=rule.rationale,
                        )
                    )
                    if len(findings) >= max_findings:
                        break
            else:
                for idx, line_text in enumerate(lines, start=1):
                    stripped = line_text.strip()
                    if stripped.startswith(("//", "#", "--", "/*")):
                        continue
                    if rule.pattern.search(line_text):
                        snippet = stripped[:160]
                        findings.append(
                            ScanFinding(
                                rule_id=rule.rule_id,
                                dimension=rule.dimension,
                                priority_hint=rule.priority_hint,
                                language=lang,
                                file=rel_path,
                                line=idx,
                                title=rule.title,
                                snippet=snippet,
                                rationale=rule.rationale,
                            )
                        )
                        if len(findings) >= max_findings:
                            break
            if len(findings) >= max_findings:
                break
        if len(findings) >= max_findings:
            break

    priority_order = {"Critical": 0, "High": 1, "Medium": 2, "Low": 3}
    findings.sort(key=lambda x: (priority_order.get(x.priority_hint, 9), x.file, x.line))

    by_dimension: Dict[str, int] = {}
    by_priority: Dict[str, int] = {}
    for item in findings:
        by_dimension[item.dimension] = by_dimension.get(item.dimension, 0) + 1
        by_priority[item.priority_hint] = by_priority.get(item.priority_hint, 0) + 1

    return {
        "scanner": "apex-performance-auditor/perf_harness.py",
        "target": str(target_path),
        "files_scanned": files_scanned,
        "lines_scanned": lines_scanned,
        "total_candidates": len(findings),
        "truncated": len(findings) >= max_findings,
        "summary_by_priority": by_priority,
        "summary_by_dimension": by_dimension,
        "candidates": [asdict(f) for f in findings],
    }


def percentile(sorted_vals: List[float], pct: float) -> float:
    if not sorted_vals:
        return 0.0
    if len(sorted_vals) == 1:
        return sorted_vals[0]
    rank = (pct / 100.0) * (len(sorted_vals) - 1)
    low = int(math.floor(rank))
    high = int(math.ceil(rank))
    if low == high:
        return sorted_vals[low]
    weight = rank - low
    return sorted_vals[low] * (1.0 - weight) + sorted_vals[high] * weight


def run_benchmark(
    cmd: str,
    warmup: int,
    runs: int,
    timeout_s: Optional[float],
    cwd: Optional[str],
    baseline_path: Optional[Path],
) -> Dict[str, Any]:
    for _ in range(max(0, warmup)):
        subprocess.run(
            cmd,
            shell=True,
            cwd=cwd,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            timeout=timeout_s,
            check=False,
        )

    samples_ms: List[float] = []
    failures = 0
    rusage_before = resource.getrusage(resource.RUSAGE_CHILDREN) if resource else None

    for _ in range(max(1, runs)):
        t0 = time.perf_counter_ns()
        proc = subprocess.run(
            cmd,
            shell=True,
            cwd=cwd,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            timeout=timeout_s,
            check=False,
        )
        elapsed_ms = (time.perf_counter_ns() - t0) / 1_000_000.0
        samples_ms.append(elapsed_ms)
        if proc.returncode != 0:
            failures += 1

    rusage_after = resource.getrusage(resource.RUSAGE_CHILDREN) if resource else None
    sorted_ms = sorted(samples_ms)
    mean_ms = statistics.fmean(sorted_ms)
    stdev_ms = statistics.stdev(sorted_ms) if len(sorted_ms) > 1 else 0.0
    cv_pct = (stdev_ms / mean_ms * 100.0) if mean_ms > 0 else 0.0
    p25 = percentile(sorted_ms, 25.0)
    p75 = percentile(sorted_ms, 75.0)

    metrics: Dict[str, Any] = {
        "command": cmd,
        "warmup_runs": warmup,
        "measured_runs": len(samples_ms),
        "failed_runs": failures,
        "min_ms": round(sorted_ms[0], 4),
        "p50_ms": round(percentile(sorted_ms, 50.0), 4),
        "mean_ms": round(mean_ms, 4),
        "p90_ms": round(percentile(sorted_ms, 90.0), 4),
        "p95_ms": round(percentile(sorted_ms, 95.0), 4),
        "p99_ms": round(percentile(sorted_ms, 99.0), 4),
        "max_ms": round(sorted_ms[-1], 4),
        "iqr_ms": round(p75 - p25, 4),
        "stdev_ms": round(stdev_ms, 4),
        "cv_percent": round(cv_pct, 2),
        "throughput_ops_per_sec": round(1000.0 / mean_ms, 4) if mean_ms > 0 else 0.0,
    }

    if rusage_before and rusage_after:
        metrics["user_cpu_s_total"] = round(rusage_after.ru_utime - rusage_before.ru_utime, 4)
        metrics["sys_cpu_s_total"] = round(rusage_after.ru_stime - rusage_before.ru_stime, 4)
        metrics["max_rss_kb"] = int(rusage_after.ru_maxrss)

    if baseline_path and baseline_path.exists():
        try:
            base = json.loads(baseline_path.read_text(encoding="utf-8"))
            comparison: Dict[str, Any] = {}
            for key in ("p50_ms", "mean_ms", "p95_ms", "p99_ms", "max_rss_kb"):
                if key in base and key in metrics and base[key] > 0:
                    delta_pct = ((metrics[key] - base[key]) / base[key]) * 100.0
                    comparison[f"{key}_delta_percent"] = round(delta_pct, 2)
            if "mean_ms" in base and base["mean_ms"] > 0 and metrics["mean_ms"] > 0:
                comparison["speedup_factor"] = round(base["mean_ms"] / metrics["mean_ms"], 3)
            metrics["baseline_comparison"] = comparison
        except (OSError, ValueError, KeyError) as exc:
            metrics["baseline_comparison_error"] = str(exc)

    return metrics


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="perf_harness.py",
        description="Apex Performance Auditor: Static Hotspot Scanner & Statistical Benchmark Harness.",
    )
    sub = parser.add_subparsers(dest="subcommand", required=True)

    scan_p = sub.add_parser("scan", help="Scan a source directory or file for static performance and stability hazards.")
    scan_p.add_argument("path", type=Path, help="Target directory or source file path.")
    scan_p.add_argument("--include-tests", action="store_true", help="Include test files in scan.")
    scan_p.add_argument("--max-findings", type=int, default=250, help="Maximum candidate findings to emit.")
    scan_p.add_argument("--output", type=Path, default=None, help="Optional file path to write JSON output.")

    bench_p = sub.add_parser("bench", help="Run a statistical latency and memory benchmark on a shell command.")
    bench_p.add_argument("--cmd", required=True, help="Shell command to benchmark.")
    bench_p.add_argument("--warmup", type=int, default=3, help="Number of warmup iterations (default: 3).")
    bench_p.add_argument("--runs", type=int, default=15, help="Number of measured iterations (default: 15).")
    bench_p.add_argument("--timeout", type=float, default=120.0, help="Per-iteration timeout in seconds (default: 120).")
    bench_p.add_argument("--cwd", type=str, default=None, help="Working directory for the command.")
    bench_p.add_argument("--baseline-json", type=Path, default=None, help="Compare against a saved baseline JSON file.")
    bench_p.add_argument("--output", type=Path, default=None, help="Optional file path to write JSON output.")

    return parser


def main(argv: Optional[List[str]] = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)

    if args.subcommand == "scan":
        if not args.path.exists():
            sys.stderr.write(f"Error: path not found: {args.path}\n")
            return 1
        result = scan_directory(
            target_path=args.path,
            include_tests=args.include_tests,
            max_findings=args.max_findings,
        )
    elif args.subcommand == "bench":
        result = run_benchmark(
            cmd=args.cmd,
            warmup=args.warmup,
            runs=args.runs,
            timeout_s=args.timeout,
            cwd=args.cwd,
            baseline_path=args.baseline_json,
        )
    else:
        parser.print_help()
        return 1

    payload = json.dumps(result, indent=2)
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(payload + "\n", encoding="utf-8")
    print(payload)
    return 0


if __name__ == "__main__":
    sys.exit(main())