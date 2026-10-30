---
okf_version: "0.2"
type: WikiPage
title: Getting Started
tier: beginner
generated: { by: "agentic/0.1.0", at: 2026-10-30T00:00:00Z }
status: draft
stale_after: 2027-10-30
---

# Getting Started

## What This Tool Does

An AI coding agent follows a written rulebook. That rulebook lives in a hidden folder on your machine, and next to it sits a folder of skills — small, specialised instruction manuals the agent can load when a task matches.

Keeping those two things current by hand fails quietly. One host ends up with an old rulebook, a retired skill stays installed forever, and nobody notices until the agent behaves in a way you stopped asking for.

`agentic` fixes that with one command. It replaces the rulebook, removes the skills it owns, and installs the current versions of all of them. It touches nothing else.

## The Mental Model

Three ideas are enough to predict everything the tool does.

**The package is the source of truth.** Whatever skills the package contains is what your machine gets. There is no list inside the installer to fall out of date.

**Ownership is recorded, not inferred.** When the tool installs a skill it leaves a small file named `.agentic` inside that skill's folder. That file is the only proof that the tool owns the folder. No file, no ownership, no touching.

**Every run is a full reconciliation.** The tool does not compare versions or patch files. It deletes what it owns and writes it again. Running it twice leaves the same result as running it once.

## Your First Run

Requires [bun](https://bun.sh). From any directory:

```bash
bunx @meyverick/agentic
```

You will see a `rulebook` line for each host it wrote, then one `installed` line per skill, then a summary. A first run on a machine that already has skills in place stops instead, and that is correct — see the next section.

## What Landed On Your Machine

| Path | What it is |
| --- | --- |
| `~/.pi/agent/AGENTS.md` | The rulebook for the pi host |
| `~/.gemini/AGENTS.md` | The rulebook for the Gemini-family host |
| `~/.agents/skills/<name>/` | One folder per installed skill, each with a `.agentic` marker |
| `~/.agents/skills/<name>/.agentic` | Version and content digest recorded at install time |

`~/.agents/skills/` is shared with skills from other sources. Anything without a `.agentic` marker is left exactly as it was.

## The First-Run Collision

If a folder already occupies a name the package ships, the run aborts and names it. Nothing is written. This is deliberate: the tool will not silently take over a folder it cannot prove it owns.

Check what you are handing over, then give it permission once:

```bash
bunx @meyverick/agentic --force
```

From that point the marker exists, and later runs need no flag.

## Seeing Whether You Are Current

```bash
bunx @meyverick/agentic status
```

No drift means the rulebooks match the package and every installed skill matches the version shipped. Drift means something local changed or a newer package exists. `status` writes nothing.

## Undoing It

Install an older version. Because the tool reads its content from its own package, installing a previous version restores that version's rulebook and its exact skill set — including removing skills the older version never shipped.

```bash
bunx @meyverick/agentic@0.1.0
```

To stop using it entirely, delete the folders carrying a `.agentic` marker. Nothing else on your machine depends on them.

## Next

Day-to-day usage, adoptions, and rollback: [Guides and workflows](02-guides-and-workflows.md).
