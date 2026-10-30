---
okf_version: "0.2"
type: WikiPage
title: Mastery and Extension
tier: master
generated: { by: "agentic/0.1.0", at: 2026-10-30T00:00:00Z }
status: draft
stale_after: 2027-10-30
---

# Mastery and Extension

## Invariants You Must Not Break

Four properties carry the whole design. Break one and the tool becomes unsafe rather than merely buggy.

**Ownership is proven by the marker, never inferred from a name.** Any deletion path that compares names against a shipped list reintroduces the failure this tool exists to prevent: deleting someone else's work because it happened to share a name.

**Pre-flight precedes the first mutation.** Purge-then-place cannot be rolled back from local state. An incomplete package that passes pre-flight deletes skills and installs nothing.

**The shipped set comes from the package, never from a list in source.** A hardcoded set silently diverges from what the package actually contains, and the divergence is invisible until someone reports a skill that never installed.

**The copied directory is replaced whole.** Patching files in place leaves retired reference files behind, which then get cited by an agent that no longer has the matching skill.

## Extension Points

**Adding a skill.** Create `skills/<name>/SKILL.md` with frontmatter `name: <name>` matching the directory. `references/`, `scripts/`, and `evals/` subdirectories ship with it. No installer change is needed, and the repository gate will fail if the frontmatter name does not match.

**Removing a skill.** Delete the directory. The next install removes it from every machine, because the installed copy carries the marker.

**Renaming a skill.** Delete the old directory and add the new one. A rename is not a special case: the old name disappears from the shipped set, so the next install purges it.

**Adding a host.** Host paths are a short list of rulebook destinations and one shared skills root. Adding a host is one path entry; the install order and marker rules are host-agnostic. Verify the new host actually reads that path before trusting it — one of the current targets is read by the IDE host rather than the CLI that shares its directory.

**Changing the digest algorithm.** The marker stores nothing but version and digest, and `status` recomputes the shipped digest on every run. Changing the algorithm invalidates every installed marker at once, so `status` would report drift on every skill until the next install rewrites them. That is acceptable; what is not acceptable is comparing a stored digest against a differently-computed one and calling it a match.

## The Security Model

The tool is small on purpose.

It has no third-party dependencies, no install-time lifecycle script, no network calls, and does not shell out. It reads its own package and writes to three fixed destinations under the home directory.

What it can do, and therefore what a compromise can do:

| Capability | Scope |
| --- | --- |
| Overwrite the rulebook | Both configured host paths; content comes from the installed package |
| Delete directories | Only those carrying a `.agentic` marker directly under the skills root |
| Copy directories | From the package into the skills root |
| Follow symlinks | No deletion follows a symlink; the link itself is removed |

The deletion scope is derived from `readdir` results, so a marker cannot name a path outside the skills root. A directory name is the only input, and it cannot contain a separator.

The real exposure is not the code, it is the channel. This package distributes instruction files that an agent will follow. Whoever can publish a version can change that instruction on every machine that installs it. Treat the registry account as production credentials: two-factor authentication on, staged publishing where available, and consumers who pin a version rather than tracking latest.

`AGENTIC_HOME` redirects every write. It exists so tests never touch a real home directory. Treat it as a test hook, not a feature.

## Diagnostics Matrix

| Observed | Likely cause | Action |
| --- | --- | --- |
| Skill present after install that is not in the package | Marker missing, so it was treated as foreign | `agentic install --force` after inspecting it |
| `ENOENT ... node_modules/skills` | Package-root discovery broken | The walk must find this package's own manifest, not a relative path |
| Installer runs an older version than expected | Package manager cache or a stale source reference | Re-run with an explicit version |
| `status` clean but behavior unchanged | The host reads a different path than the one written | Confirm which file the host loads |
| Everything reported `changed` after a digest change | Markers hold the previous algorithm | One `install` rewrites them |
| Gate fails on an untracked `.agentic` file | A marker was committed by mistake | Unstage it; markers are install-only |

## Cost Model

Installation is linear in the number of shipped files: one digest pass over the package, one directory copy per skill, and two rulebook writes. On the current set that is 81 files and roughly a megabyte, dominated by file-system calls rather than computation. There is no caching layer, and none is warranted — the command runs on update, not on every invocation.

`status` is the same linear pass plus one digest per installed skill. It is cheap enough to run in a pre-commit hook.

## Reviewing a Change to This Tool

Ask four questions, in this order.

1. Does any new code delete, move, or write outside `~/.agents/skills` and the two rulebook paths?
2. Can any new code run before pre-flight?
3. Does any path derive the shipped set from anything other than the package contents?
4. Does the change add a dependency, a lifecycle script, or a network call?

A "no" to the first three and a "no" to the fourth is the bar.
