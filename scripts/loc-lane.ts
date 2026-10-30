/** Module density on the modules a change touches. Over 500 fails; 301-500 warns. */
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { readFileSync } from "node:fs";
import { isAbsolute, join, relative } from "node:path";

export const HARD_CEILING = 500;
export const WARN_CEILING = 300;

export interface DensityReport {
  failures: string[];
  warnings: string[];
  measured: number;
  undeterminable: boolean;
}

function git(root: string, ...args: string[]): string | null {
  try {
    return execFileSync("git", args, { cwd: root, encoding: "utf8", stdio: "pipe" });
  } catch {
    return null;
  }
}

const lines = (output: string | null): string[] =>
  output ? output.split("\n").map((line) => line.trim()).filter(Boolean) : [];

/**
 * Paths this working copy changed: unstaged and staged against HEAD, plus unpushed commits.
 * Falls back to the merge base with origin/main, then to HEAD~1. Null means undeterminable.
 */
export function changedPaths(root: string): string[] | null {
  const found: string[][] = [];

  const working = git(root, "diff", "--name-only", "HEAD");
  if (working !== null) found.push(lines(working));

  const unpushed = git(root, "diff", "--name-only", "@{upstream}..HEAD");
  if (unpushed !== null) found.push(lines(unpushed));

  if (found.length === 0) {
    const base = git(root, "merge-base", "HEAD", "origin/main");
    if (base?.trim()) {
      const againstBase = git(root, "diff", "--name-only", `${base.trim()}..HEAD`);
      if (againstBase !== null) found.push(lines(againstBase));
    }
  }

  if (found.length === 0) {
    const lastCommit = git(root, "diff", "--name-only", "HEAD~1");
    if (lastCommit !== null) found.push(lines(lastCommit));
  }

  if (found.length === 0) return null;
  return [...new Set(found.flat())];
}

/** Physical line count, matching wc -l: a trailing newline does not add a line. */
export function moduleLines(path: string): number {
  const text = readFileSync(path, "utf8");
  if (text.length === 0) return 0;
  const parts = text.split(/\r\n|[\r\n]/);
  return parts[parts.length - 1] === "" ? parts.length - 1 : parts.length;
}

/** The record path named by a first-line `// loc-exempt: <path>` marker, if present. */
export function exemptionFor(path: string): string | null {
  const first = readFileSync(path, "utf8").split(/\r?\n/, 1)[0] ?? "";
  const match = /^\s*\/\/\s*loc-exempt:\s*(\S+)\s*$/.exec(first);
  return match ? match[1] : null;
}

const asPosix = (path: string): string => path.split(/[\\/]/).join("/");

export function checkModuleDensity(root: string): DensityReport {
  const paths = changedPaths(root);
  const report: DensityReport = { failures: [], warnings: [], measured: 0, undeterminable: paths === null };
  if (paths === null) return report;

  for (const rel of paths) {
    if (!rel.endsWith(".ts") || rel.split("/").includes("node_modules")) continue;
    const absolute = join(root, rel);
    if (!existsSync(absolute)) continue;

    const count = moduleLines(absolute);
    report.measured += 1;
    const shown = asPosix(rel);

    if (count > HARD_CEILING) {
      const record = exemptionFor(absolute);
      const recordPath = record ? (isAbsolute(record) ? record : join(root, record)) : null;
      if (recordPath && existsSync(recordPath)) {
        report.warnings.push(`${shown}: ${count} lines, exempted by ${asPosix(record ?? "")}`);
        continue;
      }
      if (recordPath) {
        report.failures.push(`${shown}: ${count} lines exceeds the ${HARD_CEILING}-line ceiling and its exemption record is missing (${record})`);
        continue;
      }
      report.failures.push(
        `${shown}: ${count} lines exceeds the ${HARD_CEILING}-line ceiling; decompose before completing the task`,
      );
    } else if (count > WARN_CEILING) {
      report.warnings.push(`${shown}: ${count} lines is in the ${WARN_CEILING + 1}-${HARD_CEILING} warning band`);
    }
  }

  return report;
}

export const relativeTo = (root: string, path: string): string => asPosix(relative(root, path));
