---
type: Reference
title: Rust Workspace Lints, Formatting & Profile Governance
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

# Workspace Lints, Formatting & Profile Governance

Centralized RFC 3389 lint declarations, Google-aligned `rustfmt` conventions, and hardened compiler profiles.

## 1. Declarative RFC 3389 Table

Declare all lints at the workspace root in `Cargo.toml`. Never allow per-crate `#![deny(...)]` or member `.clippy.toml` drift.

```toml
[workspace.lints.rust]
unsafe_op_in_unsafe_fn = "deny"
static_mut_refs = "deny"
unused_must_use = "deny"
unsafe_attr_outside_unsafe = "deny"
missing_docs = "warn"
non_exhaustive_omitted_patterns = "warn"

[workspace.lints.clippy]
# Aggregate baselines at priority = -1 to allow individual overrides
all = { level = "warn", priority = -1 }
pedantic = { level = "warn", priority = -1 }
nursery = { level = "warn", priority = -1 }

# Concurrency & Lock Discipline
await_holding_lock = "deny"
await_holding_refcell_ref = "deny"
let_underscore_lock = "deny"
if_let_mutex = "deny"
mut_mutex_lock = "deny"

# Panic Surface & Robustness
unwrap_in_result = "deny"
unwrap_used = "warn"

# Memory Soundness & Transmute Safety
transmute_undefined_repr = "deny"
transmuting_null = "deny"
transmute_ptr_to_ref = "deny"
cast_ptr_alignment = "deny"
cast_slice_different_sizes = "deny"
uninit_vec = "deny"
box_collection = "deny"
drop_non_drop = "deny"

# API, Trait & Google Style Guide Contracts
derived_hash_with_manual_eq = "deny"
derive_ord_xor_partial_ord = "deny"
declare_interior_mutable_const = "deny"
borrowed_box = "deny"
should_implement_trait = "deny"
new_without_default = "warn"
len_without_is_empty = "warn"
exhaustive_enums = "warn"
wildcard_imports = "warn"

# Local Warnings (Deny in CI Lane via -D warnings)
significant_drop_tightening = "warn"
clone_on_ref_ptr = "warn"
large_stack_arrays = "warn"
ptr_arg = "warn"
wrong_self_convention = "warn"
missing_safety_doc = "warn"
missing_panics_doc = "warn"
```

> [!IMPORTANT]
> **Warn in local dev, deny in verification:** Every lint set to `warn` in this table is escalated to deny during CI verification via `cargo clippy --all-targets --all-features -- -D warnings`.

## 2. Member Opt-In Mechanism (RFC 3389)

Workspace lints are **not** inherited automatically. Every workspace member crate MUST explicitly opt in within its own `Cargo.toml`:

```toml
[lints]
workspace = true
```

Reviewers MUST flag any member crate omitting `[lints] workspace = true` or declaring local `#![deny]` blocks as a governance violation.

## 3. Edition 2024 Gate

The workspace root and member crates MUST declare:

```toml
[package]
edition = "2024"
```

**Mechanism:** In Edition 2024, `static_mut_refs` is deny-by-default. Other deny lints (`unsafe_op_in_unsafe_fn`, `unsafe_attr_outside_unsafe`) are explicitly enforced by the `[workspace.lints]` table above.

## 4. Formatting Governance (`rustfmt.toml`)

Enforce automatic formatting across the workspace. When nightly or supported `rustfmt` options are available, apply the Google Rust Style Guide baseline:

```toml
max_width = 100
imports_granularity = "Module"
hex_literal_case = "Lower"
format_macro_matchers = true
```

### Formatting Invariants:
1. **Escape Invisible Characters:** Always use explicit Unicode escapes (e.g., `\u{200D}` for Zero-Width Joiner) rather than raw invisible characters in string or char literals.
2. **Restricted `#[rustfmt::skip]`:** Opting out of automatic formatting via `#[rustfmt::skip]` is permitted ONLY for:
   - **Manual tabular/matrix alignment** where column alignment materially aids inspection.
   - **Generated code** (prefer build-time `genrule` or `OUT_DIR` inclusion where possible).
   Never use `#[rustfmt::skip]` for personal aesthetic preferences.

## 5. Release Profile Hardening

```toml
[profile.release]
opt-level = 3
lto = "fat"
codegen-units = 1
panic = "abort"
strip = "symbols"
overflow-checks = true
```

### Profile Invariants:
1. **Overflow Checks:** `overflow-checks = true` MUST remain enabled for value, financial, and ledger paths. Disabling overflow checks is permitted only within an isolated, measured kernel whose benchmark measurement is cited in code comments.
2. **Panic Abort vs. Containment:** Setting `panic = "abort"` optimizes binary size and unwinding overhead (and is mandatory in Chromium, Android, and Fuchsia profiles), but completely disables `panic::catch_unwind`. Any FFI or entry-point surface that uses `catch_unwind` as a defense-in-depth mechanism MUST run under a profile with `panic = "unwind"`.