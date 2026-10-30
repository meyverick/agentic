---
okf_version: "0.2"
type: WikiPage
title: Architecture and Internals
tier: advanced
generated: { by: "agentic/0.1.0", at: 2026-10-30T00:00:00Z }
status: draft
stale_after: 2027-10-30
---

# Architecture and Internals

## Package Layout

```bash
agentic/
  package.json        bin: src/cli.ts, files: src, skills, AGENTS.md
  AGENTS.md           the rulebook that gets installed
  skills/             one directory per shipped skill
  src/
    cli.ts            argument parsing, dispatch, exit codes
    pkg.ts            package-root discovery, shipped-set enumeration
    install.ts        pre-flight, plan, execute, marker I/O
    status.ts         drift report
    tree.ts           content digest, directory copy
```

The published artifact is the source: bun runs `src/cli.ts` directly from the shebang, so there is no build output to drift.

## Why the Package Root Is Discovered, Not Assumed

`import.meta.dir` is the directory of the running file, not the package root. A relative guess such as `../skills` resolves to the consumer's `node_modules/skills` and fails. The loader walks upward until it finds a `package.json` whose `name` is this package, which makes the lookup independent of whether the bin sits at `cli.ts` or `src/cli.ts`.

## The Pipeline

```bash
pre-flight        rulebook present and non-empty, at least one skill with SKILL.md
   |
plan              read markers -> purge list
                  shipped set  -> place list
                  unmarked names -> collision list
   |
guard             collisions and no --force -> exit 1, nothing touched
   |
execute           šíp 1. rulebooks written
                  2. marked directories deleted
                  3. shipped directories copied and stamped
```

Each stage reads only what the previous stage produced, and the order is what makes an interrupted run recoverable: a rerun reaches the same state as an uninterrupted one, with no resume logic and no state file.

## The Marker

```bash
{
  "version": "0.1.0",
  "treeHash": "9f2c...e41"
}
```

`treeHash` is a sha256 over the skill directory: for every file in sorted relative-path order, the path, a separator, the file bytes, and another separator. The marker file itself is excluded from the digest, so the digest of the installed copy can be compared against the digest of the shipped copy without excluding anything at call time.

That single field is what lets `status` answer "was this edited locally?" without keeping a second copy of every skill on disk.

## Ownership Resolution

```bash
for each directory under ~/.agents/skills:
    marker present  -> owned: delete on every install, re-place if shipped
    marker absent   -> foreign: never modified, except an abort when its
                       name is shipped
```

There is no name comparison against a shipped list anywhere in the deletion path. The marker is the whole answer.

## Pre-Flight

Before the first write, the run asserts that the packaged rulebook exists and is non-empty, that the shipped skill set is non-empty, and that every shipped directory contains a `SKILL.md`. This matters because purge-then-place is not reversible from local state: an incomplete package that passed pre-flight would delete a machine's skills and have nothing to put back.

## Exit Codes

| Code | Meaning |
| --- | --- |
| `0` | Success, or `status` found no drift, or a dry run completed |
| `1` | Refused collision, or `status` found drift |
| `2` | Unknown flag, unknown command, or too many arguments |

## Test Strategy

Every test runs against a temporary home and a fixture package, so the real `~/.agents/skills` is never an input. The properties asserted are the ones the design depends on: purge spares unmarked directories, placement removes stale files, collisions mutate nothing, and an interrupted run converges.

## Next

Extension points, the security model, and the invariants: [Mastery and extension](04-mastery-and-extension.md).
