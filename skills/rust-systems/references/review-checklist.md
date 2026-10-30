---
type: Reference
title: Systems & Style Review Checklist, Severity Ladder & Audit Contracts
generated: { by: agentic/2.0, at: 2026-10-22T10:35:00Z }
status: stable
sources:
  - id: google-rust-styleguide
    resource: https://google.github.io/styleguide/rustguide.html
  - id: rust-bad-practices
    resource: references/rust-bad-practices-research.md
  - id: rust-language-best-practices
    resource: references/rust-researches/rust-language-best-practices-research.md
---

# Systems & Style Review Checklist & Audit Contracts

Audit procedures, severity ladder, and flag-on-sight rules for Rust systems and idiomatic code.

## 1. Operating Modes & Review Contract

1. **Build Mode:**
   - Pre-edit commitment: emit readiness statement naming context (`library` or `application`) and applied lint table:
     `Readiness: Build · mode=rust-systems · context=[library|application] · table=[workspace.lints] (RFC 3389, Edition 2024)`
   - Respects declarative workspace lint governance and Google Rust Style Guide conventions.

2. **Review Mode:**
   - Non-mutating: emit findings only. Never modify the target codebase unless the user explicitly requests fixes.
   - Pinned Finding Line Format: Every review finding MUST be formatted on a single line matching:
     `severity · file:line · rule · fix`
   - Examples:
     `error · src/net/session.rs:88 · cancellation-safety · replace read_exact with read loop or isolate in worker task`
     `error · src/ffi/bridge.rs:42 · unsafe-justification · add SAFETY comment and benchmark/technical justification for unsafe block`
     `warning · src/config.rs:19 · flexible-borrows · accept &[String] or &str instead of &Vec<String> and &String`

3. **Verify Mode:**
   - Inspect surface and prescribe the exact verification lane.
   - Refuse Miri-only claims when FFI, SIMD, or assembly are present.

## 2. Severity Ladder

- **`error`**: Undefined behavior, memory corruption, data race, cancel-safety data loss, ABI violation, strict provenance loss, uncontained panic across FFI, `unsafe` block missing `// SAFETY:` or technical justification, pre-`main()` code execution (`ctor`), bypassing a poisoned mutex (`into_inner`), unapproved unstable `#![feature]`, `catch_unwind` in first-party logic or under `panic = "abort"`, or CI gate failure.
- **`warning`**: Suboptimal concurrency topology, lock contention, check-then-unwrap (`if x.is_some() { x.unwrap() }`), bare `.unwrap()` without `.expect("reason")`, inflexible reference parameters (`&Vec<T>`, `&String`, `&Box<T>`), glob imports (`use ...::*`), API implementations in non-leaf modules, unmotivated `Rc`/`Arc` or `.clone()`, missing `#[non_exhaustive]` or `#[must_use]` on cross-team library types, missing `chunks_exact` in hot vectorization loops, missing cacheline padding on contended atomics, or per-crate lint overrides.
- **`info`**: Naming refinements (`try_new`, `with_foo` closure accessors, `~Ext` suffix), local trait import scoping, module-qualified free function calls, explicit type annotations on generic chains, contextual assertion strings, or doc comment enhancements.

## 3. Flag-on-Sight Catalog

Flag the following anti-patterns immediately during review:

### A. Systems Soundness & Concurrency
1. **Missing Member Opt-In or Local Deny:** Member crate lacking `[lints] workspace = true` or using `#![deny(...)]`.
2. **Cancel-Unsafe Await in `select!`:** `read_exact`, `write_all`, `Mutex::lock`, or `Semaphore::acquire` inside a `tokio::select!` branch.
3. **Lock Across Await:** Sync `MutexGuard` or `RefCell` borrow held across an `.await`.
4. **Poisoned Mutex Bypass:** Calling `PoisonError::into_inner` or recovering inner data from a poisoned lock.
5. **Unjustified `unsafe` Block:** Any `unsafe` block lacking either a `// SAFETY:` invariant proof or a technical/benchmark justification for why safe Rust was not used.
6. **Pre-`main()` Execution:** Using `ctor` or linker initializers to run Rust code before `main()`.
7. **Provenance Loss:** Raw pointer integer cast via `ptr as usize as *mut T` instead of `ptr.addr()` / `ptr.with_addr()`.
8. **Misused `catch_unwind` / Abort Contradiction:** Using `panic::catch_unwind` for normal control flow, or declaring `catch_unwind` shims in a crate built with `panic = "abort"`.
9. **Unapproved Unstable Features:** Using `#![feature(...)]` (including `portable_simd`) on a stable target without explicit brief authorization.
10. **Unfenced Streaming Stores:** `_mm256_stream_ps` or non-temporal writes without `_mm_sfence()`.
11. **Unparsed Deny Failure:** `cargo deny` failures treated as opaque errors without decoding the `0x1/0x2/0x4/0x8` bitmask.
12. **Miri-Only Claim on Foreign Code:** Declaring code sound based solely on Miri when it executes `asm!`, `core::arch` SIMD, or foreign C calls.

### B. Google Rust Style Guide & Idiomatic Design
13. **Check-Then-Unwrap & Bare Unwrap:** Writing `if opt.is_some() { opt.unwrap() }` instead of `if let Some(v) = opt`, or using bare `.unwrap()` where `.expect("invariant")` is required.
14. **Inflexible Borrow Parameters:** Accepting `&Vec<T>`, `&String`, `&Box<T>`, or `&Option<T>` instead of `&[T]`, `&str`, `&T`, or `Option<&T>`.
15. **Glob Imports & Nested `use` Braces:** Using `use foo::*` (outside permitted test/enum/re-export exceptions), defining custom `prelude` modules, or nesting `::` inside `use foo::{Bar, baz::Qux}`.
16. **Non-Leaf Module Implementations:** Writing substantive struct/function implementations in `lib.rs` or parent modules instead of leaf modules.
17. **Accessing Foreign `#[doc(hidden)]`:** Importing or calling items marked `#[doc(hidden)]` from external crates.
18. **Omitted Patterns on `#[non_exhaustive]` Match:** Matching a `#[non_exhaustive]` enum with a bare `_ => {}` instead of explicitly listing known ignored variants (`VariantC | _ => {}`).
19. **Complex Combinators in `for` Headers:** Constructing multi-step iterator chains inline inside `for item in ...` headers or using stateful `.for_each()`.
20. **Personal `#[rustfmt::skip]`:** Skipping `rustfmt` for personal formatting preferences rather than matrix/tabular alignment or generated code.

## 4. Guardrails Boundary

`guardrails` owns cross-cutting hazards (nullability, lifetime elision, dependency vetting, Docker containers, HTML/auth, and secret leakage). `rust-systems` owns Rust systems soundness and Google Rust Style Guide engineering (lint/format governance, API design, code organization, async cancellation, lock poison discipline, strict provenance, FFI ABIs, stable-first SIMD invariants, and verification lanes). When both activate, `guardrails` loads first.