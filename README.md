> *Architected and directed by Human Intelligence, **implemented by AI**.*

# agentic

**agentic keeps the written instructions your AI assistant follows identical on every machine you work on — with a single command.**

## Why It Matters

An AI coding assistant is only as good as the instructions it was given, and those instructions live in files tucked away in your home directory. They drift. One laptop has the rulebook from three months ago, another has a skill that was retired last week, and a third has the right files but no record of where they came from. Nothing announces the drift; you simply notice that the assistant behaves differently on different machines and cannot say why.

agentic turns that quiet mess into one deliberate act. Run it and every machine agrees again. Run it after a change and the new instructions are everywhere, with nothing left over from before.

## What It Does For You

- **One command, no bookkeeping.** It replaces the rulebook and reinstalls the whole skill library. There is no version comparison to read and no patch to apply.
- **It only touches what it owns.** Skills installed by anything else are left exactly where they are, because ownership is proven by a small marker file rather than assumed from a name.
- **It tells you when you have drifted.** A status check reports rulebooks that no longer match, skills that were edited locally, and skills that are no longer part of the library.
- **Undoing an update is dull on purpose.** Install a previous version and that version's rulebook and skill set come back exactly, including the removal of anything newer.
- **Starts a new project on the right footing.** One command scaffolds the two tiers a project needs — the orchestration repository with its documentation and reference library, and the code repository wired to it as a submodule, each with a gate.
- **Two skill sets, one command.** It installs its own skills and, alongside them, the OpenSpec workflow skills — keeping each set separate so neither can overwrite the other.
- **Nothing is hidden.** No background service, no hidden dependency, no scripts running behind your back; the one step that reaches the network is announced, and can be switched off.

## Who This Is For

**People who work on several machines.** The same instructions follow you between them without a sync tool, a dotfiles repository to maintain by hand, or a checklist you will forget.

**People who maintain instructions for others.** Publish once, and everyone who installs gets the same rulebook and the same skills, with retired material actually retired instead of lingering.

**People who want an assistant they can reason about.** If you have ever wondered which version of your instructions a machine was really using, this tool makes that question answerable in one command.

## Explore the Documentation

The full documentation lives in the [wiki](wiki/index.md), organised from first steps to internals:

- [Getting started](wiki/01-getting-started.md) — install it, see it work, understand what landed where.
- [Guides and workflows](wiki/02-guides-and-workflows.md) — daily use, adoption, rollback, and changing a skill.
- [Architecture and internals](wiki/03-architecture-and-internals.md) — how the pieces fit and why the ordering matters.
- [Mastery and extension](wiki/04-mastery-and-extension.md) — extension points, the security model, and diagnostics.

## Support the Tools That Make This Possible

This project is funded through [thanks.dev](https://thanks.dev/u/gh/meyverick) — the same link that keeps the tools it depends on alive. See [CONTRIBUTING.md](CONTRIBUTING.md) for how to report a problem, propose a change, or support the project, and [DEPENDENCIES.md](DEPENDENCIES.md) for the full dependency ledger with each upstream funding page.
