---
name: openspec-harden
description: >
  Harden an existing OpenSpec change for cold application by a fresh agent.
  Use when you have just run /opsx-propose and want to enrich the proposal,
  specs, design, and tasks with concrete file paths, code blocks, verify steps,
  and grounded codebase context before handing to a cold agent for /opsx-apply.
  Do NOT use when implementing changes (use openspec-apply-change), creating a
  new change from scratch, or when no change exists yet.
allowed-tools: Bash(openspec:*), Read, Grep
license: MIT
compatibility: Requires openspec CLI and ripgrep.
metadata:
  author: agentic
  version: "1.0.0"
positive_triggers:
  - "harden proposal for cold apply"
  - "improve change for fresh agent"
  - "enrich specs and tasks with file paths"
anti_triggers:
  - "implement changes from tasks or apply change"
  - "implement the change and edit project code"
  - "create a new change from scratch"
---

# Openspec Proposal Improve

Enrich an existing change in place so a cold agent with no conversation memory can apply it correctly.

**Planning boundary:** This skill operates in planning-only mode. Do NOT edit project code — only files under `openspec/changes/<name>/`. Proposal Why/What Changes are append-only: preserve original intent verbatim and mark any inferred addition as `Assumption:` or `Inferred:`.

## Cold-Readiness Checklist (gate)

All must pass or be explicitly marked `Needs human decision: <question>` before claiming hardening complete:

- [ ] Every task has concrete file path (`path/to/file.ts:line` or `new file to create`) + exact shell command where applicable + `Verify:` clause (command, grep, or observable)
- [ ] Every spec scenario is testable, has concrete example values, and includes at least one error/edge case
- [ ] Design lists integration points grounded via codebase search as `file:line` refs
- [ ] Design has rollback plan (or `Rollback: N/A — docs only` if truly no code)
- [ ] No vague tasks remain ("update auth system" → must be split)
- [ ] No untestable scenario remains ("works correctly" → must have WHEN/THEN with values)
- [ ] Proposal Why/What Changes preserve original intent (no rewriting, only appending with Assumption/Inferred tags)

If any item fails and cannot be inferred from codebase, pause and emit `Needs human decision: <question>` — do not hallucinate.

Idempotent re-run: Running the skill twice on an already-hardened change without intervening edits SHALL produce no further artifact changes (idempotent).

## Workflow — 6 Steps

### Step 1: Load

- Resolve store (if any):
  ```bash
  openspec store list --json
  ```
  If a store is selected (explicit user selection, or project `store:` pointer, or global `defaultStore`), treat `--store <id>` as sticky on every openspec command below. All examples without the flag are shorthand — append the flag before running.
- Load change:
  ```bash
  openspec status --change "<name>" --json
  ```
  Parse `planningHome`, `changeRoot`, `artifactPaths`, `actionContext`. Use `artifactPaths` as the only source of artifact file paths — do not guess.
- Read every file in `artifactPaths` (proposal, specs, design, tasks) from disk. Re-read even if seen before (user may have edited).

### Step 2: Ground

- Use `Grep` (ripgrep) to discover integration points: spec names, file paths, callers, schema files, tests, existing patterns. Example:
  ```bash
  Grep pattern="auth.*middleware" path="src"
  Grep pattern="Requirement:" path="openspec/specs"
  ```
- Use `Read` to verify every candidate file path exists. If a path does not exist, mark task as `new file to create` — do not invent a path that fails `Grep`.
- Record all inferred additions as `Assumption:` or `Inferred:` in the enriched artifact. Inferred file paths must be verified by `Grep`/`Read` or explicitly marked as new.

Requires `Bash(openspec:*)` for status/instructions/validate and `Grep` for grounding. Every added path must be verified or marked new.

### Step 3: Audit

Compare loaded artifacts against the Cold-Readiness Checklist above. Build a gap list per artifact:
- `proposal.md`: missing constraints, edge cases, out-of-scope, dependencies, rollback
- `specs/**/spec.md`: vague scenarios, missing examples, missing error cases, untestable WHEN/THEN
- `design.md`: missing file:line integration points, missing sequence/data-flow, missing rollback, missing ASCII diagram for cross-file flows
- `tasks.md`: vague tasks, missing file:line, missing command, missing Verify, unordered dependencies

If gap requires human decision (material ambiguity on scope/behavior/compatibility), prepare `Needs human decision: <question>` and pause per guardrails.

### Step 4: Enrich

Apply per-artifact rules, grounded in Step 2:

- **proposal.md**: append only. Add `Assumption:`/`Inferred:` sections for missing constraints, edge cases (`Edge cases: ...`), out-of-scope (`Out-of-scope: ...`), dependencies (`Depends on: ...` with file paths). Never rewrite Why.
- **specs/**/spec.md**: make scenarios concrete: add example payloads/code blocks, add error case scenario per requirement, ensure 4-hash `#### Scenario` format. Preserve existing scenarios; add, don't replace.
- **design.md**: add `Integration points:` list as `file:line` refs from Ground step, add `Sequence:` or ASCII diagram if cross-file, add `Rollback:` plan. Keep existing Decisions.
- **tasks.md**: split vague tasks into ordered small tasks (one file per task where possible) with `file:line`, exact command (`bun run check`, `cargo test`, etc.), and `Verify:` clause. Order topologically; note `requires X.Y` where needed.

Rules: Do NOT edit project code — only `openspec/changes/<name>/`. Preserve original intent — proposal Why/What Changes are append-only.

### Step 5: Validate

- Re-run:
  ```bash
  openspec status --change "<name>" --json
  openspec validate --change "<name>"  # or openspec validate --specs if needed
  ```
  With store flag if applicable (sticky).
- Re-evaluate Cold-Readiness Checklist. If any item still fails, loop to Enrich or pause for human decision.
- Verify idempotent re-run: second run without edits should be no-op.
- Verify idempotence note: second run without edits should be no-op.

### Step 6: Summarize

Display:
- Change name and store used
- What was enriched per artifact (bullets) vs what was already cold-ready
- Any `Assumption:`/`Inferred:` added and any `Needs human decision:` still open
- Checklist result (pass/fail per item) and `openspec validate` result
- Next: `Agent 2 (cold) can now run /opsx-apply <name>` or `openspec-apply-change`

## Store Handling

Mirror `openspec-propose`/`openspec-apply-change`: discover via `openspec store list --json`, pass `--store <id>` on every openspec command that accepts it, keep sticky. Hints printed by commands already carry the flag; keep it on follow-ups. Without a store, act on nearest local `openspec/` root.

## Guardrails

- Read-only commands and file reads (`Read`, `Grep`, `Bash(openspec status/instructions)`) need no confirmation.
- Keep the planning boundary: Do NOT edit project code. Only `openspec/changes/<name>/` is writable.
- Preserve original intent: proposal.md Why/What Changes are append-only. Never rewrite author's Why.
- Ground every added path with `Grep`/`Read` or mark `new file to create`. Do not hallucinate file paths.
- Never copy `<context>`/`<rules>` verbatim into artifacts — apply as constraints.
- Pause on material ambiguity — do not absorb scope silently.

## Reference

- Direct triggering: harnesses invoke this skill directly via `/openspec-harden <change-name>` (no prompt shim needed).
- Install: `project/install.ts` copies `project/skills/*` → `.agents/skills/` atomically — no manual wiring needed.

## Related Skills

Complements `openspec-learn` (proposal generation) and `openspec-report` (report meditation) — this skill hardens proposals for cold apply, while those create and reflect.
