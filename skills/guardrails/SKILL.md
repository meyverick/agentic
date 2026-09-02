---
name: guardrails
description: >
  Cross-cutting hardening for security, deprecated APIs, and system gotchas. Use when writing or modifying code that touches dependencies, Docker, HTML/auth, or secrets. Use when reviewing code for security pitfalls. Do NOT use when only reading or exploring without code changes.
allowed-tools: Bash(*)
license: MIT
compatibility: Requires bun >= 1.0.
metadata:
  author: agentic
  version: "1.0"
positive_triggers:
  - "check for security pitfalls before committing code"
  - "prevent deprecated API usage in this change"
  - "review system gotchas for Docker and HTML handling"
  - "harden code touching dependencies or auth"
anti_triggers:
  - "only reading code without modifying it"
  - "exploring the codebase without code changes"
---

# Guardrails

Cross-cutting hardening that loads first — before domain skills — to prevent the 5 mistakes that recur across reports: `on*` stripping, secret leaks, deprecated adapter, `null` vs `Option`, lifetime elision. Tiny Level 1 inline; Level 2 behind `references/guardrails-patterns.md`.

## Activation Boundary

**Triggers on:**
- Writing/modifying code that touches `deps` (package.json, Cargo.toml), `Docker` (Dockerfile, compose), `HTML` (Svelte, templ), `auth` (tokens, cookies, sessions), or secrets
- Reviewing a change for security or deprecated usage
- Handling `on*` event handlers, `innerHTML`, or secret-like strings

**Does NOT trigger on:**
- Only reading or exploring without mutations (use explore mode)
- Pure planning (proposal/design/tasks) before code
- Skills that explicitly state `Do NOT use guardrails` (none today)

## When to Use

Load this skill **first** before any domain skill when the task touches the 4 high-risk surfaces above. Check the 5 anti-examples below, then proceed to domain logic. If no high-risk surface, skip guardrails — save tokens.

## Contrast

| Before (old) | After (new) | Why different |
|--------------|-------------|---------------|
| `on*` handlers stripped silently | Preserve `on:click` explicitly or sanitize intentionally | Svelte 5 strips unknown `on*` — must be explicit, not accidental |
| `if (user != null)` | `if let Some(user) = user` | Rust absence is type-level `Option`, not runtime `null` |
| `svelte-adapter-bun` | `@sveltejs/adapter-static` + `tower-http` | 3.0.0 canonical: Axum serves static, not Bun adapter |
| `Embedded SQLite per container` | `Central PostgreSQL via SQLx` | Single owner `crates/api/migrations/` — no `../` traversal |
| `cargo build` in handler | `queue + worker + WSS` | Heavy CPU never blocks request path — coordinator delegates |

## Anti-examples

**1. Do NOT: Strip `on*` silently**
```svelte
<!-- before (wrong) — Svelte strips on* without warning -->
<div oncustom={handler}>click</div>
```
```svelte
<!-- after (right) — explicit Svelte 5 handling -->
<div on:click={handler}>click</div>
```
Why: Svelte 5 sanitizes `on*` — undetected loss of interactivity.

**2. Do NOT: Commit secrets**
```bash
# before (wrong)
git commit -m "add .env with WARERA_KEY=abc"
```
```bash
# after (right) — .env is gitignored, secrets via envx
echo ".env" >> .gitignore && envx set WARERA_KEY
```
Why: `NEVER commit credentials/.env` — `AGENTS.md` Must-follow, leaked secrets rotate.

**3. Do NOT: Use deprecated adapter**
```js
// before (wrong)
import adapter from 'svelte-adapter-bun';
```
```js
// after (right)
import adapter from '@sveltejs/adapter-static';
export default { kit: { adapter: adapter({ fallback: 'index.html' }) } };
```
Why: 3.0.0 stack inversion — Axum `tower-http` serves static, single distroless binary.

**4. Do NOT: Check null in Rust**
```rust
// before (wrong)
if user != null { /* ... */ }
```
```rust
// after (right)
if let Some(u) = user { /* use u */ }
```
Why: Rust has no `null`; absence is `Option<T>` — compiler forces handling.

**5. Do NOT: Elide lifetimes unsafely**
```rust
// before (wrong)
fn longest(x: &str, y: &str) -> &str { x }
```
```rust
// after (right)
fn longest<'a>(x: &'a str, y: &'a str) -> &'a str { if x.len() > y.len() { x } else { y } }
```
Why: Borrow checker requires explicit `'a` when output borrows input.

## References

- `references/guardrails-patterns.md` — Level 2 detail for each anti-example (code before/after, signal, Why) — on-demand, not startup cost
- `project/AGENTS.md` Must-read pointer — this skill is first-loaded via `Must-read: project/skills/guardrails/SKILL.md before any code touching deps/Docker/HTML/auth`

## Gotchas

- Loads first, but only when high-risk surface present — `only reading` anti-triggers prevent bloat on explore tasks
- Never duplicate domain anti-examples — domain skills link here via `See ../../guardrails/SKILL.md — cross-cutting anti-examples`
- Single source for cross-cutting: this skill, not `AGENTS.md` body (AGENTS.md only holds the pointer)
