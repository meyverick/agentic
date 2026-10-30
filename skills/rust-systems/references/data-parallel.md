---
type: Reference
title: Data-Parallelism, Stable-First SIMD & Cache Architecture
generated: { by: agentic/2.0, at: 2026-10-22T10:35:00Z }
status: stable
sources:
  - id: google-rust-styleguide
    resource: https://google.github.io/styleguide/rustguide.html
  - id: advanced-rust-systems
    resource: references/rust-researches/advanced-rust-systems-programming-research.md
  - id: rust-systems-verification
    resource: references/rust-researches/rust-systems-verification-research.md
---

# Data-Parallelism, Stable-First SIMD & Cache Architecture

High-throughput compute invariants, stable-first vectorization, memory alignment, and cacheline false-sharing mitigation.

## 1. No Unstable Features Policy & Vectorization Hierarchy

In accordance with the Google Rust Style Guide, **do not enable unstable nightly `#![feature(...)]` flags by default**. Structure data-parallel hot paths using this strict hierarchy:

1. **Tier 1 (Default — Safe Stable Auto-Vectorization):**
   Write branchless loops over `slice.chunks_exact(N)` / `slice.chunks_exact_mut(N)` (handling remaining elements via `.remainder()`) so LLVM auto-vectorizes across target architectures without `unsafe` or unstable features.
2. **Tier 2 (Stable Hardware Intrinsics — `core::arch`):**
   When LLVM auto-vectorization is measurably insufficient (proven by Criterion benchmarks), isolate vendor intrinsics (`core::arch::x86_64`, `core::arch::aarch64`) in dedicated leaf modules:
   - Gate execution with runtime CPU feature detection (`std::arch::is_x86_feature_detected!("avx2")`).
   - Provide a **mandatory safe scalar fallback** when the CPU extension is absent at runtime.
   - Include both a `// SAFETY:` comment and the **technical/benchmark justification** required for all `unsafe` blocks.
3. **Tier 3 (Nightly Gate — `core::simd` / `std::simd`):**
   Portable SIMD (`#![feature(portable_simd)]`) may be used **only** when the project brief explicitly authorizes a nightly compiler toolchain or blanket-approved unstable feature list.

## 2. Memory Alignment Contracts

Vector units require aligned memory operands for maximum throughput. Unaligned loads/stores cause performance penalties or hardware faults.

- **16-byte Alignment (`#[repr(align(16))]`):** SSE / NEON 128-bit operations.
- **32-byte Alignment (`#[repr(align(32))]`):** AVX / AVX2 256-bit operations.
- **64-byte Alignment (`#[repr(align(64))]`):** AVX-512 operations and CPU cachelines.

### Auto-Vectorization & Alignment Checklist:
- Use `slice.chunks_exact(8)` (or `chunks_exact_mut(8)`) rather than `chunks()` to eliminate bounds checking and enable LLVM auto-vectorization across the loop body.
- Handle remaining trailing elements via `remainder()` / `into_remainder()`.
- Use pointer alignment assertions with contextual messages (`assert_eq!(ptr.addr() % 32, 0, "AVX2 streaming buffer must be 32-byte aligned, got {ptr:p}")`) before streaming vector loops.

## 3. Non-Temporal Streaming Stores & Memory Fences

When writing massive buffers that exceed CPU cache capacity, use non-temporal streaming stores to bypass cache allocation and avoid write-allocate overhead:

```rust
// Justification: Streaming store avoids L3 cache pollution on >64 MiB frame writes (Criterion +2.4x).
// SAFETY: `dst_ptr` is 32-byte aligned and valid for 32 bytes of exclusive write access.
unsafe {
    _mm256_stream_ps(dst_ptr, vector_data);
    // MANDATORY: serialize non-temporal stores before releasing data to reader threads
    _mm_sfence();
}
```

> [!CAUTION]
> **Mandatory `_mm_sfence()`:** Non-temporal stores are weakly ordered. Calling `_mm256_stream_ps` or `_mm_stream_si128` without a following `_mm_sfence()` causes memory corruption on reader cores.

## 4. Cacheline False Sharing Mitigation

When multiple CPU cores concurrently write to adjacent variables located within the same 64-byte cacheline, the cores invalidate each other's L1/L2 caches, causing catastrophic cacheline bouncing (false sharing).

### Mitigation Rules:
1. **Cacheline Padding:** Align concurrently updated variables or atomic counters to 64-byte boundaries:
   ```rust
   #[repr(align(64))]
   pub struct CacheAlignedCounter {
       pub counter: std::sync::atomic::AtomicU64,
   }
   ```
   Or use `crossbeam_utils::CachePadded<T>`.
2. **Empirical Evidence Rule:** Any claim of false-sharing mitigation or cache optimization MUST cite benchmark evidence measured via Criterion benchmarks or cache-miss profiling via `perf c2c` (e.g., `perf c2c record -- ./target/release/bench_binary`).