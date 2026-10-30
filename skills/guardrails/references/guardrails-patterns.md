# Guardrails Patterns — Level 2

On-demand detail for each cross-cutting guardrail in `SKILL.md`. Keep `SKILL.md` Level 1 inline; consult this reference when a task requires deeper language-specific remediation patterns.

## 1. HTML, DOM & Hypermedia Sink Safety

- **Before (wrong):** Interpolating unescaped user strings into raw HTML sinks (`innerHTML`, `dangerouslySetInnerHTML`, `{@html}`, raw string views), leaving a WebGL/WASM `<canvas>` parent unprotected during DOM morphs, or relying on unknown inline `on*` attributes that compilers strip silently.
- **After (right):**
  - **Hypermedia (Rust Maud + Datastar / HTMX):** Render untrusted values via auto-escaped expressions `(user_input)`, bind events with explicit attributes (`data-on-click`), and isolate stateful `<canvas>` containers with `data-ignore` so `PatchElements` morphs never destroy the active WebGL2/WebGPU context.
  - **Component Frameworks (Svelte / React / Vue):** Use explicit framework bindings (`on:click` / `onclick` / `onClick`) and sanitize any rich HTML with an allowlist parser before rendering.
- **Signal:** XSS payload execution, dropped WebGL context on SSE DOM patch, or silent loss of click interactivity after build.
- **Why:** Zero Trust input handling and strict separation between declarative DOM morphing and stateful rendering canvases.

## 2. Secret & Credential Hygiene

- **Before (wrong):** Committing `.env`, `.env.*`, `*.pem`, `*.key`, or hardcoded API tokens to Git history, or echoing secret environment variables in CI/CD and deployment scripts.
- **After (right):** Enforce a strict `.gitignore` deny-list (`.env`, `.env.*`, `*.pem`, `*.key`, `*.p12`, `id_rsa*`, `credentials`, plus build outputs `node_modules/`, `target/`, `dist/`) at the workspace root and every submodule; inject secrets at runtime via environment managers and redact sensitive keys unconditionally in structured logs.
- **Signal:** `git ls-files` or `scripts/check.ts` Slot 2 flags a tracked or untracked credential-shaped file, or log output contains raw `Bearer` / API key strings.
- **Why:** `AGENTS.md` Inviolable Prohibition (`Coding Agent never commits credentials or .env files`) and unconditional telemetry redaction.

## 3. Container & Dependency Hardening

- **Before (wrong):** Single-stage Dockerfiles shipping compilers, package managers, unpinned dependencies, or root execution (`USER root`) into production containers.
- **After (right):**
  - **Compiled Targets (Rust / Go / C++):** Build with locked manifests (`cargo build --release --locked` or `go build`) in a builder stage and copy only the static/linked binary into `gcr.io/distroless/static-debian13:nonroot` or `gcr.io/distroless/cc-debian13:nonroot`.
  - **Managed Runtimes (TypeScript/Bun / Python / JVM):** Pin lockfiles (`bun.lock`, `uv.lock`), prune dev dependencies in a build stage, and run under an explicit non-root `USER` in a minimal slim image.
- **Signal:** Container scanner flags OS package CVEs, missing lockfile causes non-reproducible builds, or runtime process executes with UID `0`.
- **Why:** Least-privilege runtime execution and hermetic supply-chain reproducibility.

## 4. Explicit Absence & Boundary Parsing (`Option` vs. `null`)

- **Before (wrong):** Checking `if (user != null)` in Rust, using unvalidated `any` / raw `JSON.parse` payloads in TypeScript, or dereferencing pointers/maps without checking presence in Go/Python.
- **After (right):**
  - **Rust:** Encode absence with `Option<T>` and fallible operations with `Result<T, E>`; narrow via `if let Some(u) = user`, pattern matching, or `?`.
  - **TypeScript:** Enable `strictNullChecks`, parse external JSON through schema validators at the I/O boundary, and narrow `T | null | undefined` before access.
  - **Go / Python:** Check `if err != nil` and comma-ok idiom (`val, ok := m[k]`) in Go; narrow `T | None` under strict type checking (`mypy` / `pyright`) in Python.
- **Signal:** Compiler error (`expected Option<T>, found T`), runtime `TypeError: Cannot read properties of undefined`, or nil-pointer panic.
- **Why:** Fault Early And Resist (`FEAR`) — boundary parsers and type-level absence eliminate runtime null-dereference defects at compile time.

## 5. Lifetimes, Ownership & Resource Determinism

- **Before (wrong):** Eliding output lifetimes when a Rust function returns a reference borrowed from multiple inputs, holding a `MutexGuard` across an `.await` point, or opening file/socket/listener handles without deterministic cleanup.
- **After (right):**
  - **Rust:** Declare explicit lifetime parameters (`fn longest<'a>(x: &'a str, y: &'a str) -> &'a str`), scope lock guards inside synchronous blocks before `.await`, and rely on `Drop` / `CancellationToken` for task cleanup.
  - **Go / TypeScript / Python:** Pair resource acquisition immediately with `defer file.Close()`, `using` / `try-finally`, or `with` context managers, and propagate `context.Context` / `AbortSignal` across async operations.
- **Signal:** `rustc` `error[E0106]: missing lifetime specifier`, `Future is not Send` across `.await`, or file descriptor / connection pool exhaustion under load.
- **Why:** Deterministic memory and resource lifecycles prevent dangling pointers, async deadlocks, and descriptor leaks.

## When to Use This File

- Task touches `deps/Docker/HTML/auth/secrets` or language soundness boundaries and `SKILL.md` Level 1 summary requires deeper multi-language implementation detail.
- Never load at startup — load `SKILL.md` first and open this file on demand.
