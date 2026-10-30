---
okf_version: "0.2"
type: WikiPage
title: agentic — Documentation Index
generated: { by: "agentic/0.1.0", at: 2026-10-30T00:00:00Z }
status: draft
stale_after: 2027-10-30
---

# agentic — Documentation

One command puts a rulebook and a curated skill library on a machine, and keeps them current. This index is the curriculum map: start at the tier that matches what you need to do.

## Start Here

| You want to | Read |
| --- | --- |
| Install it and see it work | [Getting started](01-getting-started.md) |
| Use it day to day | [Guides and workflows](02-guides-and-workflows.md) |
| Understand how it works | [Architecture and internals](03-architecture-and-internals.md) |
| Extend it, harden it, debug it | [Mastery and extension](04-mastery-and-extension.md) |

## The Four Tiers

**Beginner — [01-getting-started.md](01-getting-started.md)**
No assumed context. What the tool is for, the one command, where files land, and how to undo it.

**Practitioner — [02-guides-and-workflows.md](02-guides-and-workflows.md)**
The full command surface, adopting a machine that predates the ownership marker, rolling back, and adding a skill.

**Advanced — [03-architecture-and-internals.md](03-architecture-and-internals.md)**
Module responsibilities, the plan-then-execute pipeline, the ownership marker schema, the content digest, and exit codes.

**Master — [04-mastery-and-extension.md](04-mastery-and-extension.md)**
Extension points, the security model and its supply-chain consequence, a diagnostics matrix, and the invariants that must not be broken.

## Decision Records

- [0001 — Marker-based ownership](adr/0001-marker-based-ownership.md)
- [0002 — Purge then place](adr/0002-purge-then-place.md)

## Outside This Wiki

The rulebook that this package installs is `AGENTS.md` in the package root. It governs how an agent works; this wiki governs how the tool that delivers it behaves.
