---
name: check
description: >
  Execute and interpret local workspace and submodule check-gates to verify project integrity before push.
  Use when verifying code changes, running pre-flight gates, diagnosing check.sh failures, or confirming clean-clone buildability.
  Do NOT use when only reading or exploring code without modifications, or when planning changes before implementation.
allowed-tools: Bash(*)
license: MIT
compatibility: Requires bash and git.
metadata:
  author: agentic
  version: "1.0.0"
positive_triggers:
  - "verify workspace integrity and run check gate"
  - "execute check.sh and interpret gate failures"
  - "run pre-flight check gate before completion"
  - "diagnose clean-clone build or pointer desync failure"
anti_triggers:
  - "only reading or exploring code without modifying it"
  - "planning a change before implementation begins"
---

# Check Gate Handbook

A specialized reference manual and textbook instructing AI agents on how to execute local workspace check-gates, observe the two-speed verification protocol, interpret gate failure diagnostics, and apply autonomous self-healing recipes.

## Activation Boundary

**Consult this textbook when:**
- Executing `./scripts/check.sh` during the Pre-response self-audit (`project/AGENTS.md` §10).
- Diagnosing why a local check gate, clean-clone build, or submodule pointer verification failed.
- Confirming that all subprojects and orchestrators pass before reporting task completion.

**Do NOT consult when:**
- Only reading, searching, or exploring the codebase without making mutations.
- Authoring plans, proposals, or designs prior to implementation.

## The Two-Speed Gate Protocol

Local verification operates at two distinct speeds to balance development velocity with release hermeticity:

```
Fast Loop (--quick)                     Full Pre-Flight Gate (Default)
Speed: 3 - 10 seconds                   Speed: 20 - 45 seconds
When: Active development iteration      When: Task completion / Pre-push
Runs:                                   Runs:
  [1] Code format verification            [1] Code format verification
  [2] Strict linter execution             [2] Strict linter execution
  [3] Fast unit/integration tests         [3] Fast unit/integration tests
  [4] Static cross-boundary contracts     [4] Static cross-boundary contracts
  [5] Tracked compile-time includes       [5] Tracked compile-time includes
                                          [6] Hermetic clean-clone sandbox
                                          [7] Runtime smoke / browser test
```

### 1. The Fast Loop (`--quick`)
Pass `--quick` as the first argument when validating intermediate code edits:
```bash
./scripts/check.sh --quick
# Or for a specific submodule:
./<submodule-path>/scripts/check.sh --quick
```
This executes all native linters, compilers, and static asset checks, but skips the clean-clone build and browser smoke tests, returning actionable feedback in seconds.

### 2. The Full Pre-Flight Gate
Always execute the unflagged gate before marking any code-modifying task `[Completed]`:
```bash
./scripts/check.sh
```
This runs the full 6-slot pipeline, including cloning the committed tree into an isolated temporary directory to prove that uncommitted local files are not masking build breakages.

## Workspace vs Submodule Topology

A check-gated repository organizes gates in a 2-tier hierarchy:

1. **Workspace Root (`./scripts/check.sh`)**:
   - Checks workspace-wide invariants: submodule pointer freshness (`git submodule status`) and tracked credential leaks (`git ls-files`).
   - Loops over all registered submodules and dispatches `./$path/scripts/check.sh $QUICK`.
2. **Submodule / Subproject (`./<submodule>/scripts/check.sh`)**:
   - Executes the module's native toolchain (Rust, Bun, Go, Python).
   - Validates compile-time asset tracking and performs the clean-clone test.

## Diagnostic Matrix: The 7 Failure Classes

When `./scripts/check.sh` exits non-zero, identify the failure class and apply its self-healing recipe:

| Class | Observed Diagnostic | Root Cause | Autonomous Healing Action |
| :--- | :--- | :--- | :--- |
| **1. Pointer Stale** | `git submodule status` shows `+<sha>` | Submodule committed, but root gitlink was not updated | In workspace root: `git add <submodule> && git commit -m "chore: bump <submodule> pointer"` |
| **2. Pointer Uninitialized** | `git submodule status` shows `-<sha>` | Submodule clone is missing or uninitialized | Run `git submodule update --init --recursive <submodule>` |
| **3. Credential Leaked** | `tracked: .env` / `*.key` / `id_rsa` | Secret-shaped file added to Git index | `git rm --cached <file>`, ensure pattern is in `.gitignore`, and re-run check |
| **4. Untracked Include** | `needs '<path>' but git does not track it` | `include_str!`, `include_bytes!`, or `//go:embed` references uncommitted file | Stage the missing asset: `git add <path>` and re-run check |
| **5. Clean-Clone Failure** | Build passes locally, fails in `$tmp/clone` | Code depends on uncommitted file, or `.gitignore` default-deny blocked a test file | Run `git status`, inspect untracked files, add missing items to Git or adjust `.gitignore` allowlist |
| **6. Cross-Boundary Breach** | Syntax error in embedded JS/DOM contract | Static frontend asset contains undeclared variable or broken handler | Fix the client-side JavaScript/HTML contract in the source file |
| **7. Native Regression** | Compiler, clippy, eslint, or test failed | Code broke typecheck, linter rules, or unit test assertions | Read compiler diagnostic, fix code or formatting, and re-run |

## Autonomous Self-Healing Playbook

Do not halt or prompt the user for routine gate failures:
1. **Never bypass failures with `--no-verify`**: If the gate fails, the change is incomplete.
2. **Untracked build inputs**: Compare the error output with `git status`. If a newly created asset was forgotten, stage it immediately.
3. **Submodule pointer bumps**: Always check `git submodule status` after committing inside a submodule. If a `+` appears, commit the gitlink in the parent orchestrator before finishing.
4. **Re-verify after healing**: Always re-execute `./scripts/check.sh` after applying a fix to guarantee exit code 0.

## Reference Depth

- [Script Anatomy & 6-Slot Skeleton](references/script-anatomy.md): Detailed canonical bash patterns for orchestrators and submodules.
- [Failure Diagnostic Matrix](references/diagnostic-matrix.md): Deep-dive failure scenarios and step-by-step remediation commands.
