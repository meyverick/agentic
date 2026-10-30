---
type: Reference
title: Idiomatic API Design, Code Organization & Google Rust Style Guide Rules
generated: { by: agentic/2.0, at: 2026-10-22T10:35:00Z }
status: stable
sources:
  - id: google-rust-styleguide
    resource: https://google.github.io/styleguide/rustguide.html
  - id: rust-language-best-practices
    resource: references/rust-researches/rust-language-best-practices-research.md
---

# Idiomatic API Design, Code Organization & Style Rules

Normative rules distilled from the Google Rust Style Guide for maintainability, large-scale refactoring resilience, and idiomatic API design.

## 1. Context Tiering: Library vs. Application Code

Before applying API design rules, classify the target crate:

| Context Tier | Purpose | Governance Standard |
|---|---|---|
| **Library Code** | Reusable across multiple crates, teams, or applications; solves general problems. | API design rules are **binding**. Optimize for caller flexibility, minimal allocations, and forward compatibility (`#[non_exhaustive]`). |
| **Application Code** | Internal to a single binary or service; solves a specific problem. | API design rules are **strong recommendations**. Favor simplicity, directness, and concrete types (`Vec<T>`, `&[T]`) over premature generalization or `impl Into<T>`. |

## 2. Code Organization & Module Topology

1. **Leaf Module Naming:** Name source files and leaf modules after their primary user-defined item (e.g., `struct SessionPool` lives in `session_pool.rs` / `mod session_pool`).
2. **Non-Leaf Module Purity:** Non-leaf modules (`lib.rs`, `mod.rs`, or parent module files) MUST contain only `mod` declarations and `pub use` re-exports. Do not implement APIs in non-leaf modules (exceptions: `mod test`, `#[cxx::bridge]` bindings, or minimal top-level glue).
3. **No Glob Imports or Custom Preludes:**
   - Do NOT use glob imports (`use foo::*`) or define custom `prelude` modules.
   - **Permitted Exceptions:**
     - `use super::*` inside inline `#[cfg(test)] mod tests`.
     - `use MyEnum::*` inside a function or method body that primarily switches on `MyEnum`.
     - `pub use submodule::*` in non-leaf modules re-exporting leaf APIs.
     - Private C++ namespace merging (`mod absl { pub use status::absl::*; pub use strings::absl::*; }`).
4. **Single-Module `use` Granularity (`imports_granularity = "Module"`):**
   - Every `use` statement must import items from a single module. Never nest `::` inside `{...}` braces.
   - **Bad:** `use foo::{Foo, bar::Bar};`
   - **Good:**
     ```rust
     use foo::Foo;
     use foo::bar::{Bar, Baz};
     ```
5. **Locally-Scoped Trait Imports:** Import traits inside the narrowest function body where their methods are called, unless the trait is used pervasively across the file.
6. **Function vs. Type Qualification:**
   - **Free Functions:** Import the parent module and qualify the call (`use std::mem; mem::replace(&mut x, y)`), unless the function name is uniquely disambiguated (e.g., C++ FFI free functions) or the module name collides across crates.
   - **Types and Traits:** Import at the top of the file (or local scope) and reference unqualified (`Regex`, not `regex::Regex`), unless ambiguous (`io::Error` or `use std::io::Error as IoError`).

## 3. Ownership, Borrowing & Smart Pointers

1. **Avoid `Rc` and `Arc` by Default:** Prefer unique ownership and explicit lifetimes/borrows over reference-counted smart pointers (`Rc`, `Arc`). Introduce `Arc`/`Rc` only when lifetime graphs or concurrent sharing would otherwise become unreasonably complex to maintain.
2. **Prefer Borrows Over Deep Copies:** Do not call `.clone()` to sidestep borrow-checker design. Clone only when an independent deep copy is required or when borrowing demonstrably overcomplicates local control flow in non-hot paths. (Note: `Arc::clone` / `Rc::clone` are cheap pointer copies and are expected when using shared pointers.)

## 4. Function Inputs, Outputs & Error Contracts

1. **Accept Flexible Immutable References:**
   Always accept the borrowed payload rather than a reference to an owning container:

   | Use | Instead Of | Clippy Lint |
   |---|---|---|
   | `&T` | `&Box<T>` | `borrowed_box` |
   | `&[T]` | `&Vec<T>` | `ptr_arg` |
   | `&str` | `&String` | `ptr_arg` |
   | `Option<&T>` | `&Option<T>` | `ref_option` |

2. **Iterators vs. Collections:**
   - **Return Types:** In libraries, prefer returning concrete iterators or `impl Iterator<Item = T>` over `Vec<T>` unless callers require random indexing or the function inherently allocates a `Vec`. In application code, returning `Vec<T>` is preferred when it simplifies signatures.
   - **Parameters:** In reusable libraries, accept `impl IntoIterator<Item = T>` if the function only iterates. In application code, prefer `&[T]`.
3. **Restrict `impl Into<T>` Parameters:** Use `impl Into<T>` only in library APIs where call-site ergonomics strongly outweigh monomorphization bloat and type-inference friction. Application code should almost never use `impl Into<T>`.
4. **Prefer `enum` Over `bool` in Parameters:** Replace `bool` arguments with descriptive two-state `enum`s whenever the call-site meaning of `true`/`false` is not self-evident. If a `bool` remains, annotate call sites with an inline comment (`/* allow_overwrite= */ true`).
5. **Error Reporting Trilemma (`Option` vs. `Result` vs. `panic!`):**
   - **`Option<T>`:** Use for expected, self-explanatory absences where no additional error context exists (e.g., `checked_add`, map lookup).
   - **`Result<T, E>`:** Use for recoverable operational failures caused by external factors (I/O, network, parsing) where callers need context to distinguish failure modes.
   - **`panic!`:** Use exclusively for programming bugs and violated preconditions/invariants (e.g., out-of-bounds index). Never use `panic::catch_unwind` as a general error-handling mechanism.

## 5. Types, Traits & Extension Patterns

1. **Newtypes Over Type Aliases:** Use a single-field newtype (`pub struct Milliseconds(pub u64);`) instead of `type Milliseconds = u64;` whenever the type carries semantic invariants, prevents unit mix-ups (`Day`, `Month`, `Year`), or may evolve its internal representation.
2. **Named Fields Over Tuples:** Use structs with named fields rather than tuples or multi-field tuple structs so field accesses are self-documenting (avoid `.0`, `.1` outside single-field newtypes).
3. **Inherent `impl` vs. Traits:** Define a custom trait ONLY to enable generic bounds (`T: Trait`), dynamic/opaque dispatch (`dyn Trait` / `impl Trait`), or an extension trait. Never define a trait merely to group or organize methods on a local type.
4. **Generics vs. `dyn Trait`:** In libraries, prefer static dispatch (`T: Trait` or `impl Trait`) over `dyn Trait` to permit inlining and avoid vtable indirection, unless binary size is the primary constraint.
5. **Extension Traits (`~Ext`):**
   - Suffix extension traits with `Ext` (e.g., `SliceExt`, `FutureExt`).
   - Do not use extension traits in generic bounds or `dyn Trait`.
   - The team owning the extended type should own the extension trait (except for foundational framework traits).
6. **Standard Trait Discipline:**
   - Use `#[derive(...)]` over manual implementations whenever semantics match.
   - Implement `FromStr`, `Display`, or `AsRef` instead of inventing ad-hoc conversion methods.
   - Pair primary `From` implementations with an explicit inherent constructor (`new()`, `from_foo()`, or `new_from_foo()`).
   - Implement `Copy` on error types whenever feasible (avoid embedding heap `String`s inside lightweight systems error enums).
   - Implement `Default` on types with `new()` and on all-public-field "options bag" structs to enable functional record update (`Options { timeout: 5, ..Default::default() }`).
   - Implement `len()` and `is_empty()` together.
   - Prefer `PartialEq` / `PartialOrd` unless full reflexivity (`Eq`) or total ordering (`Ord`) is guaranteed; implement `Hash + Eq` (and `Ord` if total) for map keys.

## 6. Macros, Naming & Accessors

1. **Macro Preference Hierarchy:**
   Express abstractions in this strict order of preference:
   1. Regular Rust functions, types, generics, and traits.
   2. Declarative `macro_rules!` macros.
   3. Build-time code generation (`build.rs` / `genrule`).
   4. Procedural macros (`proc_macro`) — last resort due to IDE, compile-time, and refactoring costs.
2. **Naming Conventions:**
   - **Constructors:** `new()`, `new_with_foo()`, `try_new()` (when returning `Result`), and `from_foo()`.
   - **Conversions:** Follow `as_foo(&self)` (free borrow view), `to_foo(&self)` (cloning/allocating conversion), and `into_foo(self)` (consuming conversion).
   - **Getters, Setters & Closure Accessors:**
     - `foo(&self) -> &Foo` or `Foo` (by value if `Copy`)
     - `foo_mut(&mut self) -> &mut Foo`
     - `take_foo(&mut self) -> Option<Foo>` (clears to `None`/default and returns old value)
     - `set_foo(&mut self, foo: Foo)`
     - `replace_foo(&mut self, foo: Foo) -> Foo`
     - **`with_foo(&self, f: impl FnOnce(&Foo) -> R) -> R`** and **`with_mut_foo(&mut self, f: impl FnOnce(&mut Foo) -> R) -> R`**: Prefer closure accessors when a field is wrapped in `Mutex` or `RefCell` (preventing `MutexGuard` from leaking into the public API) or when post-mutation validation must run automatically.
   - **Lifetimes & Generics:** Use descriptive lifetime names on types (`struct Parser<'input>`). Single-letter lifetimes (`'a`, `'b`) are permitted for up to two local function lifetimes or `for<'a>` bounds; use `'_` whenever elision applies. Name generic parameters after their primary trait bound (`R: Read`, `W: Write`) or `T`/`U` when unbound.
   - **No Obscure Abbreviations:** Never invent abbreviations by deleting letters (e.g., use ` descriptor` or ` count`, not `dscr` or `cnt`). Well-known industry initialisms (`IpAddr`, `Http`) are permitted.

## 7. Documentation & API Attributes

1. **Doc Comments (`///` and `//!`):**
   - Document all public items with `///` and modules/crates with `//!` using standard Markdown. Never generate doc comments via macros when direct comments suffice.
   - Omit trivial doc comments that merely restate the function name (`/// Removes element.` on `remove_element()`).
   - Document `# Panics` for any public function that can panic on malformed input, and `# Safety` for every `unsafe fn` or `unsafe trait`.
   - Combine `///` (public contract) and `//` (internal implementation notes/TODOs) freely on the same item.
2. **Forward-Compatibility & Safety Attributes:**
   - **`#[non_exhaustive]`**: Apply to publicly exposed enums and public-field structs shared across team/crate boundaries (unless the ontology is permanently fixed, such as `Color { Red, Green, Blue }`, or the struct supports `..Default::default()` literal updates).
   - **`#[must_use]`**: Apply to pure functions, functions returning error-like statuses, and lazy computation types.
   - **`const fn`**: Mark a public function `const` only if you commit to preserving its `const` contract indefinitely (removing `const` is a SemVer breaking change).
   - **`#[doc(hidden)]`**: Treat foreign items marked `#[doc(hidden)]` as strictly private; never call or import them.
   - **Operator Overloading:** Implement `std::ops` traits strictly for mathematical or standard indexing semantics, never as arbitrary DSL syntax sugar.

## 8. Implementation Idioms

1. **Explicit Type Annotations Over Inference Overuse:** Add explicit type annotations on local bindings when calling generic return methods (`.into()`, `.parse()`, `.collect()`) or terminating multi-step iterator chains. Prefer `let items: Vec<Item> = ...` over turbofish `::<>`.
2. **Pattern Matching Over Check-Then-Unwrap:**
   - **Bad:** `if opt.is_some() { use_val(opt.unwrap()); }`
   - **Good:** `if let Some(val) = opt { use_val(val); }`
3. **Prefer `expect` Over `unwrap`:** When a panic is statically impossible due to an invariant not captured by the type system, call `.expect("explain why invariant holds")` rather than bare `.unwrap()`.
4. **Exhaustive Matching on `#[non_exhaustive]` Enums:** Explicitly list all known variants in `match` arms and group ignored variants with the wildcard arm (`Shape::Triangle | _ => {}`) so `non_exhaustive_omitted_patterns` catches newly added upstream variants.
5. **Contextual Assertions:** Include a format string in `assert!`, `assert_eq!`, and `debug_assert!` explaining *why* the invariant holds, logging offending values, and clarifying whether failure indicates caller misuse or an internal bug (`assert!(refund > 0, "Refund must be positive, got {refund:?}")`).
6. **Readable Iteration Over Complex Combinators:**
   - Prefer a plain `for` loop when an iterator chain mutates external state, mixes fallible branching, or spans complex nested closures.
   - Never construct a multi-step combinator chain inline inside a `for x in ...` header; bind the iterator to a descriptive local variable first.
   - Avoid `.for_each(...)` in favor of a standard `for` loop.
7. **String Concatenation:** Prefer `format!("{a}{b}{c}")` or `write!()` over chained `+` operators when concatenating more than two strings or substituting into templates.

## 9. Optional Platform Profiles Appendix (Chromium, Fuchsia, Android)

Activate these platform overrides **only** when the user brief or repository context targets Chromium (`[chrome]`), Fuchsia (`[Fuchsia]`), or Android (`[Android]`):

- **Chromium Profile (`[chrome]`):**
  - **Small Crates & Flat Layout:** Prefer small, single-abstraction crates (`rust_static_library`). Keep all `.rs` files for a crate in a single flat directory without subdirectories (except `//third_party` Cargo crates).
  - **Import Macro:** Use `chromium::import!()` for inter-target imports.
  - **Concurrency Bans:** Do NOT use `async` / `.await` and do NOT spawn OS threads via `std::thread`; use Chromium sequences instead.
  - **Panic & Unwind:** Compiled with `panic = "abort"`; `panic::catch_unwind` is strictly forbidden.
  - **Test Harness:** Use `rust_gtest_interop` (`#[gtest]`) instead of standalone `#[test]` where C++ test binary integration is required.
- **Fuchsia Profile (`[Fuchsia]`):**
  - **Synchronization:** Use `fuchsia_sync::Mutex` instead of `std::sync::Mutex` or `parking_lot::Mutex`.
  - **Test Harness:** Use `#[fuchsia::test]` instead of raw `#[test]`.
  - **Panic Disposition:** Compiled with `panic = "abort"`; `panic::catch_unwind` is forbidden.
- **Android Profile (`[Android]`):**
  - **Panic Disposition:** Compiled with `panic = "abort"`; `panic::catch_unwind` is forbidden.
  - **Unstable Features:** Prohibited except in bare-metal/embedded targets where explicitly reviewed and approved to build the artifact.