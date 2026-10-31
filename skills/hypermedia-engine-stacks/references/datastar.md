Source: `datastar@1efcdc3c` · verified 2026-10-31 (v1.0.4, identical to the bundle `DatastarScript` embeds)
Re-verify when: the Datastar pin moves, an attribute plugin is renamed, or the `fetch.ts` retry/`204` semantics change.

# Datastar — Client Reactivity, Morphing, and Streaming

Datastar is a ~12 KiB TypeScript ESM engine: declarative attributes, a deep reactive signal graph, RFC 7396 merge patching, and Idiomorph DOM morphing over server-sent events. The server owns HTML; the client owns only signals and event wiring.

## Actions and Hypermedia CQRS

| Action | Request | Contract |
| --- | --- | --- |
| `@get` | `GET`, stream | persistent query subscription |
| `@post` / `@put` / `@patch` / `@delete` | body carries signals | command; answer `204 No Content` |
| `@query` | `QUERY`, JSON body | read without a stream; not a subscription |

Read side: `@get` opens a persistent SSE stream and applies `datastar-patch-elements` and `datastar-patch-signals` events.

Write side: a command answers `204 No Content` and never patches elements. Do not return `204` from a stream route — see *Streaming contract*.

```html
<div id="rows" data-on:click="@get('/rows/stream')">Refresh</div>
<form data-on:submit__prevent="@post('/rows')">…</form>
```

## Attribute Plugins

The v1 rule is colon syntax: `data-<plugin>:<key>` is the keyed form and `data-<plugin>` the unkeyed form. Keyed plugins take one key and round-trip it through the signal path.

| Plugin | Keyed example | Unkeyed form |
| --- | --- | --- |
| `data-signals` | `data-signals:count="0"` | `data-signals="{count: 0}"` (JSON object) |
| `data-bind` | `data-bind:name` | — |
| `data-on` | `data-on:click="@post('/inc')"` | — |
| `data-class` | `data-class:active="$open"` | `data-class="{active: $open}"` |
| `data-attr` | `data-attr:title="$tip"` | `data-attr="{title: $tip}"` |

The remaining v1 plugins: `data-computed` (derived signal), `data-effect` (side effect on dependencies), `data-show` (visibility), `data-text` (text content), `data-style` (inline style), `data-ref` (element reference signal), `data-json-signals` (serialize the store into the DOM), `data-on-intersect` (IntersectionObserver), and `data-on-signal-patch` (signal-patch hook). `data-indicator`, `data-on-interval`, and `data-init` complete the set.

Modifiers are appended with `__`: `data-on:click__window`, `__document`, `__outside`, `__prevent`, `__stop`, `__once`, `__capture`, `__passive`, `__case.kebab`, `__delay.500ms`, `__debounce.500ms`, `__throttle.200ms`, `__viewtransition`. `data-ignore` also accepts `__self`.

## Morphing

- **Fat Morphing**: Idiomorph reconciles by id and structure, so every morphed node needs a deterministic `id`. An index-derived or random id defeats morphing and resets DOM state.
- `data-ignore-morph` marks a node Idiomorph must not reconcile. Put it on the `<canvas>` **and** on its mount container.
- `data-ignore` suppresses Datastar plugin processing for a subtree; it is not a morph boundary.
- `data-preserve-attr` names attributes kept from the old node during a morph (form state), not a morph boundary.
- `data-scope-children` is a morph-scope marker on the patch target; it scopes child reconciliation and is not a plugin.
- A `PatchElements` with `ElementPatchMode::Outer` or `Inner` morphs; `Replace`, `Prepend`, `Append`, `Before`, `After`, and `Remove` do not preserve state.

## Signals

- `data-signals` accepts a JSON object; the keyed form sets one signal. Serialize server-side JSON and let Maud escape the attribute — never concatenate or pre-escape it by hand.
- A leading underscore marks a private signal: the default `filterSignals` exclusion is `/(^|\.)_/`, so `_draft` is never sent to the server.
- `null` deletes a signal (`RFC 7396` merge patch). Sending `{"draft": null}` removes it; sending `{}` is a no-op.
- Keyed BEM classes fail silently: `data-class:card__active` parses key `card` plus an `active` modifier, so the intended class never toggles and no error is raised. Keyed plugins take a single key — use the unkeyed object form for compound class maps.

## Strict CSP

Render `<html data-nonce="…">`; the engine reads the nonce from the root element, removes the attribute from the DOM, and compiles expressions through injected, nonced scripts. With Trusted Types present it creates a `datastar` policy for `createHTML`/`createScript`. `DatastarScript` does not add a nonce to its own tag, so the shell renders that `<script type="module" src="…" nonce="…">` itself. Never evaluate signal JSON with `eval` or `Function` in application code.

## Streaming Contract

| Behavior | Reality |
| --- | --- |
| stream ends with `200` body close | not re-requested unless `retry: 'always'` |
| stream answers `204` | terminal: no retry, no `datastar-fetch` event |
| `4xx`/`5xx` with `retry: 'auto'` | not retried; `datastar-fetch` `error` fires |
| `Retry-After` | never read by the engine |
| SSE `retry:` field | becomes the backoff base (`retryInterval`), scaled by `retryScaler` and capped by `retryMaxWait` |
| `openWhenHidden` | `false` on `@get` only; a hidden tab aborts and rebuilds on `visibilitychange` |
| `requestCancellation` | `'auto'` by default; use `'cleanup'` for a stream anchored on a node a morph can replace |

`datastar-fetch` is the only lifecycle event; it fires on `document` with `detail.type` = `started`, `finished`, `error`, `retrying`, or `retries-failed`. There is no per-phase event name and no `datastar-retries-failed`. Guard on `detail.type`.

The default retry ladder is 1 s, 2 s, 4 s, 8 s, 16 s, then 30 s until the tenth attempt — roughly 181 s before `retries-failed`. A drain or an over-budget rejection therefore needs a final `PatchElements` that replaces the `@get` node (immediate re-subscribe) rather than relying on the ladder; `retry: 'always'` is the fallback, not the first choice.

## Aliased Bundle Trap

`aliasify` rewrites every attribute to `data-star-*` when the bundle is built with an alias. `DatastarScript` serves the **unaliased** 1.0.4 bundle, so every example here uses `data-*`. A bring-your-own aliased bundle silently invalidates every attribute in this archive; serve the embedded bundle or rewrite the whole surface.

## Migration and Retired Forms

| Retired form | Replacement |
| --- | --- |
| `data-on-click` | `data-on:click` |
| `data-signals` with a JS expression string | JSON object (or keyed `data-signals:key`) |
| `data-bind` without a key | `data-bind:key` |
| `datastar-retries-failed` event | `data-on:datastar-fetch` with a `detail.type === 'retries-failed'` guard |
| `data-ignore` as the canvas morph boundary | `data-ignore-morph` on the canvas and its container |
| hand-written Origin checks in the app | `CsrfLayer` at the gateway; Datastar ships no CSRF rule |
