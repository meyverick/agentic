---
type: Reference
title: Design Engineering
description: Type, colour, layout, materiality, states, forms, density, theming, and locale-handling rules.
generated: { by: agentic/1.0, at: 2026-09-21T00:00:00Z }
sources:
  - { id: taste-skill, resource: references/design-skills/taste-skill.md, license: absent-terms (ideas distilled and rewritten, attributed) }
  - { id: impeccable, resource: references/design-skills/impeccable.md, license: Apache-2.0 }
  - { id: web-design-guidelines, resource: https://github.com/vercel-labs/web-interface-guidelines, license: MIT }
status: stable
---

# Design Engineering

Concrete rules for the decisions that make an interface feel authored rather than generated.

## 1. Typography

- One family, or two that are clearly distinct in role. Never a third.
- Set a scale with intentional steps; a page needs four to six sizes, not ten.
- Body measure stays under ~80 characters; serif body text may run slightly longer with correspondingly more leading.
- Numbers that are compared or stacked use tabular figures; numerals in prose stay proportional.
- Loading, saving, and pending labels end with an ellipsis character, not three periods. Use typographic quotes and non-breaking spaces in units and brand names.
- Balance headings so they do not orphan a single word.

**Tell-tale treatments to avoid:** accenting one word of a headline with a different weight, colour, or style; all-caps labels; a decorative label above every heading; type chosen because it is the default rather than because the subject called for it.

## 2. Colour

- Name 4–6 base values and give each a role (surface, raised surface, text, muted text, accent, state). Everything else derives.
- Contrast: body text meets AA; hero copy and the primary action target AAA.
- Hierarchy parity: if the primary action dominates in one theme, it dominates in every theme.
- Brand fidelity: keep the brand colour recognisable rather than desaturating it into a theme.
- Avoid pure black and pure white; near-values preserve depth.
- Ship one token strategy for the whole project: either variant values per theme or semantic custom properties swapped per theme — never both, never ad-hoc overrides.

## 3. Layout and space

- Use a spacing scale and stay on it: airy 24–96px, standard 16–64px, dense 8–32px (see the density dial).
- Lay out with grid rather than percentage arithmetic; avoid computed widths that only work at one viewport.
- Contain the page with a readable maximum width and consistent gutters; alignment across sections beats novelty within one.
- Full-height sections use dynamic viewport units so mobile chrome does not cause a jump, and never force the call to action below the fold.
- Declare the collapse behaviour for every multi-column section explicitly, at the breakpoint where it breaks — not "it will reflow".
- Fix overflow at the content level; do not hide it with a clipped container.
- Full-bleed sections account for device safe areas.

## 4. Materiality

- Borders before shadows; one elevation recipe per level, applied consistently.
- Blur and glow are decisions with a reason, not a default finish on every surface.
- Radius is hierarchical: one value applied to everything flattens hierarchy.
- Backgrounds vary where content varies; a grid of identical white cells reads as unfinished.

## 5. Interactive states

Every interactive element defines: **default, hover, active, focus, disabled, loading, empty, error**.

- Interactive states increase contrast — hover, active, and focus are more prominent than rest.
- Focus is always visible and never removed without an equal replacement; focus styling uses `:focus-visible` semantics so a mouse click does not draw a ring.
- Focus is never obscured by sticky headers, footers, or overlays; add scroll margin where anchors or focused elements can be covered.
- Disabled means unavailable, not unreadable — keep it legible and explain why when the reason is not obvious.
- Loading shows progress on the element that started the work, not a page-level veil.
- Hover-only affordances need touch and keyboard equivalents.

## 6. Forms and data

- Every control has a real label, clickable as part of the control's hit target; placeholders are examples, never the label.
- Errors appear inline beside the field, name the problem and the fix, and the first error receives focus on submit.
- Do not block paste. Do not disable the submit button before the request starts; show progress once it has.
- Choose input types that match the data and set autocomplete intentions so assistive tools and password managers behave.
- Warn before leaving with unsaved changes.
- Destructive actions require confirmation or an undo window — never immediate and irreversible.
- Tables: align numbers right with tabular figures, keep header alignment consistent with cells, and give every table a defined empty state.
- Long lists are virtualised or windowed once they grow past ordinary scroll length, and rendering never performs layout reads.

## 7. Content handling and density

- Text containers survive long content: truncate, clamp, or break long tokens deliberately, and let children shrink where truncation is expected.
- Test short, average, and very long inputs — including user-generated ones.
- Empty states are directional: say what belongs here and how to add it. A blank panel is a dead end.
- Density follows the dial: dense surfaces group and compress, airy surfaces let sections breathe. Never a dense table on an airy page without a reason.
- Copy is content, not decoration: active voice, specific labels ("Save API key", not "Continue"), sentence case, second person, errors that state the fix, and one job per written element.

## 8. Theme protocol

- Support the themes the project ships; do not assume a single mode. Respect the system preference unless the brand insists otherwise.
- Decide the mode earlier, not later: retrofitting a dark theme into hardcoded light values is a rewrite.
- Set the document colour scheme so native controls, scrollbars, and form widgets match the active theme.
- Test every shipped theme before finishing: contrast, hierarchy, imagery, and brand expression all hold in each.

## 9. Media and imagery

- Choose aspect ratios deliberately and crop for them; never letterbox or distort at any size.
- Give every image alternative text, and define a fallback for media that is missing or fails to load.
- Set explicit dimensions so loading media cannot shift the layout.
- Decorative media earns its place only when it carries narrative; otherwise omit it. Abstract gradient shapes standing in for art direction are not imagery.
- No filler stock: when nothing honest exists, a typographic or colour-driven composition is stronger than a borrowed photograph.
- Weight follows role — hero media may be generous, thumbnails may not.
- Record provenance for every asset, licensed or generated, in the source or the handoff.

## 10. Non-text surfaces and contrast detail

- Non-text elements that carry meaning — borders of inputs, icons, chart series, focus rings — meet a 3:1 contrast ratio against their surroundings.
- Text placed over imagery sits on a deliberate scrim, tint, or solid panel; never rely on the photograph staying dark in that spot.
- Sticky headers and footers stay thin (well under a tenth of the viewport), and any anchored or focused element is offset so it is not hidden beneath them.
- Disabled controls remain legible; reduce affordance, not readability.
- Charts and data graphics label series directly where possible rather than relying on a legend the eye must travel to.

## 11. Quotes and social proof

- Quotes are short, real, and attributed to a named person or role. Never invent a customer, metric, or partnership.
- Testimonial treatment stays quiet: no oversized quotation marks as decoration, no carousel that hides the substance behind interaction.
- Proof is placed below the hero and beside the claim it supports, never stuffed into the opening viewport.
- Absent real proof, omit the section rather than implying it.

## 12. Locale and internationalisation

- Format dates, times, numbers, and currency with platform internationalisation APIs, never hardcoded patterns.
- Detect language from request or client preferences, never from location.
- Mark brand names, code tokens, and identifiers as untranslatable so machine translation does not garble them.
- Leave room for text expansion (allow roughly 30% growth) and avoid text baked into images.
- Ensure interactive targets meet minimum touch size and account for safe-area insets.
