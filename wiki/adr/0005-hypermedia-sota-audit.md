---
okf_version: "0.2"
type: ArchitectureDecisionRecord
title: Audit corrections to the hypermedia syllabus and its fidelity gate
tier: master
generated: { by: "agentic/0.7.1", at: 2026-10-31T00:00:00Z }
status: draft
stale_after: 2027-10-31
---

# 0005 — Audit corrections to the hypermedia syllabus and its fidelity gate

## Status

Accepted.

## Context

An independent audit of `skills/hypermedia-engine-stacks/` against the pinned corpus found the holocron structurally sound but wrong in four claims and short in six topics. The defects were not staleness: each was a statement a consumer would follow into a runtime failure.

- The archive answered an over-budget stream `503` without showing how the policy error becomes that answer. `LimitReached` implements no `IntoResponse`; `rama-http` implements it only for `RateLimitReached` (`429`), and the corpus's own handler maps `LimitReached` to `429` because it aborts a request.
- The archive said a parent never sees a child extension insert. True for `Extensions::fork()`, false for a clone, which shares the store — so a request-local overlay could leak into a shared one.
- The archive presented `CsrfLayer` as a trusted-origin allow-list. The layer's primary mechanism is `Sec-Fetch-Site` with an `Origin`/`Host` fallback, plus a bypass and a proxy caveat.
- The Datastar archive omitted `@setAll`, `@toggleAll`, and `@peek`, omitted the plugin modifier set, and marked the unkeyed `data-bind` form absent when its value is the signal name.

The gate that should have caught them asserted lengths, not claims.

## Decision

Correct the archive, then make the gate assert the claim.

- The gateway archive shows the `try_access()` error branch mapping `LimitReached` to `503` + `Retry-After`, or `LimitLayer::with_error_into_response_fn`, and states that `ConcurrentPolicy` request concurrency keeps the corpus `429`. `503` stays the stream answer: the resource is occupancy, not a spent budget, and the defect was the missing mapping rather than the status.
- `Extensions` documents `fork()` as the isolated child store and a clone as shared, and names `with_base`, `insert(&self)`, `get_ref_or_insert`, and `AddInputExtensionLayer::overwrite(false)`.
- The CSRF section names the five allow conditions, `with_insecure_bypass`, the proxy caveat, and that `TRACE` and `QUERY` are not exempt.
- Routing names `PathMatchPolicy` (default `AsciiInsensitive` + `PercentDecoded`, `STRICT` opt-in), specificity, and the route-layering methods.
- Datastar gains the three local actions, a plugin contract table with keyed/unkeyed forms and the documented modifiers, the corrected `data-bind` rows, and a size claim qualified as compressed.
- The syllabus gains a `## Verification` lane of five application tests beside the fidelity gate.
- `verify-archives.ts` asserts that the frontmatter description names the six pillars and the SvelteKit/Axum boundary, sweeps `datastar-retries-failed` and `.only_if_missing(`, and resolves every lifecycle step's owner archive on disk.
- `scripts/content-invariants.test.ts` pins each corrected claim.

The audit brief itself carried two false claims — a compile-time static byte total for Maud's `size_hint`, and a SHA-384-derived advisory lock for SQLx migrations. The archives already correct them and were not amended: the brief is not the authority, the corpus is.

## Consequences

- A consumer who follows the gateway archive now has an executable answer for over-budget admission instead of an unmapped error.
- A version-free archive cannot record what it is ahead of, so the fidelity gate carries the burden: a claim that regresses fails `bun scripts/verify-archives.ts`, and `scripts/gates.ts` runs it.
- The description assertion makes the routing surface a checked contract. Dropping a pillar or the negative boundary now fails the gate rather than silently widening the skill's triggers.
- The five-archive structure, the 250/300 line ceilings, the version-free provenance model, and `AGENTS.md` are unchanged.
