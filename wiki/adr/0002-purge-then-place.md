---
okf_version: "0.2"
type: ArchitectureDecisionRecord
title: Purge then place, instead of reconciling a delta
tier: master
generated: { by: "agentic/0.1.0", at: 2026-10-30T00:00:00Z }
status: draft
stale_after: 2027-10-30
---

# 0002 — Purge then place, instead of reconciling a delta

## Status

Accepted.

## Context

Updating an installed skill set can be expressed as a delta ("what changed since last time?") or as a declaration ("here is the desired state"). The delta form needs a record of the previous state, and every field in that record can be wrong: partially written by an interrupted run, stale after a manual edit, or absent after a machine was set up by hand.

The installer's input is small: 17 directories, 81 files, about a megabyte. The run happens on update, not on every invocation.

## Decision

Every install deletes every directory carrying the ownership marker and then writes every shipped skill from the package. There is no comparison between installed and shipped sets, no resume logic, and no state file.

Order is fixed and load-bearing: rulebook first, purge second, placement third.

## Alternatives Considered

**Reconcile by name set.** Compute shipped minus installed, installed minus shipped, and act on the differences. Rejected: it needs the marker to answer ownership anyway, and then adds a second surface — renames, half-installed skills, files retired from inside a still-present directory — each of which has to be reasoned about separately. Purge-then-place answers all of them with one rule.

**Three-way comparison against a stored copy of the last shipped version.** Rejected: keeping a shadow copy of every skill doubles the on-disk footprint and adds a cache that can itself drift. It buys the ability to preserve local edits, which is not a goal — a managed directory is managed.

**Atomic staging and swap.** Write the new set into a temporary directory and swap it in. Rejected as unnecessary: because the operation is convergent, an interrupted run is repaired by re-running. Staging would only matter if a post-purge step were non-repeatable, such as a network fetch or a database write.

## Consequences

Convergence becomes trivial to state and to test: any interrupted run, re-run to completion, produces a tree identical to an uninterrupted run. The test suite asserts exactly that by deleting the skill set after a successful install and installing again.

Every run rewrites the full set, with a brief window where owned skills are absent. At update cadence this is irrelevant; a long-running agent process that reads skill files lazily could observe the gap.

Local edits inside a managed skill are lost by design. `status` reports them first, so the loss is visible rather than silent.

Pre-flight becomes mandatory rather than defensive. A package that is incomplete but still installable would purge a machine and have nothing to place, and no local state would recover it. That is why validation of package contents precedes the first write.
