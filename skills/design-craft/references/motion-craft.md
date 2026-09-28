---
type: Reference
title: Motion Craft
description: Deciding whether to animate, then choosing easing, duration, springs, technique, and cleanup.
generated: { by: agentic/1.0, at: 2026-09-28T00:00:00Z }
sources:
  - { id: emil-design-eng, resource: references/design-skills/emil-design-eng.md, license: absent-terms (ideas distilled and rewritten, attributed) }
  - { id: taste-skill, resource: references/design-skills/taste-skill.md, license: absent-terms }
  - { id: awwwards, resource: references/design-skills/build-awwwards-quality-sites.md, license: absent-terms }
  - { id: impeccable-craft-floor, resource: references/design-skills/impeccable/skill/reference/craft-floor.md, license: Apache-2.0 }
  - { id: web-design-guidelines, resource: https://github.com/vercel-labs/web-interface-guidelines, license: MIT }
status: stable
---

# Motion Craft

Motion is a decision before it is a technique. Answer the four questions in order, then build.

## 1. Should this animate at all?

Ask how often a given person will trigger it:

| Frequency | Decision |
| --- | --- |
| Many times a day (command palette, keyboard shortcuts, list navigation) | none — instant |
| Tens of times a day (hover, row selection) | remove or drastically reduce |
| Occasional (modals, drawers, toasts) | standard animation |
| Rare or first-time (onboarding, celebration) | delight is allowed |

Never animate a keyboard-initiated action: repetition makes animation read as lag.

## 2. What is its purpose?

Every animation answers "why does this move?" Valid purposes:

- **Feedback** — the interface acknowledges the action.
- **Spatial consistency** — an element enters and leaves along the same path, so dismissal feels predictable.
- **State indication** — a control shows that something changed.
- **Explanation** — a sequence demonstrates how a feature works.
- **Preventing a jarring change** — something appearing or disappearing with no transition reads as broken.

If the honest answer is "it looks cool" on a frequently seen surface, do not animate it.

## 3. Which easing?

| Situation | Easing |
| --- | --- |
| Entering the screen | ease-out (immediate movement, then settle) |
| Moving or morphing on screen | ease-in-out |
| Hover or colour change | ease |
| Continuous motion (marquee, progress) | linear |
| Leaving the screen | ease-in (or ease-out with a shorter duration) |

- **Never use ease-in for an entrance** — starting slow reads as sluggish precisely when attention is highest.
- Default curves are weak; prefer steeper custom curves. Useful starting values: entrance `cubic-bezier(0.23, 1, 0.32, 1)`; on-screen movement `cubic-bezier(0.77, 0, 0.175, 1)`; drawer/tray `cubic-bezier(0.32, 0.72, 0, 1)`.
- Enter and exit need not mirror: exits are usually faster and quieter than entrances.

## 4. How long?

| Element | Duration |
| --- | --- |
| Press feedback | 100–160ms |
| Tooltip, small popover | 125–200ms |
| Dropdown, select, menu | 150–250ms |
| Modal, drawer, sheet | 200–500ms |
| Explanatory or marketing sequence | longer is permitted |

- Interactive UI stays under ~300ms. Distance, size, and element weight justify the upper end; frequency argues for the lower.
- A faster spinner makes identical load times feel shorter. Speed is perceived as quality.

## 5. Springs

Use a spring when the motion is **interruptible** or follows a **gesture** — dragging, flicking, sheets, anything a person can grab or reverse mid-flight. Springs preserve velocity when interrupted; fixed-duration curves restart and feel mechanical.

- Tuning intuition: higher stiffness settles faster and tighter; lower damping produces more overshoot. For UI, aim for minimal overshoot — enough to feel physical, not bouncy.
- Do not spring simple fades, colour changes, or entrances that nobody interrupts; a short ease-out is cheaper and cleaner.
- Spring motion must still respect reduced motion and must not delay a state change the person is waiting on.

## 6. Technique

- **Distance-independent motion**: translate by percentage when the element's size varies.
- **Scale children too**: scaling a parent scales its contents; compensate or animate the inner element separately to avoid distorted text.
- **Transform origin**: set it deliberately — popovers and menus originate from their trigger, not from their own centre.
- **Depth**: a small 3D rotation or perspective can imply layering; keep it subtle and never for text.
- **Clip-path reveals**: an inset clip animates cleanly for image and panel reveals, and pairs well with a slight translate — the single authored moment, per the palette rule in §8.
- **Stagger**: offset siblings by small increments with a capped total; direction stays consistent. Do not stagger the primary action.
- **Interruptibility**: a user who changes their mind mid-animation should be able to reverse it immediately.
- Prefer the simplest mechanism that works — platform transitions for state, the platform animation API for sequenced or programmatic motion. One motion system per project.

## 7. Gesture and drag

- Momentum: a flick continues and settles naturally rather than stopping dead.
- Boundaries: resistance rather than hard stops, so the user feels the edge instead of hitting it.
- Feedback during drag: disable text selection and make the dragged element the obvious focus of the interaction.
- Every gesture needs a tap, click, and keyboard alternative unless the gesture is truly essential.

## 8. Performance

- **Palette (deciding line):** transform and opacity are the default; blur, `backdrop-filter`, `clip-path`, and `mask` are permitted only as the single authored moment when they stay smooth and respect reduced motion. Layout-affecting animation remains a defect in all cases, brief or no brief.
- Animate **transform and opacity**; anything that triggers layout or paint on every frame is a defect.
- Never animate every property — list the properties explicitly.
- Pause or stop animation when the element is offscreen or the document is hidden.
- Continuous canvas or WebGL work caps device pixel ratio, throttles input, and allocates nothing per frame.
- Media: short non-essential loops use compressed video with a still fallback rather than animated images.

## 9. Accessibility

- `prefers-reduced-motion` renders final states immediately — do not merely shorten the animation.
- Decorative loops stop entirely under reduced motion.
- Motion is never the only signal for a state change; pair it with a visible state.
- Autoplaying motion longer than five seconds alongside other content needs pause, stop, or hide controls.

## 10. Debugging motion

- Slow playback down (roughly 8–10×) to inspect timing and easing; most defects are invisible at full speed.
- Step frame by frame around the start and end of a transition to catch jumps and double-triggers.
- Test on real devices, and under load: smooth on a fast machine says nothing about a mid-range phone.
- Add instrumentation to find dropped frames, and re-measure after every content or font change.

## 11. Forbidden

- Animation with no narrative or feedback role.
- Infinite offscreen animation; continuously animated backgrounds.
- Layout-affecting animation in all cases, per-frame allocation, or blur and glow outside the single authored moment (§8).
- Animating an image on hover, directly or through its parent: an image is not an action target — give the container the feedback. (`rule:skill-interaction-gemini-no-image-hover`)
- Entrances from zero scale, or from a different origin than the element's own.
- Animating keyboard-driven actions, or making a person wait for an animation to act.
