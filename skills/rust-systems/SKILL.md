---
name: rust-systems
description: >
  Apply 2026-SOTA Rust systems engineering: lint governance, async cancellation contracts,
  memory and FFI soundness, verification lanes, and data-parallel invariants. Use when
  authoring or reviewing Rust systems code, Cargo workspaces, Tokio async flows, unsafe
  blocks, FFI bindings, or SIMD performance hot paths. Do NOT use when the task is frontend,
  documentation, or non-Rust backend work. Guardrails loads first for cross-cutting hazards
  (nullability, lifetime elision, dependencies, Docker, HTML/auth, or secrets).
allowed-tools: Bash(*)
license: MIT
compatibility: No runtime or network requirement; references ship with the skill.
metadata:
  author: agentic
  version: "1.0.0"
positive_triggers:
  - "author or review Rust systems code, Cargo workspaces, or toolchains"
  - "review Tokio async flows, cancellation safety, or runtime topology"
  - "audit unsafe Rust, raw pointer provenance, Tree Borrows, or FFI boundaries"
  - "optimize data-parallel hot paths, SIMD intrinsics, or false sharing"
anti_triggers:
  - "frontend, UI, styling, or CSS work"
  - "documentation, README, or non-Rust copy"
  - "backend or API tasks with no Rust surface"
---

# Rust Systems Engineering

A syllabus for high-assurance Rust systems engineering. Read the syllabus, then open only the reference a module points to.

## 1. Activation Boundary & Scope

**Triggers on:** authoring or reviewing Rust systems code, Cargo workspace topologies, Tokio async flows, cancellation hazards, unsafe blocks, raw pointer provenance, Tree Borrows, FFI boundaries, sanitizers, Miri runs, SIMD intrinsics, cacheline alignment, and high-throughput performance paths.

**Does not trigger on:** frontend, UI, styling, CSS, documentation, non-Rust backend, or general non-Rust code.

**Guardrails Boundary:** `guardrails` loads first for cross-cutting hazards (nullability, lifetime elision, dependencies, Docker, HTML/auth, or secrets); this skill owns systems soundness. Co-activation is expected.

**Scope:** Rust systems authoring and review guidance.
**Non-goals:** no toolchain provisioning (never suggest manual toolchain installs), no dependency upgrades, no CI workflow file generation, no new-crate scaffolding.
**Recorded Deferrals:** `no_std` bare-metal review (MMIO volatile registers, custom panic handlers, critical sections, linker scripts); `Kani` and `Creusot` formal verification harnesses; Profile-Guided Optimization (`PGO`); the `cfi` sanitizer; procedural-macro hygiene; and the unstable `Allocator` API. Profiling telemetry is narrowed to Criterion benchmarking and `perf c2c` cited as evidence only.

## 2. Mode Contracts & Verification Bounds

The skill operates in exactly one of three modes:

- **Build**: Before the first edit, emit a readiness statement naming mode and applied lint table:
  `Readiness: Build · mode=rust-systems · table=[workspace.lints] (RFC 3389, Edition 2024)`
- **Review**: Findings only; strictly non-mutating unless edits are explicitly requested. Every finding MUST use the pinned literal line format:
  `severity · file:line · rule · fix`
- **Verify**: Names the required verification lane for the surface under test. Refuses Miri-only claims when FFI, inline assembly, or `core::arch` SIMD are present.

**Bounded Verification Loop:** Build -> inspect once in a single batch -> fix that batch in one pass -> confirm with at most one further round -> stop and report remainder. Never loop indefinitely.

## 3. The Brief Wins & Brief-Proof Invariants

An explicit user brief outranks default preferences and lint levels, but SHALL NOT earn past core memory soundness (provenance, aliasing), the abort/containment contradiction, or `select!` cancellation safety.

## 4. Soundness Modules & Reference Pointers

- **Lint Governance:** Single lint truth via RFC 3389 `[workspace.lints]`. Mandatory per-member `[lints] workspace = true` opt-in. Requires `edition = "2024"`. Release profile keeps `overflow-checks = true` for value paths. `panic = "abort"` profile explicitly acknowledges forgoing containment.
  `Read references/workspace-lints.md when authoring workspace manifests, configuring lints, or adjusting profiles.`

- **Async Cancellation Contracts:** Cancel-unsafe operations (`read_exact`, `write_all`, `Mutex::lock`, `Semaphore::acquire`) banned in `tokio::select!` branches. Require dedicated single-writer tasks. Graceful shutdown via `CancellationToken`. Lexical lock scopes before `.await`. Tokio work-stealing default; thread-per-core or in-process ring requires a recorded ADR.
  `Read references/cancellation.md when reviewing async streams, select! branches, shutdown logic, or runtime topology.`

- **Memory & FFI Soundness:** Strict provenance mandatory (`addr()`, `with_addr()`; rejects `as usize`). Stacked and Tree Borrows aliasing discipline. Mandatory `#[repr(C)]` on cross-boundary structs; forbids passing fat pointers over `extern "C"`. Panicking over FFI is undefined behavior: use `extern "C-unwind"` or `catch_unwind` shims.
  `Read references/ffi-boundaries.md when inspecting unsafe blocks, raw pointers, FFI declarations, or foreign ABI shims.`

- **Verification Lanes:** Standard hardened lane: `nextest run --profile ci`, `clippy --all-targets --all-features -- -D warnings`, `cargo test --doc`, `cargo build --release`, `deny check` (bitmask `0x1/0x2/0x4/0x8`), `semver-checks`. Miri flags for strict provenance and Tree Borrows. Sanitizers (`address`, `thread`, `memory` with `-Zbuild-std`) required for asm/SIMD/FFI where Miri is blind.
  `Read references/verification.md when configuring CI, running sanitizers, executing Miri, or checking supply chain policies.`

- **Data-Parallel Invariants:** `core::simd` portable SIMD preferred. Vendor `core::arch` isolated with runtime feature detection and scalar fallbacks. Streaming stores require `_mm_sfence()`. Contended concurrent cachelines require `#[repr(align(64))]` / `CachePadded` to prevent false sharing, verified by `perf c2c` or Criterion.
  `Read references/data-parallel.md when optimizing loops, vectorizing computation, aligning struct layouts, or benchmarking hot paths.`

- **Review Checklist:** Severity ladder (error, warning, info), flag-on-sight catalog, and pinned output formatting.
  `Read references/review-checklist.md when executing Review mode or compiling final audit reports.`

## 5. Anti-Examples

- **Lint Governance:**
  `Do NOT:` declare per-crate `#![deny(...)]` or member overrides.
  `Do:` declare centrally in `[workspace.lints]` and opt in members with `[lints] workspace = true`.
- **Cancellation:**
  `Do NOT:` await `read_exact`, `write_all`, or sync `Mutex::lock` inside a `tokio::select!` branch.
  `Do:` isolate in a spawned worker task or use cancel-safe `read` and queues.
- **Memory Soundness:**
  `Do NOT:` cast pointers through `ptr as usize as *mut T`.
  `Do:` preserve provenance using `ptr.addr()` and `ptr.with_addr(...)`.
- **FFI Containment:**
  `Do NOT:` wrap foreign callbacks in `catch_unwind` when compiled with `panic = "abort"`.
  `Do:` configure `panic = "unwind"` per profile or remove the ineffective shim.
- **Verification:**
  `Do NOT:` claim Miri verification proves safety when code invokes `asm!`, hardware SIMD, or FFI.
  `Do:` mandate native compiler sanitizers (`-Zsanitizer=address,thread`) for those surfaces.
