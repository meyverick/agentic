/** Static hotspot scanner and percentile helper for the performance auditor. */
import { readdir, readFile, stat } from "node:fs/promises";
import { join, sep } from "node:path";

import type { ScanRule } from "./scan-rules.ts";
import { RULES } from "./scan-rules.ts";

export const IGNORE_DIRS = new Set([
  ".git", ".hg", ".svn", "node_modules", "target", "dist", "build", "out", ".next", ".nuxt",
  ".venv", "venv", "__pycache__", ".pytest_cache", ".mypy_cache", ".tox", "vendor", "coverage", "bin", "obj",
]);

export const SUPPORTED_EXTENSIONS: Record<string, string> = {
  ".rs": "rust", ".go": "go", ".ts": "typescript", ".tsx": "typescript", ".js": "javascript",
  ".jsx": "javascript", ".mjs": "javascript", ".py": "python", ".cs": "csharp", ".java": "java",
  ".kt": "kotlin", ".cpp": "cpp", ".cc": "cpp", ".cxx": "cpp", ".c": "c", ".h": "cpp", ".hpp": "cpp", ".sql": "sql",
};

export interface Finding {
  rule_id: string;
  dimension: string;
  priority_hint: string;
  language: string;
  file: string;
  line: number;
  title: string;
  snippet: string;
  rationale: string;
}

export interface ScanReport {
  scanner: string;
  target: string;
  files_scanned: number;
  lines_scanned: number;
  total_candidates: number;
  truncated: boolean;
  summary_by_priority: Record<string, number>;
  summary_by_dimension: Record<string, number>;
  candidates: Finding[];
}

export function isTestPath(path: string): boolean {
  const parts = path.toLowerCase().split(/[\\/]/);
  if (parts.some((part) => ["test", "tests", "__tests__", "benches", "fixtures", "examples"].includes(part))) return true;
  const name = (parts[parts.length - 1] ?? "").toLowerCase();
  return (
    name.endsWith("_test.go") || name.endsWith("_test.rs") || name.endsWith(".test.ts") ||
    name.endsWith(".spec.ts") || name.endsWith(".test.js") || name.startsWith("test_")
  );
}

async function collect(target: string): Promise<string[]> {
  const info = await stat(target).catch(() => null);
  if (info?.isFile()) return [target];
  if (!info?.isDirectory()) return [];

  const files: string[] = [];
  const walk = async (dir: string): Promise<void> => {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
      if (entry.isDirectory()) {
        if (IGNORE_DIRS.has(entry.name) || entry.name.startsWith(".")) continue;
        await walk(join(dir, entry.name));
      } else {
        const path = join(dir, entry.name);
        if (entry.name.includes(".") && Object.hasOwn(SUPPORTED_EXTENSIONS, extension(path))) files.push(path);
      }
    }
  };
  await walk(target);
  return files;
}

function extension(path: string): string {
  const name = path.slice(path.lastIndexOf(sep) + 1);
  const dot = name.lastIndexOf(".");
  return dot === -1 ? "" : name.slice(dot).toLowerCase();
}

function lineOf(content: string, index: number): number {
  return content.slice(0, index).split("\n").length;
}

/** Mirrors Python's str.splitlines(): a trailing newline does not add an empty element. */
function codeLines(content: string): string[] {
  if (content.length === 0) return [];
  const parts = content.split(/\r\n|[\r\n\u000b\u000c\u001c\u001d\u001e\u0085\u2028\u2029]/);
  if (parts[parts.length - 1] === "") parts.pop();
  return parts;
}

function snippetOf(matched: string): string {
  const joined = matched.trim().split("\n").slice(0, 3).map((line) => line.trim()).join(" ");
  return joined.length > 160 ? `${joined.slice(0, 157)}...` : joined;
}

function applies(rule: ScanRule, language: string): boolean {
  return rule.languages.includes(language);
}

const COMMENT_PREFIXES = ["//", "#", "--", "/*"];

export async function scanDirectory(target: string, includeTests = false, maxFindings = 250): Promise<ScanReport> {
  const findings: Finding[] = [];
  let filesScanned = 0;
  let linesScanned = 0;
  const candidates = (await collect(target))
    .filter((path) => includeTests || !isTestPath(path))
    .sort((a, b) => a.localeCompare(b));

  outer: for (const file of candidates) {
    const language = SUPPORTED_EXTENSIONS[extension(file)];
    if (!language) continue;
    let content: string;
    try {
      content = await readFile(file, "utf8");
    } catch {
      continue;
    }

    filesScanned += 1;
    const lines = codeLines(content);
    linesScanned += lines.length;
    const applicable = RULES.filter((rule) => applies(rule, language));

    for (const rule of applicable) {
      if (rule.multiline) {
        const regex = new RegExp(rule.source, `${rule.flags}g`);
        for (const match of content.matchAll(regex)) {
          if (match[0].length === 0) continue;
          findings.push({
            rule_id: rule.rule_id, dimension: rule.dimension, priority_hint: rule.priority_hint,
            language, file, line: lineOf(content, match.index ?? 0),
            title: rule.title, snippet: snippetOf(match[0]), rationale: rule.rationale,
          });
          if (findings.length >= maxFindings) break outer;
        }
      } else {
        const regex = new RegExp(rule.source, rule.flags);
        for (let index = 0; index < lines.length; index += 1) {
          const stripped = lines[index].trim();
          if (COMMENT_PREFIXES.some((prefix) => stripped.startsWith(prefix))) continue;
          if (!regex.test(lines[index])) continue;
          findings.push({
            rule_id: rule.rule_id, dimension: rule.dimension, priority_hint: rule.priority_hint,
            language, file, line: index + 1, title: rule.title,
            snippet: stripped.slice(0, 160), rationale: rule.rationale,
          });
          if (findings.length >= maxFindings) break outer;
        }
      }
    }
  }

  const priorityOrder: Record<string, number> = { Critical: 0, High: 1, Medium: 2, Low: 3 };
  findings.sort((a, b) => {
    const byPriority = (priorityOrder[a.priority_hint] ?? 9) - (priorityOrder[b.priority_hint] ?? 9);
    if (byPriority !== 0) return byPriority;
    const byFile = a.file.localeCompare(b.file);
    return byFile !== 0 ? byFile : a.line - b.line;
  });

  const byDimension: Record<string, number> = {};
  const byPriority: Record<string, number> = {};
  for (const finding of findings) {
    byDimension[finding.dimension] = (byDimension[finding.dimension] ?? 0) + 1;
    byPriority[finding.priority_hint] = (byPriority[finding.priority_hint] ?? 0) + 1;
  }

  return {
    scanner: "apex-performance-auditor/perf-harness.ts",
    target,
    files_scanned: filesScanned,
    lines_scanned: linesScanned,
    total_candidates: findings.length,
    truncated: findings.length >= maxFindings,
    summary_by_priority: byPriority,
    summary_by_dimension: byDimension,
    candidates: findings,
  };
}

export function percentile(sortedValues: number[], pct: number): number {
  if (sortedValues.length === 0) return 0;
  if (sortedValues.length === 1) return sortedValues[0];
  const rank = (pct / 100) * (sortedValues.length - 1);
  const low = Math.floor(rank);
  const high = Math.ceil(rank);
  if (low === high) return sortedValues[low];
  const weight = rank - low;
  return sortedValues[low] * (1 - weight) + sortedValues[high] * weight;
}
