---
name: design-craft
description: >
  Craft intentional interface design on any stack: set a direction, then build, review,
  polish, or animate. Use when starting UI work, when a design looks templated or bland,
  when reviewing a page or component for UX, accessibility, motion, or performance
  quality, or when asked to make something feel more premium or calmer. Do NOT use when
  the task is backend, API, database, or infrastructure work; when writing pure
  documentation; or when choosing between rendering technologies, which is a stack
  decision owned by the project.
allowed-tools: Bash(*)
license: MIT
compatibility: No runtime or network requirement; references ship with the skill.
metadata:
  author: agentic
  version: "1.1.0"
positive_triggers:
  - "design or redesign a page, screen, or component"
  - "make this interface look less templated"
  - "review my UI for UX, accessibility, or motion quality"
  - "polish, clarify, or animate this interface"
anti_triggers:
  - "backend, API, database, or infrastructure work"
  - "choose between rendering technologies"
  - "write documentation, a README, or non-visual copy"
---

# Design Craft

A syllabus for interface work on any stack. Read the outline, then open only the reference a module points to.

## 1. Activation Boundary

**Triggers on:** designing or redesigning a page, screen, component, or flow; a design that reads as templated, bland, or loud; reviewing an interface for UX, accessibility, motion, or performance; polishing, clarifying, or animating an existing surface.

**Does not trigger on:** backend, API, database, or infrastructure work; pure documentation; choosing a renderer or framework (delegate to the project's own rules); non-visual performance work.

**Scope:** procedure, not data — no shipped palettes, styles, or font tables. **Non-goals:** no live browser loop, no PRODUCT.md/DESIGN.md persistence, no hooks/doctor.

## 2. Design Read — the gate

Before the first UI edit, emit one line:

`Design Read: <mode> · <subject> · <audience> · <job> · dials v/m/d = x/y/z`

- **Build** — new surface or a new visual direction; **Review** — findings only; **Polish** — same identity, better craft; **Motion** — decide and build motion.
- The Design Read is a commitment: if later work contradicts it, say so and revise it explicitly rather than drifting.

## 3. The Brief Wins

- An explicit brief — aesthetic, era, material, palette, typeface, brand, or a supplied reference — outranks generic taste and every anti-slop rule below outside the brief-proof set. Follow it exactly.
- **Brief-proof set:** a brief, pinned reference, or brand mandate cannot earn past the non-negotiables (§5), layout-affecting animation, or the contrast minimums (body/placeholder ≥4.5:1, large text ≥3:1). A brief does earn refusal-list defaults and other floor values; a departure under it names the brief clause that earns it.
- **Refine preserves, redesign replaces.** Refinement keeps identity, behaviour, copy, and everything outside scope. Redesign keeps product truth and function, treats the old look as anti-reference, and replaces it wholesale — never polish a discarded direction.
- When the brief is silent on an axis, decide and state why. Never spend that freedom on a default.
- Ask exactly one question when product, audience, or job is unknown. Otherwise, decide.

## 4. Three Dials

Set three 1–10 values in the Design Read; they bound every later choice:

| Dial | 1–3 | 4–7 | 8–10 |
| --- | --- | --- | --- |
| variance | centred, minimal | balanced, modern | asymmetric, expressive |
| motion | micro-feedback only | standard reveals | choreographed sequences |
| density | airy (24–96px rhythm) | standard (16–64px) | dense (8–32px) |

Presets: operate/dashboard 2·1·8 · marketing/persuade 7·5·3 · read/docs 3·2·5 · experience/portfolio 9·8·2. Presets are starting points, not verdicts.

## 5. Non-negotiables — every mode

- Visible keyboard focus; never remove an outline without an equal replacement.
- Contrast: body text meets AA; hero and primary CTA target AAA.
- Semantic structure first (landmarks, ordered headings, real labels); ARIA only to fill a real gap.
- `prefers-reduced-motion` is honoured by rendering final states, not by merely shortening.
- Motion stays on compositor-friendly properties (palette scoped in `references/motion-craft.md` §8); layout-affecting animation is a defect.
- Theme parity: whatever modes the project ships, hierarchy and brand read the same in each.
- Asset honesty: references give traits — never reuse, trace, or closely reproduce assets, identity, or copy. No invented proof, logos, or testimonials.
- Honest claims: "premium", "cinematic", or "award-caliber" describe a bar, never a recognition.
- Offline-complete: no network call is required for the work to finish.

## 6. Anti-slop — contrast and anti-examples

| Old habit (default) | Better habit (choice) |
| --- | --- |
| viewport-height hero | content-height hero with the CTA inside the first viewport |
| every section fades in | one orchestrated entrance; the rest hold still |
| one card shape repeated | composition varies with content weight |
| animation everywhere | motion only where it explains a change |
| accent colour on one headline word | one deliberate type treatment for the whole page |
| gradient text on a headline or stat | weight or size carries the emphasis instead |
| glass default — glass panels and outer glow as the finish | one deliberate use with a solid fallback |
| hero-metric template (big number, small label, stats, accent) as the hero | composition grounded in the subject instead |

Eyebrow rationale: the rule is a ration — at most one small label per three sections, including the hero, or none. Impeccable bans eyebrows outright; this skill ships no edit-time hook, so the ration is the checkable form.

Anti-examples:

- `Do NOT: enter from scale(0)` → `Do: fade and translate from the element's real origin`
- `Do NOT: strip focus outlines for looks` → `Do: a visible focus indicator on every interactive element`
- `Do NOT: invent a logo wall or testimonials` → `Do: omit proof that cannot be sourced`
- `Do NOT: a generic "Something went wrong"` → `Do: name what failed and the next step`
- `Do NOT: an uppercase tracked eyebrow above every heading` → `Do: at most one small label per three sections, or none`

The full named list with fixes is in `references/anti-slop-patterns.md`.

## 7. Review contract

Report findings only, ordered by severity, one line each:

`<severity> · <file>:<line> · <rule violated> · <fix>`

- **blocker** — broken, inaccessible, or dishonest; **major** — hierarchy, contrast, motion, or performance; **minor** — polish.
- No prose essays, no restating the page, no praise padding: evidence, then fix.
- Do not modify the target unless the user asks for fixes.

## 8. Verification — bounded

Build fully → inspect once in one batch (desktop and mobile together on web; the shipped device classes elsewhere) → fix that batch in one pass → confirm with at most one more round → stop.

- Never open a third round; never polish without a finding.
- Check keyboard, focus, reduced motion, and every shipped theme before declaring done.
- Report the Design Read, the dials, the findings fixed, and anything left open.

## References

Open only what the current module needs:

- `references/art-direction.md` — brief reading, subject-matter grounding, surface intent, hero composition, asset honesty.
- `references/design-engineering.md` — type, colour, layout, materiality, states, forms and data, density, theme protocol.
- `references/motion-craft.md` — whether to animate, easing, duration, springs, transform and clip-path technique, gestures, performance, debugging.
- `references/anti-slop-patterns.md` — the named patterns and their fixes.
- `references/review-checklist.md` — review method plus the vendored Web Interface Guidelines digest (dated; live refresh optional).
- `references/process.md` — detection first, design-system decision, token persistence, bounded verification, handoff.

**Optional neighbours:** renderer and stack choice belong to the project — if `AGENTS.md` exists, its stack matrix wins. For secrets, HTML sinks, and auth surfaces, load `guardrails` when installed.

## Gotchas

- The Design Read precedes code. A redesign that keeps the old look has failed.
- Detect before import: check the manifest, then propose a dependency explicitly — never assume it exists.
- Read references on demand; loading all six wastes the budget they exist to protect.
- Dials are commitments: changing one mid-build means re-deciding, not nudging.
