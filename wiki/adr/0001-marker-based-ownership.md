---
okf_version: "0.2"
type: ArchitectureDecisionRecord
title: Marker-based ownership of installed skills
tier: master
generated: { by: "agentic/0.1.0", at: 2026-10-30T00:00:00Z }
status: draft
stale_after: 2027-10-30
---

# 0001 — Marker-based ownership of installed skills

## Status

Accepted.

## Context

The shared skills directory `~/.agents/skills/` holds skills from several sources. On the reference machine it held 29 directories: 17 from this package and 12 owned by an unrelated tool. The installer must update and retire its own skills while leaving the rest untouched, which means it must be able to answer "is this directory mine?" for any directory it finds, without asking the user.

Prior generations of this project answered that question with a manifest at the skills root listing what had been installed. That works until the manifest and the directory tree disagree, at which point a deletion is either too broad or too narrow, and no local evidence resolves it.

## Decision

Write a `.agentic` file into the root of every skill directory this package installs. Treat the presence of that file, and nothing else, as proof of ownership. Deletion iterates the skills root, checks for the marker, and deletes marked directories only.

The marker also carries the package version and a digest of the installed content, which is what makes drift detection possible without keeping a second copy of every skill on disk.

## Alternatives Considered

**A manifest at the skills root.** One file listing installed skill names. Rejected: a manifest can drift from the tree, and after drift there is no way to tell whether a directory is stale or foreign. It also puts a shared file in a directory owned by nobody, inviting concurrent writers from other tools.

**Frontmatter metadata in `SKILL.md`.** The skill format already allows a metadata block, and several skills carry an author field. Rejected: metadata is content. A user editing a skill could remove or change it, and reading 29 `SKILL.md` files to decide a deletion is more work and more fragile than one file existence check.

**Asking the user.** Rejected: an installer that prompts cannot run unattended or in a pipeline.

## Consequences

Ownership is decided by local evidence, so the installer works on a machine it has never seen, offline, in any order.

The marker must never ship inside the package. A committed marker would make a fresh clone self-deleting, so the repository gate fails when any `.agentic` file is tracked.

An unmarked directory occupying a shipped name is now a hard error rather than a silent takeover. That is the intended cost: the tool refuses to guess, and the user hands ownership over once with `--force`.

Migration from a manifest-era installation is a forced adoption. The old manifest is not read; the directories are claimed or refused by name.
