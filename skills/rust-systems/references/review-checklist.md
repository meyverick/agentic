---
type: Reference
title: Systems Review Checklist, Severity Ladder & Audit Contracts
generated: { by: agentic/1.0, at: 2026-09-30T13:57:00Z }
status: stable
sources:
  - id: rust-bad-practices
    resource: references/rust-bad-practices-research.md
  - id: rust-language-best-practices
    resource: references/rust-researches/rust-language-best-practices-research.md
---

# Systems Review Checklist & Audit Contracts

Audit procedures, severity ladder, and flag-on-sight rules for Rust systems code.

## 1. Operating Modes & Review Contract

1. **Build Mode:**
   - Pre-edit commitment: emit readiness statement naming applied lint tables/rules.
   - Respects declarative workspace lint governance.

2. **Review Mode:**
   - Non-mutating: emit findings only. Never modify the target codebase unless the user explicitly requests fixes.
   - Pinned Finding Line Format: Every review finding MUST be formatted on a single line matching:
     `severity · file:line · rule · fix`
   - Example:
     `error · src/net/session.rs:88 · cancellation-safety · replace read_exact with read loop or isolate in worker task`

3. **Verify Mode:**
   - Inspect surface and prescribe the exact verification lane.
   - Refuse Miri-only claims when FFI, SIMD, or assembly are present.

## 2. Severity Ladder

- **`error`**: Undefined behavior, memory corruption, data race, cancel-safety data loss, ABI violation, strict provenance loss, uncontained panic across FFI, or CI gate failure.
- **`warning`**: Suboptimal concurrency topology, lock contention, missing `chunks_exact` in hot vectorization loops, missing cacheline padding on contended atomics, or per-crate lint overrides.
- **`info`**: Style improvements, doc comment enhancements, or non-critical refactoring opportunities.

## 3. Flag-on-Sight Catalog

Flag the following anti-patterns immediately during review:

1. **Missing Member Opt-In or Local Deny:** Member crate lacking `[lints] workspace = true` or using `#![deny(...)]`.
2. **Cancel-Unsafe Await in `select!`:** `read_exact`, `write_all`, `Mutex::lock`, or `Semaphore::acquire` inside a `tokio::select!` branch.
3. **Lock Across Await:** Sync `MutexGuard` or `RefCell` borrow held across an `.await`.
4. **Provenance Loss:** Raw pointer integer cast via `ptr as usize as *mut T`.
5. **Abort/Containment Contradiction:** `catch_unwind` shims declared in a crate built with `panic = "abort"`.
6. **Unfenced Streaming Stores:** `_mm256_stream_ps` or non-temporal writes without `_mm_sfence()`.
7. **Unparsed Deny Failure:** `cargo deny` failures treated as opaque errors without decoding the `0x1/0x2/0x4/0x8` bitmask.
8. **Miri-Only Claim on Foreign Code:** Declaring code sound based solely on Miri when it executes `asm!`, `core::arch` SIMD, or foreign C calls.

## 4. Guardrails Boundary

`guardrails` owns cross-cutting hazards (nullability, lifetime elision, dependency vetting, Docker containers, HTML/auth, and secret leakage). `rust-systems` owns systems soundness (lint governance, async cancellation, strict provenance, FFI ABIs, data-parallel hardware invariants, and verification lanes). When both activate, `guardrails` loads first.
