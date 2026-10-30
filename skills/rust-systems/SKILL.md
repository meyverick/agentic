---
name: rust-systems
description: >
  Apply 2026-SOTA Rust systems and idiomatic engineering: lint and format governance,
  Google Rust Style Guide API design and code organization, async cancellation contracts,
  memory and FFI soundness, verification lanes, and stable-first data-parallel invariants.
  Use when authoring, refactoring, or reviewing Rust systems or application code, Cargo
  workspaces, public library APIs, Tokio async flows, unsafe blocks, FFI bindings, or
  SIMD hot paths. Do NOT use when the task is frontend UI, CSS, or non-Rust backend work.
  Guardrails loads first for cross-cutting hazards (nullability, lifetime elision,
  dependencies, Docker, HTML/auth, or secrets).
allowed-tools: Bash(*)
license: MIT
compatibility: No runtime or network requirement; references ship with the skill.
metadata:
  author: agentic
  version: "2.0.0"
---

# Rust Systems & Idiomatic Engineering

A unified syllabus for high-assurance Rust systems engineering and Google-grade idiomatic design. Read this syllabus first, then open only the reference file required by your active surface.

## 1. Activation Boundary & Scope

**Triggers on:** authoring, refactoring, or reviewing Rust systems and application code, Cargo workspace topologies, library vs. application API design, module/import layout, trait and newtype modeling, Tokio async flows, cancellation hazards, mutex poison handling, unsafe blocks, raw pointer provenance, Tree Borrows, FFI boundaries, sanitizers, Miri runs, SIMD vectorization, cacheline alignment, and high-throughput performance paths.

**Does not trigger on:** frontend UI, styling, CSS, pure prose documentation, or non-Rust backend code.

**Guardrails Boundary:** `guardrails` loads first for cross-cutting hazards (nullability, lifetime elision, dependencies, Docker, HTML/auth, or secrets); this skill owns Rust systems soundness and idiomatic architecture. Co-activation is expected.

**Scope:** Rust systems and idiomatic authoring, refactoring, and review guidance.
**Non-goals:** no toolchain provisioning (never suggest manual toolchain installs), no unrequested dependency upgrades, no CI workflow file generation, no new-crate scaffolding unless requested.
**Recorded Deferrals:** `no_std` bare-metal review (MMIO volatile registers, custom panic handlers, critical sections, linker scripts); `Kani` and `Creusot` formal verification harnesses; Profile-Guided Optimization (`PGO`); the `cfi` sanitizer; procedural-macro AST implementation internals; and the unstable `Allocator` API. Profiling telemetry is narrowed to Criterion benchmarking and `perf c2c` cited as evidence only.

## 2. Mode Contracts & Verification Bounds

The skill operates in exactly one of three modes:

- **Build**: Before the first edit, emit a readiness statement naming the mode, context tier (`library` or `application`), and applied lint table:
  `Readiness: Build · mode=rust-systems · context=[library|application] · table=[workspace.lints] (RFC 3389, Edition 2024)`
- **Review**: Findings only; strictly non-mutating unless edits are explicitly requested. Every finding MUST use the pinned literal line format:
  `severity · file:line · rule · fix`
- **Verify**: Names the required verification lane for the surface under test. Refuses Miri-only claims when FFI, inline assembly, or `core::arch` SIMD are present.

**Bounded Verification Loop:** Build -> inspect once in a single batch -> fix that batch in one pass -> confirm with at most one further round -> stop and report remainder. Never loop indefinitely.

## 3. The Brief Wins & Brief-Proof Invariants

An explicit user brief outranks default style preferences, lint levels, and target profiles (such as activating `[chrome]`, `[Fuchsia]`, or nightly `portable_simd`), but SHALL NOT earn past core memory soundness (strict provenance, aliasing), the abort/containment contradiction, mutex poison soundness, pre-`main()` code execution hazards, or `select!` cancellation safety.

## 4. Soundness & Style Modules

- **API Design, Idioms & Code Organization:** Distinguishes **Library** (binding API flexibility rules) vs. **Application** (simplicity and directness) contexts. Enforces leaf-module API placement, single-module `use` granularity, no glob imports, qualified free functions, unqualified types, unique ownership over `Rc`/`Arc`, flexible borrows (`&[T]`, `&str`), closure accessors (`with_foo`), `enum` over `bool`, newtypes, `~Ext` traits, macro hierarchy, `expect` over `unwrap`, and optional Chromium/Fuchsia/Android profiles.
  `Read references/api-and-style.md when designing APIs, organizing modules/imports, modeling traits/types, writing macros/docs, or applying Chromium/Fuchsia/Android target rules.`

- **Lint & Format Governance:** Single lint truth via RFC 3389 `[workspace.lints]` with mandatory member `[lints] workspace = true` opt-in and `edition = "2024"`. Enforces Google-aligned compiler/Clippy lints (`unsafe_op_in_unsafe_fn`, `non_exhaustive_omitted_patterns`, `borrowed_box`, `should_implement_trait`, `new_without_default`, `len_without_is_empty`) and `rustfmt` rules (`max_width = 100`, `imports_granularity = "Module"`). Release profile keeps `overflow-checks = true` for value paths.
  `Read references/workspace-lints.md when authoring workspace manifests, configuring lints, setting rustfmt rules, or adjusting profiles.`

- **Async Cancellation & Concurrency Contracts:** Cancel-unsafe operations (`read_exact`, `write_all`, `Mutex::lock`, `Semaphore::acquire`) banned in `tokio::select!` branches. Forbids recovering poisoned mutexes (`into_inner()`). Lexical lock scopes or `with_foo()` closure accessors before `.await`. Graceful shutdown via `CancellationToken`. Tokio work-stealing default; thread-per-core or platform-specific executors require an ADR or platform profile.
  `Read references/cancellation.md when reviewing async streams, select! branches, mutex locking, shutdown logic, or runtime topology.`

- **Memory, Unsafe & FFI Soundness:** Unsafe code requires (1) safe abstraction isolation, (2) a `// SAFETY:` comment, and (3) a **technical justification** (including benchmarks if performance-motivated). Strict provenance mandatory (`addr()`, `with_addr()`; rejects `as usize`). Forbids running code before `main()` (`ctor`). Mandatory `#[repr(C)]` on cross-boundary structs; forbids fat pointers over `extern "C"`. Prohibits `panic::catch_unwind` in first-party logic except as un-relied-upon defense-in-depth under `panic = "unwind"`.
  `Read references/ffi-boundaries.md when inspecting unsafe blocks, raw pointers, FFI declarations, or foreign ABI shims.`

- **Verification Lanes:** Hardened lane: `fmt --check`, `clippy --all-targets --all-features -- -D warnings`, `nextest run --profile ci`, `cargo test --doc`, `cargo build --release`, `deny check` (bitmask `0x1/0x2/0x4/0x8`), `semver-checks`. Miri flags for strict provenance and Tree Borrows. Native sanitizers (`address`, `thread`, `memory` with `-Zbuild-std`) mandatory for asm/SIMD/FFI where Miri is blind.
  `Read references/verification.md when configuring CI, running sanitizers, executing Miri, writing contextual assertions, or checking supply chain policies.`

- **Data-Parallel Invariants:** Stable-first policy (no unstable features by default). Prefer slice auto-vectorization (`chunks_exact`) and isolated `core::arch` intrinsics with runtime feature detection and mandatory scalar fallbacks. Portable SIMD (`core::simd`) requires explicit nightly authorization. Streaming stores require `_mm_sfence()`. Contended concurrent cachelines require `#[repr(align(64))]` / `CachePadded`, verified by `perf c2c` or Criterion.
  `Read references/data-parallel.md when optimizing loops, vectorizing computation, aligning struct layouts, or benchmarking hot paths.`

- **Review Checklist:** Severity ladder (`error`, `warning`, `info`), expanded flag-on-sight catalog covering both systems soundness and Google Rust Style Guide rules, and pinned output formatting.
  `Read references/review-checklist.md when executing Review mode or compiling final audit reports.`

## 5. Anti-Examples

- **Lint & Format Governance:**
  `Do NOT:` declare per-crate `#![deny(...)]`, use `#[rustfmt::skip]` for personal taste, or nest paths in `use foo::{Bar, baz::Qux};`.
  `Do:` declare centrally in `[workspace.lints]`, opt in with `[lints] workspace = true`, and enforce one module per `use` statement.
- **API & Idiomatic Style:**
  `Do NOT:` accept `&Vec<T>`, `&String`, or `&Box<T>`, use check-then-unwrap (`if x.is_some() { x.unwrap() }`), or reach into a poisoned mutex.
  `Do:` accept `&[T]`, `&str`, or `&T`, use `if let Some(v) = x` or `.expect("invariant")`, and propagate or panic on poisoned locks.
- **Cancellation:**
  `Do NOT:` await `read_exact`, `write_all`, or `Mutex::lock` inside a `tokio::select!` branch.
  `Do:` isolate in a spawned worker task or use cancel-safe `read` and single-writer queues.
- **Unsafe & Memory Soundness:**
  `Do NOT:` write `unsafe` without both a `// SAFETY:` comment and a technical/benchmark justification, cast via `ptr as usize as *mut T`, or execute code before `main()` via `ctor`.
  `Do:` isolate `unsafe` in minimal safe abstractions, use `ptr.addr()` / `ptr.with_addr(...)`, and initialize state explicitly from `main()`.
- **FFI & Unwinding:**
  `Do NOT:` rely on `panic::catch_unwind` for normal control flow or pair it with `panic = "abort"`.
  `Do:` use `Result`/`Option` for recoverable failures and reserve `catch_unwind` strictly for un-relied-upon FFI/entry-point defense-in-depth under `panic = "unwind"`.
- **Verification & SIMD:**
  `Do NOT:` enable unstable `#![feature(portable_simd)]` on stable targets or claim Miri proves safety across `asm!`, SIMD, or FFI.
  `Do:` use stable `chunks_exact` and runtime-detected `core::arch` with scalar fallbacks, and run native compiler sanitizers (`-Zsanitizer=address,thread`).