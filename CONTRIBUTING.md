# Contributing

Thanks for looking. This is a small project with a narrow contract, so most useful contributions are small too.

## Reporting a Problem

Open an issue with three things: what you ran, what you expected, and what happened. If the output is relevant, include it — the installer prints one line per action and those lines are usually enough to identify the cause.

Do not paste secrets, tokens, or the contents of your private rulebook. Paths that reveal your username are fine once; the tool's output is not sensitive by design.

## The Kind of Change Most Likely to Be Accepted

| Kind | Welcome |
| --- | --- |
| A wrong sentence in the documentation | Yes, directly |
| A failing case the tests do not cover | Yes, with the test |
| A new skill directory | Yes, if its frontmatter name matches its directory |
| A new host to install the rulebook into | Yes, with evidence that the host reads that path |
| A dependency, a build step, or a lifecycle script | Not without a discussion first |

The last row is deliberate. The tool's entire safety argument rests on being small: no third-party packages, no install-time scripts, no network calls. A change that adds one of those needs to justify why the existing approach cannot work.

## Working Locally

Clone the repository, then run the gate. The quick lane is the inner loop and finishes in well under a second.

```bash
git clone https://github.com/meyverick/agentic.git
cd agentic
bun scripts/check.ts --quick
```

The full lane adds the funding-link check and the clean-clone sandbox:

```bash
bun scripts/check.ts
```

Both lanes must pass before a pull request is ready. The gate is the contract, not a formality — if it fails, the change is not done.

## Changing a Skill

Each skill is a directory under `skills/` containing a `SKILL.md`. Its frontmatter `name` must equal the directory name; the gate fails otherwise.

- Adding a directory ships it on the next release with no installer change.
- Removing a directory stops shipping it, and the next install removes it from every machine that had it.
- Renaming is a removal plus an addition. There is no in-place rename path.

## Changing the Installer

Read [the mastery page](wiki/04-mastery-and-extension.md) first. Four properties carry the design: ownership is proven by a marker rather than inferred from a name, pre-flight precedes the first mutation, the shipped set comes from the package rather than a list in source, and a directory is replaced whole rather than patched.

A change that weakens one of those needs to say so explicitly in its description.

## How Releases Happen

Version, changelog, gate, publish, verify. Verification resolves the published version and asks it for its own identity, because a publish command can report success while the registry holds something else.

## Supporting the Project

The project is funded through [thanks.dev](https://thanks.dev/u/gh/meyverick). The full dependency ledger, with each upstream funding page, is in [DEPENDENCIES.md](DEPENDENCIES.md) — it is generated from the package manifests and should never be edited by hand.

## Making the Repository Public

This repository is published deliberately, and the process is short but ordered:

1. Confirm the full gate passes, including the funding-link check.
2. Set the repository visibility to public.
3. Synchronize the wiki from the repository root. The script enables the GitHub Wiki, derives the home page and sidebar from the local index, and pushes every tracked page:

   ```bash
   bun skills/okf-docs/scripts/sync-wiki.ts .
   ```

   It refuses to act while the repository is private, so running it early is harmless — it exits successfully with a `SKIP` line.

4. Verify the wiki renders and that both the landing page and the dependency ledger are reachable.

Steps two to four are intentionally manual. Nothing in the automated gate flips repository visibility.
