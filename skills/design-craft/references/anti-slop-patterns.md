---
type: Reference
title: Anti-Slop Patterns
description: The named default patterns that make interfaces read as generated, and the choice that replaces each.
generated: { by: agentic/1.0, at: 2026-09-28T00:00:00Z }
sources:
  - { id: taste-skill, resource: references/design-skills/taste-skill.md, license: absent-terms (ideas distilled and rewritten, attributed) }
  - { id: frontend-design, resource: references/design-skills/frontend-design.md, license: absent-terms }
  - { id: awwwards, resource: references/design-skills/build-awwwards-quality-sites.md, license: absent-terms }
  - { id: emil-design-eng, resource: references/design-skills/emil-design-eng.md, license: absent-terms }
  - { id: impeccable-craft-floor, resource: references/design-skills/impeccable/skill/reference/craft-floor.md, license: Apache-2.0 }
status: stable
---

# Anti-Slop Patterns

Defaults to recognise, name, and replace with a decision. Every one of these is legitimate when the brief asks for it outside the brief-proof set (the non-negotiables, layout-affecting animation, and the contrast minimums — see SKILL.md §3 and §5); none is legitimate as a reflex. A brief-mandated departure SHALL name the brief clause that earns it.

| # | Pattern | Symptom | Fix |
| --- | --- | --- | --- |
| 1 | Viewport-height hero | the action sits below the fold; the layout jumps when mobile chrome appears | size the hero to its content, keep the action in the first viewport, use dynamic viewport units |
| 2 | Emoji as icons | emoji in navigation, buttons, or metadata | one consistent icon set; if none exists, ship fewer icons |
| 3 | Zero-scale entrance | elements grow from nothing | fade and translate from the element's own origin |
| 4 | Fade-in everything | every section animates in on scroll | one orchestrated entrance; leave the rest still |
| 5 | Uniform card kit | identical radius, padding, and shadow regardless of hierarchy | vary weight by importance; borders before shadows |
| 6 | Eyebrow overuse | an uppercase tracked label above every heading | at most one small label per three sections, including the hero, or none — ration, not ban: this skill ships no edit-time hook, so impeccable's outright ban would be unenforceable here |
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
| 25 | Gradient text | headline or stat filled with a colour ramp | weight or size carries emphasis instead; brief-mandate escape applies — rule:skill-ban-gradient-text |
| 26 | Glass default | glassy panels and outer glow as the default finish | one deliberate use with a solid fallback; brief-mandate escape applies — rule:skill-ban-glassmorphism-default |
| 27 | Hero-metric template | big number, small label, supporting stats, and an accent as the hero structure | composition grounded in the subject instead; brief-mandate escape applies — rule:skill-ban-hero-metric |
| 28 | Identical/nested card grids | same-size icon-plus-heading-plus-text cards as the page structure; cards inside cards | vary weight by content; never nest cards; brief-mandate escape applies — rule:skill-ban-identical-card-grids |
| 29 | System display face | Impact, Arial Black, or the platform sans as the display voice | source a face whose character matches the subject; brief-mandate escape applies — rule:skill-ban-system-display-face |
| 30 | Mono as costume | monospace used to look technical | mono only for code, data, or measurement; brief-mandate escape applies — rule:skill-reflex-mono-as-technical |
| 31 | Decorative chrome | sparklines, progress rings, and soft-shadowed rounded rects standing in for content | real content or nothing; brief-mandate escape applies — rule:skill-reflex-decorative-chrome |
| 32 | Side-stripe borders | a coloured border-left or border-right above 1px on cards, list items, callouts, alerts | border or shadow from the palette, not both; brief-mandate escape applies — rule:skill-ban-side-stripe-borders |
| 33 | Modal by reflex | a modal for a task needing neither interruption nor protected focus | inline flow or a drawer; brief-mandate escape applies — rule:skill-reflex-modal-by-reflex |
| 34 | Theme by habit | light or dark picked from the category | pick it from the use scene: who, where, under what ambient light; brief-mandate escape applies — rule:skill-reflex-theme-by-habit |
| 35 | Stripes/grid backgrounds | repeating-linear-gradient stripes or a two-axis grid overlay with no subject under them | texture only from the subject's world, or none; brief-mandate escape applies — rule:skill-ban-codex-stripes + rule:skill-ban-codex-grid-backgrounds |
| 36 | Hard offset shadow | `box-shadow: 4px 4px 0` outside a world that is actually neobrutalist | declared elevation: border or soft blur; brief-mandate escape applies — rule:skill-ban-hard-offset-shadow |
| 37 | Geometric occlusion mask | circle, polygon, or radial-gradient cutout approximating a photographic subject's edge | alpha matte from the actual image, or omit the cut-out; brief-mandate escape applies — rule:skill-ban-geometric-occlusion-mask |
| 38 | Sketchy-SVG picture | sketch-style SVG scenes, `loose-sketch`/`doodle` classes, `feTurbulence` grain as imagery | real illustration or none — SVG doing geometry stays first-class; brief-mandate escape applies — rule:skill-ban-codex-sketchy-svg |

## Impeccable coverage

Countable map of the 23 canonical ids from `references/design-skills/impeccable/skill/reference/craft-floor.md` (ban/reflex/interaction family): fourteen new rows cover fifteen ids, because row 35 carries `skill-ban-codex-stripes` and `skill-ban-codex-grid-backgrounds` as one craft-floor bullet — fourteen rows, fifteen ids, not fourteen.

- Rows 25–38 carry their own ids inline: `skill-ban-gradient-text`, `skill-ban-glassmorphism-default`, `skill-ban-hero-metric`, `skill-ban-identical-card-grids`, `skill-ban-system-display-face`, `skill-reflex-mono-as-technical`, `skill-reflex-decorative-chrome`, `skill-ban-side-stripe-borders`, `skill-reflex-modal-by-reflex`, `skill-reflex-theme-by-habit`, `skill-ban-codex-stripes`, `skill-ban-codex-grid-backgrounds`, `skill-ban-hard-offset-shadow`, `skill-ban-geometric-occlusion-mask`, `skill-ban-codex-sketchy-svg`.
- `skill-ban-glyph-icons` → held by pattern 2 (emoji as icons; one consistent icon set).
- `skill-ban-numbered-section-markers` → held by pattern 13 (numbers only for genuine sequences).
- `skill-ban-text-overflow` → held by `design-engineering.md` §7 (truncation/clamping plus the breakpoint-overflow clause).
- `skill-ban-codex-ghost-card` + `skill-ban-codex-over-round` → held by `design-engineering.md` §4 (declare elevation once; card radii 12–16px).
- `skill-ban-eyebrow-on-every-section` → held by pattern 6, as a ration (one per three sections), not impeccable's outright ban: no edit-time hook, so the ration is the checkable form — a deliberate, documented divergence.
- `skill-ban-codex-x-theater` → **partial** hold by SKILL.md §5 (honest claims) plus pattern 19 (clever copy): craft-floor's "configuration comes from supplied truth / label illustrative values honestly" clause is NOT fully held here.
- `skill-interaction-gemini-no-image-hover` → held by `motion-craft.md` §11 (a motion defect, not a surface default).
- Adjacent, not new: `skill-ban-system-display-face` (row 29) is narrower than but adjacent to pattern 12's "stock family"; glass is restated — pattern 16 ("blur and glow everywhere") and row 26 name the same rule without changing it.

## Using the list

- **Name the pattern in reviews** — "eyebrow overuse", not "looks generic" — so the fix is obvious and arguable.
- **Check the brief first.** A deliberate brutalism brief wants flat panels and raw type; an editorial brief wants serif measure and numbered sections. Pattern 13 is correct when the content is a sequence.
- **Budget the tells.** One or two can be choices; four together is a template.
- **Ration, not ban.** The eyebrow rule is one small label per three sections because this skill ships no edit-time hook — impeccable bans it outright, which only an edit-time hook could enforce. A brief cannot earn past the brief-proof set (non-negotiables, layout-affecting animation, contrast minimums).
