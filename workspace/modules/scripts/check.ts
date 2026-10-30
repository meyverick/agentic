#!/usr/bin/env bun
/** Module gate: the six-slot contract. Slots 3 and 6 fail until this project's commands are added. */
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const root = join(import.meta.dir, "..");
const quick = process.argv.includes("--quick");
const failures: string[] = [];
const git = (...args: string[]): string => execFileSync("git", args, { cwd: root, encoding: "utf8" });
const EPIGRAPH = "> *Architected and directed by Human Intelligence, **implemented by AI**.*";

console.log("== 1/6 format ==");
console.log("  skipped: no formatter configured");

console.log("== 2/6 lint ==");
console.log("  skipped: no linter configured");

console.log("== 3/6 native lanes ==");
failures.push("slot 3: unconfigured - add format, lint, test and build to scripts/check.ts");

console.log("== 4/6 tracked assets and docs ==");
const readmePath = join(root, "README.md");
if (!existsSync(readmePath)) {
  failures.push("README.md missing");
} else {
  const readme = readFileSync(readmePath, "utf8");
  const lines = readme.split("\n");
  if (lines[0] !== EPIGRAPH) failures.push("README.md line 1 is not the mandated epigraph");
  if (lines[1] !== "") failures.push("README.md line 2 must be blank");
  if (!lines[2]?.startsWith("# ")) failures.push("README.md line 3 must be the title");
  if (/^```/m.test(readme)) failures.push("README.md must contain no fenced code block");
}
const tracked = git("ls-files", "wiki").split("\n").filter(Boolean);
if (tracked.length === 0) failures.push("wiki/ is not tracked by git");

if (quick) {
  if (failures.length > 0) {
    for (const failure of failures) console.error(`  X ${failure}`);
    console.error("FAIL: module gate");
    process.exit(1);
  }
  console.log("fast checks passed; clean-clone and smoke tests skipped (--quick)");
  process.exit(0);
}

console.log("== 5/6 clean-clone sandbox ==");
const tmp = mkdtempSync(join(tmpdir(), "workspace-clone-"));
try {
  execFileSync("git", ["clone", "-q", ".", tmp], { cwd: root });
  if (!existsSync(join(tmp, "README.md"))) failures.push("README.md missing in clean clone");
} finally {
  rmSync(tmp, { recursive: true, force: true });
}

console.log("== 6/6 smoke / runtime test ==");
failures.push("slot 6: unconfigured - add an entrypoint smoke check to scripts/check.ts");

if (failures.length > 0) {
  for (const failure of failures) console.error(`  X ${failure}`);
  console.error("FAIL: module gate");
  process.exit(1);
}
console.log("lane: OK");
