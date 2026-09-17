# Guardrails Patterns — Level 2

On-demand detail for each cross-cutting anti-example in `SKILL.md`. Keep SKILL.md Level 1 inline; this file is Level 2 (~700 tokens).

## 1. `on*` Stripping

- **Before (wrong):** `<div oncustom={h}>` — Svelte 5 strips unknown `on*` attributes at compile, no warning, handler never fires
- **After (right):** `<div on:click={h}>` or `<div use:action>` — explicit Svelte 5 event syntax
- **Signal:** No runtime error, silent loss of interactivity; test via `vite build` + click
- **Why:** Security sanitization in Svelte 5 — unknown `on*` is treated as potential XSS

## 2. Secret Leak

- **Before (wrong):** `git add .env && git commit` — secrets in git history forever, leaked to logs via `dokku config:set` echo
- **After (right):** `echo ".env" >> .gitignore` at repo root + each submodule; `envx set KEY`; `dokku config:set` guarded (only when var unset/changed, output suppressed)
- **Signal:** `git log --all -p | grep WARERA_KEY` or `deploy-dokku.sh` stdout contains `...KEY=...`
- **Why:** `AGENTS.md` Must-follow `NEVER commit credentials/.env` + GDPR Zero Trust — rotate leaked secrets immediately

## 3. Deprecated Adapter

- **Before (wrong):** `svelte-adapter-bun` — Bun-specific, incompatible with `gcr.io/distroless/static-debian13:nonroot` single binary
- **After (right):** `@sveltejs/adapter-static` with `fallback: 'index.html'` + Axum `tower-http` `ServeDir`/`ServeFile`; `Vite → Rust musl → distroless`
- **Signal:** `vite build` outputs `adapter-bun` warning, or Docker `CMD` fails on distroless (no Bun)
- **Why:** 3.0.0 canonical 5-tier — Axum/Tokio sole coordinator, static SPA served by `tower-http`, preserves file routing without Bun

## 4. `null` vs `Option`

- **Before (wrong, C# model):** `if (user != null) { use(user) }` — assumes `null` is valid for any reference
- **After (right, Rust model):** `if let Some(u) = user { use(u) }` or `user.map(|u| ...)` — absence encoded in type `Option<T>`
- **Signal:** `cargo clippy` or `rustc` error `expected Option<T>, found T` or `NullReferenceException` becomes compile error
- **Why:** Rust has no `null` — `Option` forces handling of `None` at compile time, prevents runtime panic

## 5. Lifetime Elision

- **Before (wrong):** `fn longest(x: &str, y: &str) -> &str` — elides lifetimes, compiler cannot infer borrowing
- **After (right):** `fn longest<'a>(x: &'a str, y: &'a str) -> &'a str` — explicit `'a` ties output lifetime to inputs
- **Signal:** `rustc` `error[E0106]: missing lifetime specifier` or `borrow checker: cannot return value referencing temporary`
- **Why:** Borrow checker tracks references — output `&str` must borrow from `x` or `y`, explicit `'a` declares that

## When to Use This File

- Task touches `deps/Docker/HTML/auth` and `SKILL.md` Level 1 table was insufficient — read this file on-demand
- Never load at startup — `AGENTS.md` pointer loads `SKILL.md` first; this file is Tier 3
