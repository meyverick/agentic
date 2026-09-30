---
type: Reference
title: FFI Boundaries, Memory Provenance & ABI Soundness
generated: { by: agentic/1.0, at: 2026-09-30T13:57:00Z }
status: stable
sources:
  - id: advanced-rust-systems
    resource: references/rust-researches/advanced-rust-systems-programming-research.md
  - id: rust-bad-practices
    resource: references/rust-bad-practices-research.md
---

# FFI Boundaries, Memory Provenance & ABI Soundness

Invariants for Foreign Function Interfaces (FFI), ABI stability, and memory model soundness.

## 1. Type Representation & Layout Guarantees

Rust's default `repr(Rust)` provides no stable layout across compiler versions or compilation units.

- **`#[repr(C)]`**: Mandatory for any struct or enum shared across foreign ABI boundaries.
- **`#[repr(transparent)]`**: Mandatory for single-field newtypes wrapping raw pointers or primitive handles intended to cross FFI boundaries unchanged.
- **C++ Interop**: Prefer `cxx` for safe, bidirectional Rust/C++ bridges rather than hand-rolled unsafe `extern "C"` blocks.
- **Symbol Exporting**: Use `#[unsafe(no_mangle)]` in Edition 2024 to export symbols without name mangling.

### Forbidden Across `extern "C"` Boundaries:
1. **Fat Pointers:** Slices (`&[T]`, `&mut [T]`), string slices (`&str`), and trait objects (`&dyn Trait`) are multi-word fat pointers with undefined layout across C ABIs. Pass pointer and length as separate parameters (`ptr: *const T, len: usize`).
2. **Complex Enums:** Non-fieldless enums without `#[repr(C, u8)]` (or equivalent integer tag) or null-pointer optimization (`Option<NonNull<T>>`, `Option<extern "C" fn()>`) must not cross the boundary.
3. **Rust Standard Collections:** `Vec<T>`, `String`, and `Box<T>` cannot be safely deallocated across ABI boundaries using foreign allocators (`malloc`/`free`).

## 2. Unwinding Across FFI Boundaries (RFC 2945)

Panicking across an `extern "C"` boundary without an unwind ABI is undefined behavior and immediately aborts the process.

- **RFC 2945 `extern "C-unwind"`**: Use `extern "C-unwind"` if foreign frames are capable of unwinding or if exceptions cross language runtimes.
- **Aborting `extern "C"`**: Standard `extern "C"` traps panics. Any Rust function exposed as `extern "C"` MUST contain internal panics.
- **Containment Shims:** Use `std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| { ... }))` at the FFI boundary to catch panics and translate them into C-compatible error codes.
- **The Abort vs. Containment Either/Or:**
  If the crate is compiled with `panic = "abort"`, `catch_unwind` is completely disabled at compile time. Reviewers MUST flag any codebase having `panic = "abort"` alongside `catch_unwind` boundary shims as contradictory. If error containment is required, the release profile must set `panic = "unwind"` or containment shims must be replaced with explicit `Result` propagation.

## 3. Strict Provenance API

Integer-to-pointer casts (`ptr as usize as *mut T`) strip pointer provenance, leading to miscompilations under LLVM and undefined behavior under Stacked/Tree Borrows.

### Correct Provenance APIs:
- `ptr.addr()`: Inspects the virtual address as a `usize` without altering or stripping provenance.
- `ptr.with_addr(new_addr)`: Derives a new pointer with the target address while explicitly preserving the provenance of `ptr`.
- `ptr.expose_provenance()` / `std::ptr::from_exposed_addr(addr)`: Use only when interacting with foreign APIs that store pointers in opaque integer handles. Never use raw `as usize` casts.

## 4. Stacked & Tree Borrows Aliasing Invariants

1. Never create intermediate references (`&mut *raw_ptr`) to data that is concurrently accessed via other raw pointers or references.
2. Creating an `&mut T` asserts exclusive access to the underlying memory and immediately invalidates all sibling raw pointers under Stacked Borrows.
3. Use raw pointer arithmetic (`ptr.add()`, `ptr.offset()`) and `std::ptr::read`/`write` directly when managing uninitialized or aliased buffers.
