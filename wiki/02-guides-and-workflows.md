---
okf_version: "0.2"
type: WikiPage
title: Guides and Workflows
tier: practitioner
generated: { by: "agentic/0.1.0", at: 2026-10-30T00:00:00Z }
status: draft
stale_after: 2027-10-30
---

# Guides and Workflows

## The Command Surface

| Command | Effect |
| --- | --- |
| `agentic` | Install or update: replace the host rulebooks, delete every skill carrying the ownership marker, place every shipped skill, then stamp the marker. Identical to `agentic install`. |
| `agentic install --force` | Same run, but replace unmarked directories that occupy a shipped skill name. |
| `agentic install --dry-run` | Report the rulebook paths and the skills that would be added, replaced, or deleted. Writes nothing. |
| `agentic status` | Report installed version, marked skills that are no longer shipped, shipped skills that are missing or differ, and diverging host rulebooks. Exits non-zero on drift. |
| `agentic --version` | Print the package version, which is also the version stamped into every marker. |
| `agentic --help` | Print the command surface. |

Every command is safe to run repeatedly. `install` converges; `status` and `--dry-run` never write.

## Reading the Output

An install prints one line per action, then a summary.

```bash
rulebook   /home/you/.pi/agent/AGENTS.md
rulebook   /home/you/.gemini/AGENTS.md
installed  check
installed  guardrails
done: 17 skills, 2 rulebooks
```

A dry run prints the same plan with `add`, `replace` and `delete` verbs, then `dry run: nothing written`.

A colliding run prints the paths and stops:

```bash
collision  /home/you/.agents/skills/check
refusing to replace unmarked directories; rerun with --force to hand ownership over
```

## Adopting a Machine That Predates the Marker

Newer versions of this tool record ownership with a `.agentic` file. A machine set up by an older version, or by hand, has the right folders but no markers.

1. `agentic install --dry-run` and read the `collision` lines. Each one is a folder the tool would take over.
2. Compare a couple of them against what you expect. Anything you genuinely authored belongs somewhere else.
3. `agentic install --force` once.
4. `agentic status` should report no drift.

After that first forced run, markers exist and later runs need no flag.

## Rolling Back

```bash
bunx @meyverick/agentic@0.1.0
```

Because the installer derives its content from its own package, installing an older version restores that version's rulebook and its exact skill set. This is the only rollback mechanism, and it is sufficient: the registry keeps every published version.

## Checking Drift

`status` exits `1` when anything differs from the package, so it works as a pre-commit or CI assertion:

```bash
agentic status
```

Exit codes: `0` clean, `1` drift or refused collision, `2` bad usage.

## Changing a Skill

Skills live in `skills/<name>/` inside the package. Each directory needs a `SKILL.md` whose frontmatter `name` equals the directory name — the repository gate fails otherwise.

```bash
skills/
  check/
    SKILL.md            name: check
    references/
    scripts/
```

Adding a directory ships it on the next release with no change to the installer. Removing a directory stops shipping it, and the next install deletes it from every machine because its marker says the tool owns it.

## Keeping the Rulebook Current

The rulebook is `AGENTS.md` at the package root. It is installed verbatim to both host paths. Editing it is a normal source change; the next install replaces both copies.

## Troubleshooting

| Symptom | Cause | Fix |
| --- | --- | --- |
| `refusing to replace unmarked directories` | A folder occupies a shipped name and has no marker | Inspect it, then rerun with `--force` |
| `packaged rulebook missing or empty` | The package is incomplete | Do not force anything; install a known-good version |
| `no shipped skills found` | The package's `skills/` directory is empty or unreadable | Same as above |
| `status` reports `changed <skill>` | The installed copy was edited locally | Run `install` to restore it |
| `status` reports `orphan <skill>` | A marked skill is no longer shipped | Run `install` to remove it |
| Install runs an old version | A stale package cache | Re-run with an explicit version, or clear the package manager cache |

## Next

How the pieces fit and why the ordering matters: [Architecture and internals](03-architecture-and-internals.md).
