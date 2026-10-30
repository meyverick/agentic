#!/usr/bin/env bun
/** Workspace orchestrator gate. Usage: bun scripts/check.ts [--quick] */
import { existsSync } from "node:fs";
import { join } from "node:path";
import { execFileSync, spawnSync } from "node:child_process";

const root = join(import.meta.dir, "..");
const quick = process.argv.includes("--quick");
const git = (...args: string[]): string => execFileSync("git", args, { cwd: root, encoding: "utf8" });

function fail(message: string): never {
  console.error(`FAIL: ${message}`);
  process.exit(1);
}

console.log("== 1/3 submodule pointers ==");
const statusLines = git("submodule", "status")
  .split("\n")
  .filter((entry) => entry.trim().length > 0);

if (statusLines.length === 0) {
  console.log("  (no submodules registered)");
} else {
  for (const entry of statusLines) console.log(`  ${entry}`);
  if (statusLines.some((entry) => /^[+-]/.test(entry))) {
    console.error("FAIL: submodule pointer is stale (+) or uninitialized (-)");
    console.error("      commit updated pointer in orchestrator: git add <path> && git commit");
    process.exit(1);
  }
}

console.log("== 2/3 tracked credential scan ==");
const credentialShape = /(^|\/)(\.env|\.env\..*|.*\.pem|.*\.key|.*\.p12|id_rsa.*|.*credentials?.*)$/i;
const tracked = git("ls-files")
  .split("\n")
  .filter(Boolean)
  .filter((path) => credentialShape.test(path));
if (tracked.length > 0) {
  for (const path of tracked) console.error(`  X tracked: ${path}`);
  fail("credential-shaped file is tracked by git");
}
console.log("  no credential-shaped paths tracked");

console.log("== 3/3 submodule gates ==");
let submodules = 0;
for (const entry of statusLines) {
  const path = /^[ +-]?[0-9a-f]*\s+(\S+)/.exec(entry)?.[1];
  if (!path) continue;
  // references/ holds read-only upstream repositories; only code modules carry a gate.
  if (path === "references" || path.startsWith("references/")) {
    console.log(`  (skipped read-only reference: ${path})`);
    continue;
  }
  submodules += 1;
  const gate = join(root, path, "scripts", "check.ts");
  if (!existsSync(gate)) {
    console.error(`FAIL: ${path} has no scripts/check.ts`);
    console.error("      orchestrator requires every registered submodule to provide scripts/check.ts");
    process.exit(1);
  }
  console.log(`-- ${path} --`);
  const args = [gate, ...(quick ? ["--quick"] : [])];
  const result = spawnSync("bun", args, { cwd: join(root, path), stdio: "inherit" });
  if (result.status !== 0) fail(`submodule gate failed: ${path}`);
}

if (submodules === 0) console.log("  (no submodules registered)");

console.log("workspace gate: OK");
