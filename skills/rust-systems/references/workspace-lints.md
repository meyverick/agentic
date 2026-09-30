---
type: Reference
title: Rust Workspace Lints & Profile Governance
generated: { by: agentic/1.0, at: 2026-09-30T13:57:00Z }
status: stable
sources:
  - id: rust-bad-practices
    resource: references/rust-bad-practices-research.md
  - id: rust-language-best-practices
    resource: references/rust-researches/rust-language-best-practices-research.md
---

# Workspace Lints & Profile Governance

Centralized lint declarations and hardened compiler profiles.

## 1. Declarative RFC 3389 Table

Declare all lints at the workspace root in `Cargo.toml`. Never allow per-crate `#![deny(...)]` or member `.clippy.toml` drift.

```toml
[workspace.lints.rust]
unsafe_op_in_unsafe_fn = "deny"
static_mut_refs = "deny"
unused_must_use = "deny"
unsafe_attr_outside_unsafe = "deny"

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

# Memory Soundness & Transmute Safety
transmute_undefined_repr = "deny"
transmuting_null = "deny"
transmute_ptr_to_ref = "deny"
cast_ptr_alignment = "deny"
cast_slice_different_sizes = "deny"
uninit_vec = "deny"
box_collection = "deny"
drop_non_drop = "deny"

# API & Trait Contracts
derived_hash_with_manual_eq = "deny"
derive_ord_xor_partial_ord = "deny"
declare_interior_mutable_const = "deny"

# Local Warnings (Deny in CI Lane via -D warnings)
significant_drop_tightening = "warn"
clone_on_ref_ptr = "warn"
large_stack_arrays = "warn"
ptr_arg = "warn"
wrong_self_convention = "warn"
missing_safety_doc = "warn"
```

> [!IMPORTANT]
> **Warn in local dev, deny in verification:** Every lint set to `warn` in this table is escalated to deny during CI verification via `cargo clippy -- -D warnings`.

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

## 4. Release Profile Hardening

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
2. **Panic Abort vs. Containment:** Setting `panic = "abort"` optimizes binary size and unwinding overhead, but explicitly forgoes `catch_unwind` containment. Any foreign FFI boundary requiring error containment MUST either configure `panic = "unwind"` for that profile or use non-unwinding error returns.
