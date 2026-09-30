---
type: Reference
title: Data-Parallelism, Hardware SIMD & Cache Architecture
generated: { by: agentic/1.0, at: 2026-09-30T13:57:00Z }
status: stable
sources:
  - id: advanced-rust-systems
    resource: references/rust-researches/advanced-rust-systems-programming-research.md
  - id: rust-systems-verification
    resource: references/rust-researches/rust-systems-verification-research.md
---

# Data-Parallelism, Hardware SIMD & Cache Architecture

High-throughput compute invariants, SIMD vectorization, memory alignment, and cacheline false-sharing mitigation.

## 1. Portable SIMD vs. Vendor Intrinsics

1. **`core::simd` / `std::simd` Preferred First:** Always prefer portable SIMD (`std::simd::f32x8`, `std::simd::u64x4`) over vendor-specific intrinsics. Portable SIMD compiles to target vector instructions across x86-64 (AVX2/AVX-512) and AArch64 (NEON/SVE) without ABI lock-in.
2. **`core::arch` Isolation:** When using vendor intrinsics (e.g. `_mm256_*`), isolate them in dedicated modules gated by runtime CPU feature detection (`is_x86_feature_detected!("avx2")`).
3. **Mandatory Scalar Fallback:** Every hardware-intrinsic function MUST provide a scalar fallback path executed when required CPU extensions are absent at runtime.

## 2. Memory Alignment Contracts

Vector units require aligned memory operands for maximum throughput. Unaligned loads/stores cause performance penalties or hardware faults.

- **16-byte Alignment:** SSE / NEON 128-bit operations.
- **32-byte Alignment (`#[repr(align(32))]`):** AVX / AVX2 256-bit operations.
- **64-byte Alignment (`#[repr(align(64))]`):** AVX-512 operations and CPU cachelines.

### Auto-Vectorization Checklist:
- Use `slice.chunks_exact(8)` (or `chunks_exact_mut(8)`) rather than `chunks()` to eliminate bounds checking and enable LLVM auto-vectorization across the loop body.
- Handle remaining trailing elements via `remainder()`.
- Use pointer alignment assertions (`assert_eq!(ptr.addr() % 32, 0)`) before streaming vector loops.

## 3. Non-Temporal Streaming Stores & Memory Fences

When writing massive buffers that exceed CPU cache capacity, use non-temporal streaming stores to bypass cache allocation and avoid write-allocate overhead:

```rust
// Stream 256 bits directly to main memory
unsafe {
    _mm256_stream_ps(dst_ptr, vector_data);
    // MANDATORY: serialize non-temporal stores before releasing data
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
2. **Empirical Evidence Rule:** Any claim of false-sharing mitigation or cache optimization MUST cite benchmark evidence measured via Criterion benchmarks or cache-miss profiling via `perf c2c` (e.g. `perf c2c record -- ./target/release/bench_binary`).
