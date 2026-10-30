---
type: Reference
title: Art Direction
description: Reading the brief, grounding the work in its subject, composing the hero, and keeping assets honest.
generated: { by: agentic/1.0, at: 2026-09-21T00:00:00Z }
sources:
  - { id: frontend-design, resource: references/design-skills/frontend-design.md, license: absent-terms (ideas distilled and rewritten, attributed) }
  - { id: awwwards, resource: references/design-skills/build-awwwards-quality-sites.md, license: absent-terms }
  - { id: impeccable, resource: references/design-skills/impeccable.md, license: Apache-2.0 }
status: stable
---

# Art Direction

One visual thesis, executed consistently. Direction is decided before code, stated in one line, and held.

## 1. Read the brief

Extract before designing: **subject**, **audience**, **job** (what the surface must accomplish), **tone**, **constraints** (brand, era, material, palette, typeface, supplied references), and anything the client explicitly rejected.

- The brief's own words outrank taste, trends, and every anti-slop rule.
- Where the brief is silent, decide — and say why. Free axes are where defaults sneak in.
- Ask exactly one question when subject, audience, or job is unknown. Never invent all three.

## 2. Ground in the subject, not the category

Distinctive work comes from the subject's own world: its industry, materials, vocabulary, tools, and history. A page about children's toys and a page about financial analysis should share no visual DNA.

Reject the category reflex — the look any competent page in this field would have. If the first idea works for a competitor too, it is not yet a direction.

## 3. Name the surface intent

What does success look like for the visitor here? It changes what the design optimizes:

| Intent | Visitor's success | Design priority |
| --- | --- | --- |
| Persuade | decides and acts | attention, argument, one clear next step |
| Operate | completes a task | scanability, consistency, predictable states |
| Read | understands something | structure, measure, comfortable rhythm |
| Experience | is inside the work | the artifact leads; interface recedes |

Intent is chosen per surface, not per product: a tool's marketing page is still Persuade; a brand's documentation is still Read.

## 4. Write the direction before the first edit

A compact plan with five lines — it becomes the Design Read:

1. **Visual thesis** — the one idea the page is built around.
2. **Type hierarchy** — families, roles, scale steps.
3. **Colour system** — 4–6 named base values and their roles.
4. **Section sequence** — the order of argument, with the hero's job named.
5. **Motion narrative** — where movement explains, and where stillness is correct.

**Review the plan against the brief before building.** Walk a similar prompt mentally; if the plan reads like what you would produce for any comparable page, revise that part and say what changed and why. Only then write code.

## 5. Compose the hero

The first viewport is the strongest authored moment and must work before any motion runs.

- The primary call to action belongs inside the first viewport — never behind a scroll.
- Headline: two lines maximum. Subtext: twenty words maximum, three to four lines.
- Four text elements maximum: optional label, headline, subtext, one primary action plus at most one secondary.
- Cap top padding (~6rem) so content does not float mid-viewport; if it feels tight, raise type scale or asset size instead of padding.
- No trust strips, taglines below the action, pricing teasers, or logo walls inside the hero — those are separate sections directly below.
- Navigation renders on one line at desktop widths and stays under ~80px tall; condensation beats wrapping.
- Design a complete static first frame: it must be whole when motion, media, or any script is unavailable.

## 6. Section composition

- Use a layout family at most **once** per page; a page of eight sections needs at least four distinct families.
- Never place more than **two** image-plus-text zigzags in a row; break the rhythm with a full-width, stacked, or grid section.
- Grids contain exactly as many cells as there is content — no empty or filler tiles.
- Multi-cell grids need real visual variation: a genuine image, a subject-derived texture or tint, or varied cell sizes.
- Small labels above headings are rationed: at most **one per three sections**, including the hero.
- A split header (large headline beside a small floating paragraph) is not the default; stack the two unless the right column carries real content.
- Numbered markers are only for genuine sequences.

## 7. Keep the asset system honest

- References are inspected for **traits** — hierarchy, pacing, contrast, image treatment, motion principles. Never reuse, trace, or closely reproduce assets, layouts, identity, or copy.
- Illustrations are authored or licensed, never faked with ad-hoc vector paths; interface symbols come from one consistent set.
- People are photographs, sourced or licensed. No initials, silhouettes, or generated faces presented as real customers or staff.
- No invented partnerships, logo walls, testimonials, or metrics. If proof cannot be sourced, omit the section.
- Record provenance for every asset in the source or the handoff notes.
- Describe the result in terms of the bar it meets; never claim an award, recognition, or ranking.

## 8. Restraint

Spend boldness in one place. Let a single element be memorable and keep everything around it quiet, disciplined, and unchanging. Before finishing, remove one accessory: if the page survives the removal, it is better.
