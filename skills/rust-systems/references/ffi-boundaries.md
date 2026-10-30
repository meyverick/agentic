---
type: Reference
title: FFI Boundaries, Unsafe Governance, Memory Provenance & ABI Soundness
generated: { by: agentic/2.0, at: 2026-10-22T10:35:00Z }
status: stable
sources:
  - id: google-rust-styleguide
    resource: https://google.github.io/styleguide/rustguide.html
  - id: advanced-rust-systems
    resource: references/rust-researches/advanced-rust-systems-programming-research.md
  - id: rust-bad-practices
    resource: references/rust-bad-practices-research.md
---

# FFI Boundaries, Unsafe Governance, Memory Provenance & ABI Soundness

Invariants for `unsafe` code justification, Foreign Function Interfaces (FFI), ABI stability, initialization order, and memory model soundness.

## 1. Unsafe Code Governance (Three-Part Mandate)

Do not write `unsafe` code unless there is no viable way to achieve the required functionality or proven performance target in safe Rust. Every `unsafe` block, function, or trait implementation MUST satisfy all three requirements:

1. **Safe Abstraction & Isolation:** Encapsulate `unsafe` operations behind a safe public API with narrow module visibility. Where feasible, isolate `unsafe` abstractions in a dedicated leaf module or small crate with minimal dependencies beyond `core`/`std`.
2. **`// SAFETY:` Invariant Comment:** Every `unsafe` block or `#[unsafe(...)]` attribute MUST be preceded by a `// SAFETY:` comment explaining why the concrete preconditions of the unsafe operation are satisfied at that call site. Every `pub unsafe fn` MUST document its caller contract under a `# Safety` doc section.
3. **Technical Justification:** Provide a technical justification (on the block, module, or target) answering:
   - *Why cannot this code be written in an equivalent safe way?*
   - *If the motivation is performance, which Criterion benchmark or profile (`perf`) proves the gain?*

## 2. No Code Execution Before `main()`

Never cause Rust code to execute before `main()` (for example, via the `ctor` crate, `.init_array` linker sections, or C++ static initializer bridges calling into Rust). Pre-`main()` execution violates Rust standard library runtime assumptions, introduces initialization-order fiascos across FFI boundaries, and is flagged on sight. Initialize state explicitly from `main()` or via lazy runtime primitives (`std::sync::OnceLock`, `LazyLock`).

## 3. Type Representation & Layout Guarantees

Rust's default `repr(Rust)` provides no stable layout across compiler versions or compilation units.

- **`#[repr(C)]`**: Mandatory for any struct or enum shared across foreign ABI boundaries.
- **`#[repr(transparent)]`**: Mandatory for single-field newtypes wrapping raw pointers or primitive handles intended to cross FFI boundaries unchanged.
- **C++ Interop**: Prefer `cxx` (`#[cxx::bridge]`) for safe, bidirectional Rust/C++ bridges rather than hand-rolled `extern "C"` blocks. When merging split C++ namespaces across crates, use a private module (`mod absl { pub use ... }`) that is never re-exported publicly.
- **Symbol Exporting**: Use `#[unsafe(no_mangle)]` in Edition 2024 to export symbols without name mangling.

### Forbidden Across `extern "C"` Boundaries:
1. **Fat Pointers:** Slices (`&[T]`, `&mut [T]`), string slices (`&str`), and trait objects (`&dyn Trait`) are multi-word fat pointers with undefined layout across C ABIs. Pass pointer and length as separate parameters (`ptr: *const T, len: usize`).
2. **Complex Enums:** Non-fieldless enums without `#[repr(C, u8)]` (or equivalent integer tag) or null-pointer optimization (`Option<NonNull<T>>`, `Option<extern "C" fn()>`) must not cross the boundary.
3. **Rust Standard Collections:** `Vec<T>`, `String`, and `Box<T>` cannot be safely deallocated across ABI boundaries using foreign allocators (`malloc`/`free`).

## 4. Unwinding Across FFI Boundaries & `catch_unwind` Policy

Panicking across an `extern "C"` boundary without an unwind ABI is undefined behavior and immediately aborts the process.

- **Prohibition on `panic::catch_unwind` in First-Party Logic:** Use of `std::panic::catch_unwind` is prohibited in general first-party code. Do not use `catch_unwind` to simulate exceptions or recover from broken internal invariants; use `Result` and `Option` instead.
- **Defense-in-Depth FFI Exception:** `catch_unwind` is permitted **only** as an un-relied-upon defense-in-depth barrier at critical entry points or `extern "C"` FFI boundaries in codebases that already prevent panics through type-safe design, and **only** when compiled with `panic = "unwind"`.
- **RFC 2945 `extern "C-unwind"`:** Use `extern "C-unwind"` when intentional cross-language stack unwinding is explicitly required by the foreign runtime contract.
- **The Abort vs. Containment Contradiction:**
  If a crate or target environment (such as our hardened release profile, Chromium, Android, or Fuchsia) compiles with `panic = "abort"`, `catch_unwind` is a dead no-op. Reviewers MUST flag any codebase combining `panic = "abort"` with `catch_unwind` shims as an error. Either switch the profile to `panic = "unwind"` (if containment is mandatory) or remove `catch_unwind` and enforce total `Result` propagation.

## 5. Strict Provenance API

Integer-to-pointer casts (`ptr as usize as *mut T`) strip pointer provenance, leading to miscompilations under LLVM and undefined behavior under Stacked/Tree Borrows.

### Correct Provenance APIs:
- `ptr.addr()`: Inspects the virtual address as a `usize` without altering or stripping provenance.
- `ptr.with_addr(new_addr)`: Derives a new pointer with the target address while explicitly preserving the provenance of `ptr`.
- `ptr.expose_provenance()` / `std::ptr::from_exposed_addr(addr)`: Use only when interacting with foreign C APIs that store pointers in opaque integer handles. Never use raw `as usize` casts.

## 6. Stacked & Tree Borrows Aliasing Invariants

1. Never create intermediate references (`&mut *raw_ptr`) to data that is concurrently accessed via other raw pointers or references.
2. Creating an `&mut T` asserts exclusive access to the underlying memory and immediately invalidates all sibling raw pointers under Stacked Borrows.
3. Use raw pointer arithmetic (`ptr.add()`, `ptr.offset()`) and `std::ptr::read`/`write` (or `addr_of!` / `addr_of_mut!`) directly when managing uninitialized or aliased buffers.