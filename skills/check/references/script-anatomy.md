# Canonical Check Script Anatomy

This reference document defines the standard 6-slot architecture for local pre-push gate scripts (`scripts/check.ts`) across workspace orchestrators and submodules.

---

## 1. The Two-Tier Gate Model

In monorepos and submodule workspaces, gates are divided into two complementary tiers:
1. **The Orchestrator Gate (`scripts/check.ts`)**: Enforces orchestrator-level invariants (pointer synchronization and credential leaks across the tree) and delegates to the codebase submodule gates.
2. **The Submodule Gate (`bun <module>/scripts/check.ts`)**: Enforces language-native compilation, linting, tests, asset tracking, and clean-clone hermeticity for that specific module.

---

## 2. Workspace Orchestrator Skeleton (`scripts/check.ts`)

The root gate coordinates registered submodules (`./<module>/`) and blocks credential leaks before any packet touches the network.

```ts
#!/usr/bin/env bun
// Usage: bun scripts/check.ts [--quick]
import { existsSync } from "node:fs";
import { join } from "node:path";
import { execFileSync, spawnSync } from "node:child_process";

const root = join(import.meta.dir, "..");
const quick = process.argv.includes("--quick");
const git = (...args: string[]): string => execFileSync("git", args, { cwd: root, encoding: "utf8" });

console.log("== 1/3 submodule pointers ==");
const status = git("submodule", "status").split("
").filter((entry) => entry.trim());
for (const entry of status) console.log(`  ${entry}`);
if (status.some((entry) => /^[+-]/.test(entry))) {
  console.error("FAIL: submodule pointer is stale (+) or uninitialized (-)");
  console.error("      commit updated pointer in orchestrator: git add <path> && git commit");
  process.exit(1);
}

console.log("== 2/3 tracked credential scan ==");
const leaks = git("ls-files").split("
")
  .filter((path) => /(^|\/)(\.env|.*\.pem|.*\.key|.*\.p12|id_rsa.*|.*credentials?.*)$/i.test(path));
if (leaks.length > 0) {
  console.error(`FAIL: credential-shaped file is tracked: ${leaks.join(", ")}`);
  process.exit(1);
}

console.log("== 3/3 submodule gates ==");
for (const entry of status) {
  const path = /^[ +-]?[0-9a-f]*\s+(\S+)/.exec(entry)?.[1];
  if (!path) continue;
  const gate = join(root, path, "scripts", "check.ts");
  if (!existsSync(gate)) {
    console.error(`FAIL: ${path} has no scripts/check.ts`);
    process.exit(1);
  }
  console.log(`-- ${path} --`);
  const result = spawnSync("bun", [gate, ...(quick ? ["--quick"] : [])], { stdio: "inherit" });
  if (result.status !== 0) process.exit(1);
}
console.log("workspace gate: OK");
```

---

## 3. Submodule Gate Skeleton (`bun <module>/scripts/check.ts`)

The module gate implements the standard 6-slot pipeline with autonomous manifest detection and the `--quick` exit boundary.

```ts
#!/usr/bin/env bun
// Usage: bun scripts/check.ts [--quick]
import { existsSync } from "node:fs";
import { join } from "node:path";
import { execFileSync, spawnSync } from "node:child_process";

const root = join(import.meta.dir, "..");
const quick = process.argv.includes("--quick");
const git = (...args: string[]): string => execFileSync("git", args, { cwd: root, encoding: "utf8" });

function run(command: string, args: string[], label: string): void {
  if (spawnSync(command, args, { cwd: root, stdio: "inherit" }).status !== 0) {
    console.error(`FAIL: ${label}`);
    process.exit(1);
  }
}

console.log("== 1/6 format ==");                       // formatter, once one exists
console.log("== 2/6 linter ==");                       // linter, once one exists
console.log("== 3/6 unit tests ==");
run("bun", ["test", "--timeout", "20000"], "unit tests");
console.log("== 4/6 tracked assets and package integrity ==");
run("bun", ["scripts/gates.ts"], "package gate");
run("bun", ["skills/check/scripts/funding-gate.ts", "--check", ...(quick ? [] : ["--verify-links"]), root], "funding ledger");

if (quick) {
  console.log("fast checks passed; clean-clone and smoke tests skipped (--quick)");
  process.exit(0);
}

console.log("== 5/6 clean-clone sandbox ==");
// clone the owning repository, assert tracked entry points, run the tests there
console.log("== 6/6 smoke ==");
run("bun", ["src/cli.ts", "--version"], "smoke test");
console.log("lane: OK");
```

---

## 4. Invariant Rules for Check Scripts

1. **Executable bit**: Every check script must have `chmod +x` set and tracked in Git.
2. **Safe shell options**: Always start with `#!/usr/bin/env bash` and `set -euo pipefail`.
3. **Idempotent cleanup**: Always use `trap 'rm -rf "$tmp"' EXIT` when creating temporary sandbox clones.
4. **Relativity**: Always resolve paths relative to the script location: `cd "$(dirname "$0")/.."`.
5. **Universal `--quick` parameter**: Every check script must accept `--quick` as its first argument and forward it to nested submodule invocations.
6. **Cache preservation**: In Slot 5 clean-clone sandbox, reuse local compiler cache / lockfiles where possible to avoid unbounded latency spikes.
