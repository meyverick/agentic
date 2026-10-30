---
type: Reference
title: Review Checklist
description: Review method, severity ladder, and the checklist used for interface reviews, including the vendored Web Interface Guidelines digest.
generated: { by: agentic/1.0, at: 2026-09-21T00:00:00Z }
sources:
  - { id: emil-design-eng, resource: references/design-skills/emil-design-eng.md, license: absent-terms (ideas distilled and rewritten, attributed) }
  - { id: impeccable, resource: references/design-skills/impeccable.md, license: Apache-2.0 }
  - { id: taste-skill, resource: references/design-skills/taste-skill.md, license: absent-terms }
  - { id: web-interface-guidelines, resource: https://github.com/vercel-labs/web-interface-guidelines, license: MIT, captured: 2026-09-21 }
status: stable
---

# Review Checklist

Review produces findings, not opinions. Evidence first, fix second.

## Method

1. **Scope** — name what is under review (files, routes, or surfaces) before starting.
2. **Gather evidence** — read the source, and inspect the rendered surface when the environment allows: one batch covering desktop and mobile together. A screenshot settles arguments that prose cannot.
3. **Check in order** — blockers first (accessibility, honesty, broken behaviour), then hierarchy and craft, then polish. Stop escalating once the surface is sound.
4. **Report** — one line per finding, severity-ranked, `file:line` locatable:
   `<severity> · <file>:<line> · <rule violated> · <fix>`
5. **Do not edit** unless fixes were requested. When they were, re-run the checklist afterwards.

Severity ladder: **blocker** (inaccessible, dishonest, or broken) · **major** (hierarchy, contrast, motion, performance) · **minor** (polish).

## Checklist

### Accessibility

- Every interactive element has a visible focus indicator, never removed without an equal replacement.
- Icon-only controls carry an accessible name; images carry alternative text (empty for decorative).
- Controls use real labels, associated with the control and clickable as one hit target.
- Semantic elements before ARIA: a button for actions, a link for navigation — never a clickable container.
- Headings are ordered and hierarchical; the page has a skip path to the main content.
- Sticky headers, footers, and overlays never obscure the focused element.
- Async updates (toasts, validation) are announced to assistive technology.
- Decorative media is hidden from assistive technology; meaningful media has captions or a transcript.
- Zoom is never disabled.

### Forms

- Correct input type and autocomplete intention per field; paste is never blocked.
- Errors appear inline beside the field, state the fix, and the first error receives focus on submit.
- The submit control stays enabled until the request starts, then shows progress.
- Unsaved changes warn before navigation.
- Checkboxes and radios share a single hit target with their label.

### Motion

- `prefers-reduced-motion` renders final states; decorative loops stop entirely.
- Motion runs on transform and opacity; blur, `backdrop-filter`, `clip-path`, and `mask` only as the single authored moment (scoped rule, `motion-craft.md` §8); properties are listed, never "all".
- Transform origin is deliberate; animations are interruptible.
- Motion longer than five seconds alongside other content offers pause, stop, or hide.
- No gesture-only action without a click and keyboard equivalent.

### Typography and content

- Body measure 65–75ch; headings do not orphan a single word.
- Ellipsis character for truncation and loading labels; typographic quotes; non-breaking spaces in units and brand names.
- Numeric columns use tabular figures.
- Long, short, and very long content all render without breaking layout; empty states give direction.
- Copy is active voice, sentence case, second person, with specific labels and errors that state the next step.
- Dates, times, numbers, and currency use internationalisation APIs; brand and code tokens are marked untranslatable.

### Images and media

- Explicit dimensions on media to prevent layout shift; below-fold media loads lazily.
- Above-fold critical media is prioritised.
- Compressed video with a still fallback rather than animated images for short loops.
- Provenance recorded; no unlicensed or invented assets.

### Performance

- Targets: largest contentful paint under 2.5s, interaction latency under 200ms, cumulative layout shift under 0.1.
- No layout reads during rendering; DOM reads and writes are batched.
- Long lists are virtualised or windowed.
- Fonts are preloaded where critical with a swap strategy; third-party origins are preconnected.
- Motion and canvas work pause offscreen; per-frame allocation is absent.

### Layout and touch

- Full-bleed layouts respect device safe areas; content overflow is fixed rather than clipped.
- Touch targets meet minimum size; tap highlight and double-tap zoom are handled deliberately.
- Containers inside sheets and drawers contain their overscroll.
- Multi-column sections declare their narrow-width collapse.

### State and navigation

- Addressable state (filters, tabs, pagination, open panels) is reflected in the URL and deep-linkable.
- Navigation uses real links so open-in-new-tab and modifier-click work.
- Destructive actions require confirmation or an undo window.
- Empty, loading, and error states exist for every data surface.

### Theming

- Every shipped theme holds contrast, hierarchy, and brand expression.
- The document colour scheme matches the active theme so native controls follow.
- Theme values come from one token strategy, not scattered overrides.

## Vendored Web Interface Guidelines digest

Upstream: `https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md` (MIT), captured **2026-09-21**. This digest is the offline floor; re-fetch to refresh. Rules are restated in stack-neutral terms. Areas already covered by the checklist above — accessibility, focus, forms, motion, layout, touch, images, theming, navigation and state — are not repeated; what follows is the remainder of the upstream rule set.

**Typography** — ellipsis character; curly quotes; non-breaking spaces for units and shortcuts; loading labels end with an ellipsis; tabular figures for numeric columns; balanced heading wrapping.

**Content handling** — long content truncates, clamps, or wraps deliberately; shrinkable children where truncation is expected; empty states handled; short, average, and very long user input all anticipated.

**Performance detail** — virtualise long lists; no layout reads while rendering; batch DOM reads and writes; uncontrolled inputs preferred, controlled inputs cheap per keystroke; preconnect asset origins; preload critical fonts with swap; compressed video over animated images with a still alternative.

**Locale** — internationalisation APIs for dates, times, numbers, and currency; language detected from preferences rather than location; brand and code tokens marked untranslatable.

**Hydration safety** — inputs with a value must handle change or default explicitly; server and client rendering of dates and times must agree; suppression of hydration warnings only where genuinely required.

**Hover and states** — buttons and links have a hover state; interactive states increase contrast above rest.

**Copy** — active voice; title case for headings and buttons; numerals for counts; specific button labels; errors with a fix; second person.

**Flag on sight** — disabled zoom; blocked paste; animating all properties; removed outlines; click handlers on non-interactive containers; images without dimensions; unvirtualised large lists; inputs without labels; icon buttons without names; hardcoded date or number formats; unjustified autofocus; animated images where video fits; gesture-only actions; gradient text as emphasis; the hero-metric template as a hero; glass as the default finish.
