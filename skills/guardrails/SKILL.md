---
name: guardrails
description: >
  Cross-cutting hardening for security, container/dependency hygiene, HTML/DOM sinks, and language soundness gotchas across any project or language. Use when writing or modifying code that touches dependencies, Docker/containers, HTML/templates/DOM, auth, secrets, nullability, or lifetimes/resources. Use when reviewing code for security pitfalls. Do NOT use when only reading or exploring without code changes.
allowed-tools: Bash(*)
license: MIT
compatibility: No runtime or network requirement; references ship with the skill.
metadata:
  author: agentic
  version: "2.0.0"
---

# Guardrails

Cross-cutting hardening that loads first — before domain skills — to prevent the 5 universal failure classes across any stack: HTML/DOM sink hazards & canvas morph collisions, secret leaks, container/dependency bloat, unchecked `null` vs. explicit absence (`Option`), and lifetime/resource leaks. Tiny Level 1 inline; Level 2 behind `references/guardrails-patterns.md`.

## Activation Boundary

**Triggers on:**
- Writing/modifying code that touches `deps` (`Cargo.toml`, `package.json`, `go.mod`, `pyproject.toml`), `Docker` (`Dockerfile`, `compose`), `HTML/DOM` (hypermedia templates, Maud/Datastar, JSX/Svelte), `auth` (tokens, cookies, sessions), or `secrets`
- Reviewing a change for security, nullability, lifetime/resource safety, or container hardening
- Handling untrusted HTML sinks (`innerHTML`, unescaped templates), `<canvas>` morph protection, or secret-like strings

**Does NOT trigger on:**
- Only reading or exploring without mutations (use explore mode)
- Pure planning (proposal/design/tasks) before code
- Skills that explicitly state `Do NOT use guardrails` (none today)

## When to Use

Load this skill **first** before any domain skill when the task touches the high-risk surfaces above. Check the 5 universal guardrails below, then proceed to domain logic. If no high-risk surface is touched, skip guardrails to save tokens.

## Contrast

| Surface | Before (Anti-Pattern) | After (Universal Guardrail) | Why & Ecosystem Specificities |
| :--- | :--- | :--- | :--- |
| **1. HTML, DOM & Canvas Sinks** | Unescaped HTML injection, unguarded `<canvas>` morphs, or implicit `on*` string handlers | Auto-escaped templates, `data-ignore` on stateful canvases, and explicit event bindings | Prevents XSS, preserves WebGL/WASM contexts during Datastar/HTMX DOM morphs, and avoids silent `on*` stripping in Svelte/JSX |
| **2. Secrets & Credentials** | Committing `.env` / keys or echoing tokens in CI/deploy logs | `.gitignore` deny-lists, runtime secret injection, and unconditional log redaction | `AGENTS.md` invariant: never commit credentials or `.env` files across any environment |
| **3. Containers & Dependencies** | Shipping build toolchains, root users, or unpinned dev adapters in production | Multi-stage builds, locked manifests, and minimal non-root runtime images (`distroless`) | Eliminates attack surface and runtime drift (`Rust/Go -> distroless:nonroot`, `TS/Python -> locked slim non-root`) |
| **4. Explicit Absence & Parsing** | Unchecked `if (x != null)` or raw `any` payload access | Parse at I/O boundaries and encode absence in types (`Option<T>`, strict null checks) | Prevents runtime null-dereference panics (`Rust: if let Some(v) = x`, `TS: strictNullChecks`, `Go/Py: explicit nil/None guard`) |
| **5. Lifetimes & Resources** | Eliding borrowed output lifetimes, holding locks across `.await`, or leaking handles | Explicit `'a` lifetime ties, lexical lock scopes, and deterministic `Drop`/`defer`/`using` | Guarantees memory soundness, prevents async deadlocks, and ensures deterministic descriptor cleanup |

## Anti-examples

**1. Do NOT: Leave HTML sinks unescaped, `<canvas>` unprotected from DOM morphs, or event handlers implicit**
```html
<!-- before (wrong) — raw HTML sink + unprotected canvas destroyed on morph + fragile inline handler -->
<div innerHTML={untrustedBio} oncustom={handler}>
  <canvas id="sim-canvas"></canvas>
</div>
```
```rust
// after (right, Rust Maud + Datastar) — auto-escaped text, explicit data-on-click, and data-ignore on canvas container
html! {
    div data-on-click="$open = !$open" {
        p { (untrusted_bio) }
        div id="canvas-stage" data-ignore {
            canvas id="sim-canvas" {}
        }
    }
}
```
Why: Auto-escaping blocks XSS; `data-ignore` (or framework key preservation) stops DOM morphing from dropping active WebGL/WebGPU contexts; explicit event syntax (`data-on-click`, `on:click`, `onClick`) prevents silent handler stripping.

**2. Do NOT: Commit secrets or echo credentials in logs**
```bash
# before (wrong)
git add .env && git commit -m "configure api keys"
```
```bash
# after (right) — deny-list secret & artifact paths in .gitignore, inject at runtime
printf '\n.env\n.env.*\n*.pem\n*.key\ncredentials\nnode_modules/\ntarget/\ndist/\nbuild/\n' >> .gitignore
```
Why: `AGENTS.md` Inviolable Prohibition — never commit `.env` or private keys, and mask tokens unconditionally in telemetry.

**3. Do NOT: Ship build toolchains or root containers to production**
```dockerfile
# before (wrong) — single-stage build running as root with full compiler/dev toolchain
FROM rust:latest
COPY . .
RUN cargo build --release
CMD ["./target/release/app"]
```
```dockerfile
# after (right) — multi-stage build into minimal non-root distroless runtime
FROM rust:1-bookworm AS build
WORKDIR /src
COPY . .
RUN cargo build --release --locked

FROM gcr.io/distroless/cc-debian13:nonroot
COPY --from=build /src/target/release/app /app
USER nonroot:nonroot
ENTRYPOINT ["/app"]
```
Why: Least-privilege execution — production images carry only the locked artifact and run as `nonroot`.

**4. Do NOT: Assume nullable references or unvalidated payloads**
```rust
// before (wrong) — C/JS mental model in Rust or unchecked nullable access
if user != null { /* ... */ }
```
```rust
// after (right) — explicit type-level absence handling
if let Some(u) = user { /* use u */ }
```
Why: Absence must be encoded and narrowed explicitly (`Option<T>` / `Result<T, E>` in Rust, `strictNullChecks` in TypeScript, `err != nil` in Go).

**5. Do NOT: Elide borrowed output lifetimes or hold locks across `.await`**
```rust
// before (wrong) — ambiguous borrowed return lifetime
fn longest(x: &str, y: &str) -> &str { if x.len() > y.len() { x } else { y } }
```
```rust
// after (right) — explicit lifetime specifier tying output borrow to inputs
fn longest<'a>(x: &'a str, y: &'a str) -> &'a str { if x.len() > y.len() { x } else { y } }
```
Why: Explicit ownership and lifetime bounds (`'a` in Rust; `defer`/`using`/`with` for I/O handles in Go/TS/Python) prevent dangling references and resource leaks.

## References

- `references/guardrails-patterns.md` — Level 2 detail for each universal guardrail across languages (code before/after, failure signal, remediation)
- `./AGENTS.md` Chapter 4 & Chapter 8 — cross-cutting security, boundary validation (`FEAR`), and unconditional redaction invariants

## Gotchas

- Loads first, but only when a high-risk surface is present — `only reading` anti-triggers prevent bloat on explore tasks
- Co-activates cleanly with language-specific skills (such as `rust-systems` or `hypermedia-engine-stacks`) without locking the workspace to a single project
- Single source for cross-cutting pre-flight checks: keep `SKILL.md` compact and read `references/guardrails-patterns.md` only when deeper pattern detail is needed
