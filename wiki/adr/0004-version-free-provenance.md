---
okf_version: "0.2"
type: ArchitectureDecisionRecord
title: Version-free syllabus with a machine-readable provenance lock
tier: master
generated: { by: "agentic/0.7.0", at: 2026-10-31T00:00:00Z }
status: draft
stale_after: 2027-10-31
---

# 0004 — Version-free syllabus with a machine-readable provenance lock

## Status

Accepted.

## Context

Two requirements collided. The catalog contract required the shipped skill to carry an in-file pin matrix, a `Source: <repo>@<sha>` header on every archive, and the corpus digest inside `SKILL.md`. The audit found those three artifacts going stale in three different directions: a release number dates a claim a reader cannot verify, a commit pin churns on every re-verification, and the corpus digest folds `~/.cargo/registry`, so it differs per machine even when the five repositories are identical.

A syllabus is loaded into an agent's context on every activation. A pin matrix is therefore both the most frequently read text in the skill and the most frequently wrong.

## Decision

The syllabus and its five archives are version-free: no release semver, no commit pin, no `Source:` header, and no `sha256:` digest. `skills/hypermedia-engine-stacks/scripts/provenance.lock` is the single machine-readable record — `schema`, one `digest`, and one entry per repository with `repo`, `commit`, and `verified`.

- Each archive keeps its `Re-verify when:` line. That is an invalidation condition, not a release number, and it is the part a reader can act on without opening the lock.
- Fenced code blocks are examples rather than claims, so a Cargo manifest inside one may carry a version. Prose and tables may not.
- `bun scripts/docs-corpus.ts --lock <path>` writes the five commits and the digest from the local corpus. It is repository-only: it needs the corpus, which is untracked workspace state.
- `verify-archives.ts` replaces its `provenance` and `digest` rules with `unpinned` and `lock`, and `scripts/gates.ts` invokes it, so archive drift fails the package gate instead of waiting for a manual run.

## Consequences

- A consumer who wants provenance reads `scripts/provenance.lock` rather than the syllabus. The lock ships in the package (`skills/` is in `files`), so it is available without the workspace.
- The pin matrix can no longer describe what each pin is *ahead of*. That nuance is now the archive's `Re-verify when:` trigger plus a release note, not a table row; the trade is a stale row for a stable condition.
- The digest stays local-corpus scoped. It records what the verifier saw, not a portable build input, so the commit pins remain the durable anchor. Refresh the corpus and the lock together when re-verifying.
- A version claim that reappears in prose or a table fails the package gate. A fenced example that carries one does not.
