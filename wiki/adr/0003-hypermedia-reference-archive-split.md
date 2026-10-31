---
okf_version: "0.2"
type: ArchitectureDecisionRecord
title: Per-pillar reference archives for the hypermedia engine stack
tier: master
generated: { by: "agentic/0.6.0", at: 2026-10-31T00:00:00Z }
status: draft
stale_after: 2027-10-31
---

# 0003 — Per-pillar reference archives for the hypermedia engine stack

## Status

Accepted.

## Context

`skills/hypermedia-engine-stacks` shipped one syllabus and two mixed reference files. Three problems came with that shape.

First, the API surface was stale. The archives taught a nonexistent `ElementPatchMode::Morph` and an infallible `.into_sse_event()`, the pre-v1 `data-on-click` attribute, `sqlx-data.json` instead of `.sqlx/`, `data-ignore` as a canvas morph boundary, `PgListener::connect_with(&app_pool)`, and Bevy `EventReader`/`EventWriter` for data that is now a `Message`.

Second, two files fanned six pillars across unrelated concerns. A change to a Maud template loaded SQLx pool tuning and Bevy scheduling; a change to a stream budget loaded the whole template surface. That is the opposite of progressive disclosure and it is why the same defects survived review.

Third, the resilience half was absent. Nothing covered the open-stream budget, the graceful-drain client re-subscribe, `RecvError::Lagged` recovery, or the `cargo sqlx prepare --check` drift gate — the four failures that decide whether the stack survives production.

The five upstream pins below are the authority for every signature; the five deep research reports under `references/hypermedia-stack/references/reports/` are a subject index, not an API reference.

| Source | Pin | Version |
| --- | --- | --- |
| rama | `2fbd04041` | workspace `0.5.0`; `0.4.0` is the newest release |
| datastar | `1efcdc3c` | `1.0.4` |
| maud | `42f4789` | `v0.27.0-12` |
| sqlx | `e5cbd61a` | `v0.9.0-47` |
| bevy | `ae6152152` | `0.20.0-dev`; release `v0.20.1` is not an ancestor |

## Decision

Split the reference library into five single-pillar archives:

| Archive | Pillar | Ceiling |
| --- | --- | --- |
| `references/rama.md` | gateway, SSE, WSS, limits, CSRF, drain | 300 lines |
| `references/datastar.md` | client signals, actions, morphing, retry | 300 lines |
| `references/maud.md` | compile-time templates, escaping, JSON | 300 lines |
| `references/sqlx.md` | typed SQL, pools, migrations, notify fan-out | 300 lines |
| `references/bevy.md` | ECS, messages versus events, WASM, canvas | 300 lines |

The syllabus stays at 250 lines. `rama-ws` is documented inside `references/rama.md` as the transport half of the gateway, so five files cover six pillars. Both bridge files are removed, and the archive paths are a breaking change recorded in `CHANGELOG.md`.

Provenance has one digest and five pins: `SKILL.md` records the corpus-wide digest once and marks it local-corpus scoped, because it also folds the cargo-registry crates. Each archive opens with `Source: <repo>@<sha> · verified <date>` plus a `Re-verify when:` trigger, so a reviewer can check out the recorded pin and re-derive the claim when the corpus is absent.

Fidelity is enforced by `skills/hypermedia-engine-stacks/scripts/verify-archives.ts`: both ceilings, archive-link resolution, the provenance pair, the single digest, and a sweep for the retired tokens outside a migration table. Claim-to-pin fidelity stays inspection, because a correctness lane would need a claim registry that duplicates the archives it guards.

## One Status Table

The three statuses were previously spread across three documents with three rules. One table now owns them.

| State | Answer | Datastar consequence |
| --- | --- | --- |
| Draining, stream route | `410 Gone` (+ `Retry-After`, proxy-facing) | `datastar-fetch` error; `retry: 'auto'` does not retry a 4xx, so the client needs the re-anchor patch |
| Draining, command route | `503` + `Retry-After` | error event, no retry |
| Over stream budget | `503` + `Retry-After` | error event, no retry; same re-anchor patch |
| Stream ended on purpose | `410`, never `204` | `204` is terminal before both the retry gate and the error dispatch |
| Command accepted | `204 No Content` | command routes only |

## Retained and Retired Invariants

| Shipped invariant | Outcome |
| --- | --- |
| Zero-JS server runtime | carried |
| PostgreSQL compile-time lock-in | carried |
| Polling prohibition | carried |
| Hybrid simulation boundary | carried, sharpened to the `Message`/`Event` lane rule |
| `SharedArrayBuffer` prohibition | carried, with the bounded-queue replacement |
| Canvas morph boundary | rewritten from `data-ignore` to `data-ignore-morph` on canvas and container |

## Report Corrections

The archive authors apply a fixed precedence: pinned upstream source, then upstream ADR/protocol docs, then the deep-research reports. These report claims are retired and may not reappear: "Maud pre-calculates exact static byte totals" (the hint is the template source length), "`\u003c` sanitization is 0.27.0 behaviour" (it is unreleased and feature-gated), "`SceneRoot` is the canonical spawn" (`WorldAssetRoot`), "entropy needs a `getrandom_backend` cfg" (the 0.4 `wasm_js` crate feature), "`Populated<Q>` is read-only" (it is mutable), "RFC 7386" (RFC 7396 obsoletes it), and "Datastar honours `Retry-After`" (it reads only the SSE `retry:` field).

## Consequences

- A task loads one or two archives instead of the whole stack.
- Each pillar can be re-verified against its own pin without touching the others.
- The archive paths are a breaking change; every link must point at a pillar file.
- Markdown density and link integrity are skill-local, not a repository gate lane. A repository-wide link lane stays deferred until a second skill needs it.
