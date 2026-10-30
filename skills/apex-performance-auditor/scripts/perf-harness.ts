#!/usr/bin/env bun
/** Apex performance auditor: static hotspot scan and statistical benchmark harness. */
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { spawnSync } from "node:child_process";

import { percentile, scanDirectory } from "./perf-scan.ts";

export interface BenchMetrics {
  command: string;
  warmup_runs: number;
  measured_runs: number;
  failed_runs: number;
  min_ms: number;
  p50_ms: number;
  mean_ms: number;
  p90_ms: number;
  p95_ms: number;
  p99_ms: number;
  max_ms: number;
  iqr_ms: number;
  stdev_ms: number;
  cv_percent: number;
  throughput_ops_per_sec: number;
  baseline_comparison?: Record<string, number>;
  baseline_comparison_error?: string;
}

const round = (value: number, digits: number): number => {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
};

function runOnce(command: string, cwd: string | undefined, timeoutMs: number | undefined): number {
  const started = performance.now();
  const result = spawnSync(command, { shell: true, cwd, timeout: timeoutMs, stdio: "ignore" });
  return result.status === 0 ? 0 : (result.status ?? 1) || performance.now() - started;
}

export async function runBenchmark(
  command: string,
  warmup: number,
  runs: number,
  timeoutSeconds: number | undefined,
  cwd: string | undefined,
  baselinePath: string | undefined,
): Promise<BenchMetrics> {
  const timeoutMs = timeoutSeconds === undefined ? undefined : timeoutSeconds * 1000;
  for (let index = 0; index < Math.max(0, warmup); index += 1) runOnce(command, cwd, timeoutMs);

  const samples: number[] = [];
  let failures = 0;
  for (let index = 0; index < Math.max(1, runs); index += 1) {
    const started = performance.now();
    const result = spawnSync(command, { shell: true, cwd, timeout: timeoutMs, stdio: "ignore" });
    samples.push(performance.now() - started);
    if (result.status !== 0) failures += 1;
  }

  const sorted = [...samples].sort((a, b) => a - b);
  const mean = sorted.reduce((total, value) => total + value, 0) / sorted.length;
  const variance =
    sorted.length > 1 ? sorted.reduce((total, value) => total + (value - mean) ** 2, 0) / (sorted.length - 1) : 0;
  const stdev = Math.sqrt(variance);
  const cv = mean > 0 ? (stdev / mean) * 100 : 0;
  const p25 = percentile(sorted, 25);
  const p75 = percentile(sorted, 75);

  const metrics: BenchMetrics = {
    command,
    warmup_runs: warmup,
    measured_runs: samples.length,
    failed_runs: failures,
    min_ms: round(sorted[0], 4),
    p50_ms: round(percentile(sorted, 50), 4),
    mean_ms: round(mean, 4),
    p90_ms: round(percentile(sorted, 90), 4),
    p95_ms: round(percentile(sorted, 95), 4),
    p99_ms: round(percentile(sorted, 99), 4),
    max_ms: round(sorted[sorted.length - 1], 4),
    iqr_ms: round(p75 - p25, 4),
    stdev_ms: round(stdev, 4),
    cv_percent: round(cv, 2),
    throughput_ops_per_sec: mean > 0 ? round(1000 / mean, 4) : 0,
  };

  // ponytail: no child-process rusage through node:child_process; RSS keys are omitted rather
  // than faked. Read /proc on Linux if a consumer ever needs memory numbers.
  if (baselinePath && existsSync(baselinePath)) {
    try {
      const baseline = JSON.parse(await readFile(baselinePath, "utf8")) as Record<string, number>;
      const comparison: Record<string, number> = {};
      for (const key of ["p50_ms", "mean_ms", "p95_ms", "p99_ms", "max_rss_kb"] as const) {
        const base = baseline[key];
        const current = metrics[key as keyof BenchMetrics];
        if (typeof base === "number" && base > 0 && typeof current === "number") {
          comparison[`${key}_delta_percent`] = round(((current - base) / base) * 100, 2);
        }
      }
      if (typeof baseline.mean_ms === "number" && baseline.mean_ms > 0 && metrics.mean_ms > 0) {
        comparison.speedup_factor = round(baseline.mean_ms / metrics.mean_ms, 3);
      }
      metrics.baseline_comparison = comparison;
    } catch (error) {
      metrics.baseline_comparison_error = String(error);
    }
  }

  return metrics;
}

const HELP = `usage: perf-harness.ts <command> [options]

commands:
  scan <path>   Scan a source tree for static performance and stability hazards
  bench         Run a statistical benchmark on a shell command

scan options:
  --include-tests            Include test files in the scan
  --max-findings <n>         Maximum candidate findings to emit (default: 250)
  --output <path>            Write JSON output to a file

bench options:
  --cmd <shell command>      Command to benchmark (required)
  --warmup <n>               Warmup iterations (default: 3)
  --runs <n>                 Measured iterations (default: 15)
  --timeout <seconds>        Per-iteration timeout (default: 120)
  --cwd <path>               Working directory for the command
  --baseline-json <path>     Compare against a saved baseline JSON file
  --output <path>            Write JSON output to a file`;

function value(argv: string[], name: string): string | undefined {
  const index = argv.indexOf(name);
  return index === -1 ? undefined : argv[index + 1];
}

function number(argv: string[], name: string, fallback: number): number {
  const raw = value(argv, name);
  return raw === undefined ? fallback : Number(raw);
}

export async function main(argv: string[]): Promise<number> {
  if (argv.length === 0) {
    console.log(HELP);
    return 1;
  }
  const command = argv[0];
  const output = value(argv, "--output");
  let payload: unknown;

  if (command === "scan") {
    const target = argv[1];
    if (!target || target.startsWith("--")) {
      console.error("Error: path not found: undefined");
      return 1;
    }
    if (!existsSync(target)) {
      console.error(`Error: path not found: ${target}`);
      return 1;
    }
    payload = await scanDirectory(target, argv.includes("--include-tests"), number(argv, "--max-findings", 250));
  } else if (command === "bench") {
    const cmd = value(argv, "--cmd");
    if (!cmd) {
      console.error("usage: perf-harness.ts bench --cmd <shell command>");
      return 2;
    }
    payload = await runBenchmark(cmd, number(argv, "--warmup", 3), number(argv, "--runs", 15), number(argv, "--timeout", 120), value(argv, "--cwd"), value(argv, "--baseline-json"));
  } else {
    console.log(HELP);
    return 1;
  }

  const text = JSON.stringify(payload, null, 2);
  if (output) {
    await mkdir(dirname(output), { recursive: true });
    await writeFile(output, `${text}\n`);
  }
  console.log(text);
  return 0;
}

const meta = import.meta as ImportMeta & { main?: boolean };
if (meta.main) {
  process.exitCode = await main(process.argv.slice(2));
}
