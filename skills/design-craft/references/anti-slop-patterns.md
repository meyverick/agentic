---
type: Reference
title: Anti-Slop Patterns
description: The named default patterns that make interfaces read as generated, and the choice that replaces each.
generated: { by: agentic/1.0, at: 2026-09-21T00:00:00Z }
sources:
  - { id: taste-skill, resource: references/design-skills/taste-skill.md, license: absent-terms (ideas distilled and rewritten, attributed) }
  - { id: frontend-design, resource: references/design-skills/frontend-design.md, license: absent-terms }
  - { id: awwwards, resource: references/design-skills/build-awwwards-quality-sites.md, license: absent-terms }
  - { id: emil-design-eng, resource: references/design-skills/emil-design-eng.md, license: absent-terms }
status: stable
---

# Anti-Slop Patterns

Defaults to recognise, name, and replace with a decision. Every one of these is legitimate when the brief asks for it; none is legitimate as a reflex.

| # | Pattern | Symptom | Fix |
| --- | --- | --- | --- |
| 1 | Viewport-height hero | the action sits below the fold; the layout jumps when mobile chrome appears | size the hero to its content, keep the action in the first viewport, use dynamic viewport units |
| 2 | Emoji as icons | emoji in navigation, buttons, or metadata | one consistent icon set; if none exists, ship fewer icons |
| 3 | Zero-scale entrance | elements grow from nothing | fade and translate from the element's own origin |
| 4 | Fade-in everything | every section animates in on scroll | one orchestrated entrance; leave the rest still |
| 5 | Uniform card kit | identical radius, padding, and shadow regardless of hierarchy | vary weight by importance; borders before shadows |
| 6 | Eyebrow overuse | an uppercase tracked label above every heading | at most one per three sections, including the hero |
| 7 | Split-header default | big headline beside a small floating paragraph, every section | stack headline over body; reserve the split for real content |
| 8 | Layout repetition | one image-plus-text split repeated down the page | one use per family per page; break with a full-width or grid section |
| 9 | Zigzag marathon | alternating image-left / image-right more than twice | cap at two, then change composition |
| 10 | Empty bento cells | filler or blank tiles to complete a grid | cells equal content; reshape rather than pad |
| 11 | Flat background monotony | identical white panels with only text inside | vary at least a third of cells: image, texture, or tint |
| 12 | Default type, accented word | stock family, default scale, one word in colour or italic in the headline | choose type for the subject; treat type as the design |
| 13 | Numbered markers | 01 / 02 / 03 on content that is not a sequence | numbers only for genuine sequences |
| 14 | Motion with no job | movement on every hover and every load | animate only to explain a change; see `motion-craft.md` |
| 15 | Continuous offscreen animation | looping background motion nobody is watching | pause offscreen; stop entirely under reduced motion |
| 16 | Blur and glow everywhere | glassy panels, outer glow on every accent | one deliberate use, with a solid fallback |
| 17 | Gradient blob decoration | abstract gradient shapes standing in for art direction | supply real imagery or nothing |
| 18 | Invented proof | logo walls, testimonials, metrics, or avatars that cannot be sourced | omit; honest absence beats fabrication |
| 19 | Clever copy | system vocabulary, jokes where guidance belongs | plain nouns, active voice, specific labels |
| 20 | Vague failure, apologetic emptiness | "Something went wrong"; blank panel with no direction | name the failure and the fix; make empty states an invitation |
| 21 | Transition everything | animating all properties by default | list the properties; keep motion off the layout |
| 22 | Focus removed | outlines suppressed for aesthetics | visible focus indicator on every interactive element |
| 23 | Hand-rolled glyphs | ad-hoc vector paths for standard symbols | use the project's icon set; compose rather than draw |
| 24 | Centred everything | every block centred because centring is safe | left-align by default; centre deliberately |

## Using the list

- **Name the pattern in reviews** — "eyebrow overuse", not "looks generic" — so the fix is obvious and arguable.
- **Check the brief first.** A deliberate brutalism brief wants flat panels and raw type; an editorial brief wants serif measure and numbered sections. Pattern 13 is correct when the content is a sequence.
- **Budget the tells.** One or two can be choices; four together is a template.
