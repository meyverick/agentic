---
type: Reference
title: Systems Verification Lanes, Sanitizers & Diagnostic Harnesses
generated: { by: agentic/2.0, at: 2026-10-22T10:35:00Z }
status: stable
sources:
  - id: google-rust-styleguide
    resource: https://google.github.io/styleguide/rustguide.html
  - id: rust-systems-verification
    resource: references/rust-researches/rust-systems-verification-research.md
  - id: advanced-rust-systems
    resource: references/rust-researches/advanced-rust-systems-programming-research.md
---

# Systems Verification Lanes, Sanitizers & Diagnostics

High-assurance testing, static analysis, assertion diagnostics, sanitizers, and supply-chain verification.

## 1. Hardened Quality Lane

This hardened lane supersedes the default CI check. It enforces `rustfmt`, expands Clippy to all targets and features, runs parallel unit/integration tests via `cargo nextest`, executes doctests via `cargo test --doc`, and integrates supply-chain and SemVer validation.

```bash
# 1. Format Check (enforces rustfmt.toml rules)
cargo fmt --check

# 2. Strict Workspace Linting
cargo clippy --all-targets --all-features -- -D warnings

# 3. Parallel Unit/Integration Tests
cargo nextest run --profile ci

# 4. Doc Tests (nextest does not execute doctests)
cargo test --doc

# 5. Release Compilation
cargo build --release

# 6. Supply Chain Security & Policy Audit
cargo deny check

# 7. Semantic Versioning Invariant Check
cargo semver-checks check-release --baseline-rev origin/main
```

### Lane Prerequisites & Per-Codebase Test Harnesses
- **`cargo nextest run --profile ci`**: Requires a repository-level `nextest.toml` containing a configured `[profile.ci]` section (timeout settings, retry limits, failure caps).
- **`cargo deny check`**: Requires a root `deny.toml` configuring all four policy sections: `[advisories]`, `[bans]`, `[licenses]`, and `[sources]`.
- **`cargo semver-checks`**: Requires a fetched `baseline` git reference (`origin/main`) in the local git cache before invocation.
- **Platform Test Harness Overrides (When Activated by Brief):**
  - **Standard Cargo Workspace:** Use `#[test]` / `#[tokio::test]` executed via `cargo nextest`.
  - **Chromium (`[chrome]`):** Use `rust_gtest_interop` (`#[gtest]`) when integrating Rust unit tests into C++ gtest binaries, and format via `git cl format`.
  - **Fuchsia (`[Fuchsia]`):** Use `#[fuchsia::test]` for Fuchsia executor and logging integration.

## 2. Diagnostic Assertions in Tests & Production

Follow the Google Rust Style Guide rules for test and invariant assertions:
- Always provide a contextual format string in `assert!`, `assert_eq!`, and `debug_assert!` whenever the reason for the invariant is not obvious from the boolean expression alone.
- Log the offending runtime values (`got {actual:?}`) and state whether a failure indicates caller API misuse or an internal bug.
- Do not write redundant messages that merely repeat the code expression (`assert!(v.is_sorted(), "v must be sorted")`); explain *why* (`assert!(v.is_sorted(), "v is drained from a BinaryHeap and must remain sorted")`).

## 3. Supply Chain Bitmask Parsing (`cargo deny`)

When `cargo deny check` exits with a non-zero code, it encodes failures in an exit status bitmask:

| Bitmask Flag | Value | Failing Policy Section | Remediation Action |
|---|---|---|---|
| `0x1` | 1 | Licenses | Check dependency licenses against permitted SPDX list in `deny.toml`. |
| `0x2` | 2 | Bans | Remove banned crate or resolve duplicate crate versions. |
| `0x4` | 4 | Advisories | Patch or upgrade crate with known security vulnerability. |
| `0x8` | 8 | Sources | Remove dependencies hosted on unauthorized or non-crates.io registries. |

A failure with exit code 6 (`0x2 | 0x4`) signifies both a banned dependency and an unaddressed security advisory.

## 4. Miri Undefined Behavior Verification

Run Miri with strict provenance checking and the Tree Borrows memory model:

```bash
MIRIFLAGS="-Zmiri-strict-provenance -Zmiri-tree-borrows" cargo miri test
```

- `-Zmiri-strict-provenance`: Enforces integer-to-pointer provenance boundaries.
- `-Zmiri-tree-borrows`: Validates fine-grained reference tagging and aliasing lifespans.

## 5. Native Sanitizers & Miri Blind Spots

> [!WARNING]
> **Miri Blind Spot Rule:** Miri interprets Rust MIR. It CANNOT execute inline assembly (`asm!`), hardware SIMD intrinsics (`core::arch`), or cross foreign FFI boundaries. If code touches these surfaces, claiming "Miri passes" is false assurance. A native sanitizer lane is **REQUIRED**.

### Compiler Sanitizers (`rustc -Zsanitizer=help`)
*Note: `rustc` has no undefined-behavior sanitizer (unlike Clang UBSan). The valid list from `rustc -Zsanitizer=help` is: `address`, `thread`, `memory`, `leak`, `cfi`, `kcfi`, `shadow-call-stack`.*

1. **AddressSanitizer (ASan) & LeakSanitizer (LSan):**
   ```bash
   RUSTFLAGS="-Zsanitizer=address" cargo test --target x86_64-unknown-linux-gnu
   ```
   Detects out-of-bounds heap/stack accesses, use-after-free, double-free, and memory leaks.

2. **ThreadSanitizer (TSan):**
   ```bash
   RUSTFLAGS="-Zsanitizer=thread" cargo test --target x86_64-unknown-linux-gnu
   ```
   Detects data races in multi-threaded code.

3. **MemorySanitizer (MSan):**
   ```bash
   RUSTFLAGS="-Zsanitizer=memory" cargo -Zbuild-std test --target x86_64-unknown-linux-gnu
   ```
   Detects uninitialized memory reads. MSan requires `-Zbuild-std` because the standard library must be instrumented.