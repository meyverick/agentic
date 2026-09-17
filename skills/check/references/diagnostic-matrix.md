# Failure Diagnostic Matrix & Autonomous Self-Healing

This reference handbook details the 7 canonical failure classes detected by local check-gates, their root causes, and the exact step-by-step autonomous self-healing actions an AI agent must take to resolve them.

---

## Class 1: Submodule Pointer Stale (`+`)

### Symptoms
`git submodule status` prints a leading `+`:
```
+a1b2c3d4e5f6 crates/api (heads/main)
FAIL: submodule pointer is stale (+) or uninitialized (-)
```

### Root Cause
A commit was created inside the submodule (`crates/api`), advancing its HEAD beyond the `gitlink` SHA recorded in the workspace orchestrator. If pushed in this state, CI or deploy servers will check out the old commit.

### Autonomous Remediation
Run from the workspace root:
```bash
git add crates/api
git commit -m "chore: bump crates/api submodule pointer"
```

---

## Class 2: Submodule Pointer Uninitialized (`-`)

### Symptoms
`git submodule status` prints a leading `-`:
```
-a1b2c3d4e5f6 crates/worker (heads/main)
FAIL: submodule pointer is stale (+) or uninitialized (-)
```

### Root Cause
The submodule exists in `.gitmodules`, but the local repository clone has not initialized its working directory.

### Autonomous Remediation
Run from the workspace root:
```bash
git submodule update --init --recursive crates/worker
```

---

## Class 3: Tracked Credential or Secret Leak

### Symptoms
The credential scanner detects sensitive file patterns:
```
== 2/3 tracked credential scan ==
  X tracked: .env.local
  X tracked: certs/server.key
FAIL: credential-shaped file is tracked by git
```

### Root Cause
A developer or agent ran `git add .` or staged an environment file, private key, or credential bundle. Once pushed, the secret is compromised regardless of whether CI fails.

### Autonomous Remediation
1. Unstage and remove from Git tracking without deleting local file:
   ```bash
   git rm --cached .env.local certs/server.key
   ```
2. Verify `.gitignore` ignores the pattern:
   ```bash
   echo ".env*" >> .gitignore
   echo "*.key" >> .gitignore
   git add .gitignore && git commit -m "chore: ignore local credentials and keys"
   ```

---

## Class 4: Untracked Compile-Time Build Input

### Symptoms
Step 4 static scanner fails:
```
== 4/6 compile-time inputs are tracked ==
  X src/main.rs needs 'src/assets/schema.json' but git does not track it
FAIL: untracked compile-time build input (clone would fail)
```

### Root Cause
Rust's `include_str!` / `include_bytes!` or Go's `//go:embed` references a file on disk that is not committed in Git. The current developer's machine builds fine because the local file exists, but any fresh clone or CI runner will immediately fail with `No such file or directory`.

### Autonomous Remediation
Stage the missing file:
```bash
git add src/assets/schema.json
```

---

## Class 5: Clean-Clone Sandbox Divergence

### Symptoms
The code builds cleanly in the current directory, but step 5 fails:
```
== 5/6 clean-clone sandbox ==
error[E0583]: file not found for module `types`
  --> src/lib.rs:4:1
   |
 4 | mod types;
   | ^^^^^^^^^^
```

### Root Cause
The build in the working tree succeeds only because uncommitted local files exist. When `git clone -q . "$tmp/clone"` creates a pure clone of committed state, the uncommitted files are absent. Another common cause is a default-deny `/*` `.gitignore` silently ignoring a required directory.

### Autonomous Remediation
1. Check untracked files:
   ```bash
   git status --short
   ```
2. Check if a required file is being ignored:
   ```bash
   git check-ignore -v src/types.rs
   ```
3. If blocked by `.gitignore`, add an allowlist exception:
   ```bash
   !src/types.rs
   ```
4. Stage the required file:
   ```bash
   git add src/types.rs
   ```

---

## Class 6: Cross-Boundary Asset Contract Breach

### Symptoms
Static asset or script contract checks fail:
```
== 4/7 static asset checks ==
checks/no_undef.mjs:
  X static/js/widget.js:42 - undefined identifier `handleIncomingPayload`
```

### Root Cause
A compiled backend (Rust, Go) embeds or serves frontend JavaScript/HTML. The backend compiles successfully because it treats assets as opaque strings/bytes, but the embedded asset contains a runtime JavaScript bug or broken contract.

### Autonomous Remediation
Open the client script (`static/js/widget.js`) and define the missing identifier, fix the function signature, or fix the markup handle.

---

## Class 7: Native Quality Regressions

### Symptoms
Step 1, 2, or 3 fails:
- `cargo fmt --check` / `bun run format:check`
- `cargo clippy -- -D warnings` / `eslint`
- `cargo test` / `bun test`

### Root Cause
Code formatting divergence, strict linter warning, or a broken unit/integration test assertion.

### Autonomous Remediation
1. For formatting: run the language formatter:
   ```bash
   cargo fmt
   # or: bun run format
   # or: gofmt -w .
   ```
2. For linter / compiler: read the compiler diagnostics, apply surgical code fix, and re-run.
3. For failing tests: inspect the test assertion failure, resolve the bug, and re-run.
