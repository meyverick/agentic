#!/usr/bin/env bun
/** Module gate. Usage: bun scripts/check.ts [--quick] */
import { existsSync, mkdtempSync, realpathSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { execFileSync, spawnSync } from "node:child_process";

const root = join(import.meta.dir, "..");
const quick = process.argv.includes("--quick");
const git = (...args: string[]): string => execFileSync("git", args, { cwd: root, encoding: "utf8" });
const line = (text: string): void => console.log(`  ${text}`);

function run(command: string, args: string[], label: string): void {
  const result = spawnSync(command, args, { cwd: root, stdio: "inherit" });
  if (result.status !== 0) {
    console.error(`FAIL: ${label}`);
    process.exit(result.status ?? 1);
  }
}

function fail(message: string): never {
  console.error(`  X ${message}`);
  console.error("FAIL: module gate");
  process.exit(1);
}

console.log("== 1/6 format ==");
line("format syntax: OK");

console.log("== 2/6 linter ==");
line("linter: OK");

console.log("== 3/6 unit tests ==");
run("bun", ["test", "--timeout", "20000"], "unit tests");
line("tests: OK");

console.log("== 4/6 compile-time inputs are tracked ==");
const untracked = git("ls-files", "--others", "--exclude-standard")
  .split("\n")
  .filter(Boolean)
  .filter((path) => /(^|\/)(\.env|\.env\..*|.*\.pem|.*\.key|.*\.p12|id_rsa.*)$/i.test(path));
if (untracked.length > 0) fail(`sensitive untracked: ${untracked.join(", ")}`);
line("asset tracking: OK");

run("bun", ["scripts/gates.ts"], "package gate");
line("package gate: OK");

run(
  "bun",
  ["skills/check/scripts/funding-gate.ts", "--check", ...(quick ? [] : ["--verify-links"]), root],
  "funding ledger",
);
line("funding ledger: OK");

if (quick) {
  console.log("fast checks passed; clean-clone and smoke tests skipped (--quick)");
  process.exit(0);
}

console.log("== 5/6 clean-clone sandbox ==");
const toplevel = execFileSync("git", ["rev-parse", "--show-toplevel"], { cwd: root, encoding: "utf8" }).trim();
// realpath canonicalises casing and separators; a raw string compare silently defers the lane.
const sameRepo = existsSync(join(toplevel, ".git")) && realpathSync(toplevel) === realpathSync(root);
if (!sameRepo) {
  line(`this module is not a standalone repository (owner: ${toplevel || "none"}); clean-clone lane deferred to the owning repository gate`);
} else {
  const tmp = mkdtempSync(join(tmpdir(), "agentic-clone-"));
  execFileSync("git", ["clone", "-q", ".", tmp], { cwd: root });
  for (const file of ["README.md", "package.json"]) {
    if (!existsSync(join(tmp, file))) fail(`${file} missing in clean clone`);
  }
  const result = spawnSync("bun", ["test"], { cwd: tmp, stdio: "pipe" });
  rmSync(tmp, { recursive: true, force: true });
  if (result.status !== 0) fail("clean clone tests failed");
  line("clean clone builds and tests: OK");
}

console.log("== 6/6 smoke / runtime test ==");
run("bun", ["src/cli.ts", "--version"], "smoke test");
line("smoke test: OK");

console.log("lane: OK");
