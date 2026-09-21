---
type: Reference
title: Process
description: Detection first, design-system decisions, token persistence, knowledge lookups, and handoff.
generated: { by: agentic/1.0, at: 2026-09-21T00:00:00Z }
sources:
  - { id: ui-ux-pro-max, resource: references/design-skills/ui-ux-pro-max.md, license: absent-terms (procedure distilled and rewritten, attributed) }
  - { id: impeccable, resource: references/design-skills/impeccable.md, license: Apache-2.0 }
  - { id: frontend-design, resource: references/design-skills/frontend-design.md, license: absent-terms }
status: stable
---

# Process

The order of operations that keeps the work honest, whatever the stack.

## 1. Detect before you decide

Inspect the project before proposing anything visual: framework and rendering model, styling approach and where tokens live, any motion mechanism already present, the icon set in use, existing design system or brand assets, the build and test commands, and whether the app can be run and inspected.

**Never assume.** A hardcoded default silently misroutes every recommendation. If something material cannot be detected — the audience, or which of two surfaces is in scope — ask one question rather than choosing for the user.

## 2. Design system: adopt, extend, or build

- If the project already has a system or tokens, work inside it. Extending beats introducing a second one.
- If the brief names an established system, use its official implementation rather than recreating the look by hand — and do not import its tokens only to override most of them.
- **One system per project.** Mixing two in one surface is a defect, not a style.
- An aesthetic rather than a system usually has no official package: build it from the platform's own capabilities, and be honest in comments about what is borrowed inspiration versus official material.
- A system is a floor, not a direction: never ship its default state as the final design.

## 3. Persist the direction

Write the system down so the next session does not guess: a **master file** (palette with roles, type scale, spacing rhythm, motion rules, component conventions) plus **per-surface overrides** that win for that surface only. Read the master before writing anything, and read the override before touching that surface. Never regenerate or overwrite the master without explicit authorization — prior decisions, yours or a teammate's, outrank a fresh run.

## 4. Look things up, verify, then apply

Prefer the project's own sources: tokens, components, documentation, history. Query with one dominant intent and a few meaningful terms, not a paragraph. If a lookup returns nothing useful, retry once narrower; if it still returns nothing, say no verified match was found and label any general guidance as a fallback. **Never persist unverified output** — no invented palette, no unconfirmed token, no rule recalled from memory and presented as project convention. Retrieved guidance is a recommendation: the user, the brief, and the project's rules outrank it.

## 5. Verify in bounded passes

Build fully → inspect once in a single batch (desktop and mobile together on web; the shipped device classes elsewhere) → fix everything that batch showed in one pass → confirm with at most one further round → stop.

Open-ended polishing behind a working interface is waste: it burns budget doing worse what the final handoff does better. Screenshots beat prose — one image settles a debate paragraphs cannot. Aesthetic choices are arguable; accessibility, honesty, and performance are not.

## 6. Hand off

Report briefly, in this order: the **Design Read** (mode, subject, audience, job, dials); what changed and which dials drove it; findings fixed with severities; what remains open plus any assumption to confirm; and asset provenance with any license note for shipped media. Keep it short — the work is the deliverable, the report is the receipt.
