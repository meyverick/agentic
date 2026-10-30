> *Architected and directed by Human Intelligence, **implemented by AI**.*

# Codebase Submodule

This directory is the single codebase submodule (Tier 2) containing the consumer rulebook, the agent skill library, and the installer that reconciles both onto a machine.

## Command Surface

The package is invoked as `agentic` from the published artifact. A bare invocation installs.

| Command | Effect |
| --- | --- |
| `agentic` | Install or update: replace the host rulebooks, delete every skill carrying the ownership marker, place every shipped skill, then stamp the marker. |
| `agentic install --force` | Same run, but replace unmarked directories that occupy a shipped skill name. Required once on a machine that predates the marker. |
| `agentic install --dry-run` | Report the rulebook paths and the skills that would be added, replaced, or deleted, and change nothing. |
| `agentic status` | Report the installed version, marked skills that are no longer shipped, shipped skills that are missing or differ from shipped content, and diverging host rulebooks. Exits non-zero when drift exists. |

Host rulebooks are written to `~/.pi/agent/AGENTS.md` and `~/.gemini/AGENTS.md`. Skills are written to `~/.agents/skills/<name>/`.

## Ownership Marker

`~/.agents/skills/` is shared with skills owned by other sources. A `.agentic` file at a skill directory's root is the only record that this package owns that directory, and it is the only input to the deletion rule: marked directories are deleted and re-placed on every run, unmarked directories are never touched.

The marker is written by the installer, never committed here, and its presence in the repository is a gate failure. Rolling back is installing a pinned earlier version, which restores that version's rulebook and skill set exactly.

## Execution Context

All build, test, lint, and packaging commands execute with working directory strictly inside this module.

## Pre-Push Verification

This module provides `./scripts/check.sh` implementing the native verification lane: unit tests, credential and asset tracking, the package gate (untracked markers, skill frontmatter names, packed artifact contents), a hermetic clean-clone sandbox, and a runtime smoke check.
