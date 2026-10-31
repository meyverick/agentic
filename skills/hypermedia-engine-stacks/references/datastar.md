Re-verify when: the datastar pin recorded in `scripts/provenance.lock` moves, an attribute plugin is renamed, or the `fetch.ts` retry/`204` semantics change.

# Datastar — Client Reactivity, Morphing, and Streaming

Datastar is a ~12 KiB TypeScript ESM engine: declarative attributes, a deep reactive signal graph, RFC 7396 merge patching, and Idiomorph DOM morphing over server-sent events. The server owns HTML; the client owns only signals and event wiring.

## Actions and Hypermedia CQRS

| Action | Request | Contract |
| --- | --- | --- |
| `@get` | `GET`, stream | persistent query subscription |
| `@post` / `@put` / `@patch` / `@delete` | body carries signals | command; empty-bodied success, no patch |
| `@query` | `QUERY`, JSON body | read without a stream; not a subscription |

Read side: `@get` opens a persistent SSE stream and applies `datastar-patch-elements` and `datastar-patch-signals` events.

Write side: a command never patches elements and ends with an empty body. Which status answers it is a gateway decision, stated once in the syllabus *Transport Status* table — do not answer a stream route the way a command is answered.

```html
<div id="rows" data-on:click="@get('/rows/stream')">Refresh</div>
<form data-on:submit__prevent="@post('/rows')">…</form>
```

### In-flight feedback

- `data-indicator:busy` (keyed, camel-cased by default) or `data-indicator="busy"` (unkeyed, the value is the signal name) declares a signal that is `true` while a request started by that element is in flight. It counts concurrent fetches, so two overlapping commands do not clear each other on the first `finished` (`plugins/attributes/indicator.ts`).
- The `datastar-fetch` event's `detail.argsRaw` carries the payload for its type: `error` sets `status` to the HTTP status **as a string**, `retrying` and `retries-failed` carry `{}`, and the patch events carry the decoded data lines (`elements`, `signals`, …). Read `argsRaw.status` to tell a drain rejection from a budget rejection.

## Attribute Plugins

The attribute rule is colon syntax: `data-<plugin>:<key>` is the keyed form and `data-<plugin>` the unkeyed form. Keyed plugins take one key and round-trip it through the signal path.

| Plugin | Keyed example | Unkeyed form |
| --- | --- | --- |
| `data-signals` | `data-signals:count="0"` | `data-signals="{count: 0}"` (JSON object) |
| `data-bind` | `data-bind:name` | — |
| `data-on` | `data-on:click="@post('/inc')"` | — |
| `data-class` | `data-class:active="$open"` | `data-class="{active: $open}"` |
| `data-attr` | `data-attr:title="$tip"` | `data-attr="{title: $tip}"` |

The remaining plugins: `data-computed` (derived signal), `data-effect` (side effect on dependencies), `data-show` (visibility), `data-text` (text content), `data-style` (inline style), `data-ref` (element reference signal), `data-json-signals` (serialize the store into the DOM), `data-on-intersect` (IntersectionObserver), and `data-on-signal-patch` (signal-patch hook). `data-indicator`, `data-on-interval`, and `data-init` complete the set.

Modifiers are appended with `__`: `data-on:click__window`, `__document`, `__outside`, `__prevent`, `__stop`, `__once`, `__capture`, `__passive`, `__delay.500ms`, `__debounce.500ms`, `__throttle.200ms`, `__viewtransition`. `data-ignore` also accepts `__self`.

The `__case` modifier takes exactly `camel`, `snake`, and `pascal` — `data-on:keyup__case.camel`, `data-signals:rowCount__case.snake`, `data-bind:firstName__case.pascal`. `data-on` keys default to `kebab` (`modifyCasing(key, mods, 'kebab')`), and `modifyCasing` treats a name it does not recognise as "leave the key as written", because `caseFns` defines only those three (`library/src/utils/text.ts`). `__case.kebab` is therefore not a value and changes nothing.

## Morphing

- **Fat Morphing**: Idiomorph reconciles by id and structure, so every morphed node needs a deterministic `id`. An index-derived or random id defeats morphing and resets DOM state.
- `data-ignore-morph` marks a node Idiomorph must not reconcile. Put it on the `<canvas>` **and** on its mount container.
- `data-ignore` suppresses Datastar plugin processing for a subtree; it is not a morph boundary.
- `data-preserve-attr` names attributes kept from the old node during a morph (form state), not a morph boundary.
- `data-scope-children` is a morph-scope marker on the patch target; it scopes child reconciliation and is not a plugin.
- A `PatchElements` with `ElementPatchMode::Outer` or `Inner` morphs; `Replace`, `Prepend`, `Append`, `Before`, `After`, and `Remove` do not preserve state.

## Signals

- `data-signals` takes **strict JSON**: double-quoted keys and strings, no comments, no trailing commas, no function values. The attribute value is compiled as an expression, so loose JavaScript happens to work here — but the same payload travels as a `datastar-patch-signals` event, where `jsStrToObject` (`library/src/utils/text.ts`) tries `JSON.parse` first and falls back to compiling the payload as JavaScript when parsing fails. Strict JSON never takes that fallback, so the payload stays data on every path. Serialize server-side JSON and let Maud escape the attribute — never concatenate or pre-escape it by hand.
- A leading underscore marks a private signal: the default `filterSignals` exclusion is `/(^|\.)_/`, so `_draft` is never sent to the server.
- `null` deletes a signal (`RFC 7396` merge patch). Sending `{"draft": null}` removes it; sending `{}` is a no-op.
- Keyed BEM classes fail silently: `data-class:card__active` parses key `card` plus an `active` modifier, so the intended class never toggles and no error is raised. Keyed plugins take a single key — use the unkeyed object form for compound class maps.
- `data-on-signal-patch="…"` runs on every signal patch, receiving it as `patch`. `data-on-signal-patch-filter` takes a `{include, exclude}` object of regular expressions and narrows which patches fire the expression; the plugin peeks the filtered set rather than subscribing to it (`plugins/attributes/onSignalPatch.ts`).
- Every action takes a `filterSignals` override for the payload it sends: `@get('/rows/stream', { filterSignals: { include: /^row/, exclude: /^_/ } })`. The default is `include: /.*/` and `exclude: /(^|\.)_/`; narrow it per action instead of trusting one global exclusion.

## Strict CSP

Render `<html data-nonce="…">`; the engine reads the nonce from the root element, removes the attribute from the DOM, and compiles expressions through injected, nonced scripts. With Trusted Types present it creates a `datastar` policy for `createHTML`/`createScript`. `DatastarScript` does not add a nonce to its own tag, so the shell renders that `<script type="module" src="…" nonce="…">` itself. Signal payloads are data, not code: keep them strict JSON so no path can reach the expression fallback, and never add an `eval` or `Function` of your own around them.

## Streaming Contract

Status answers belong to `SKILL.md` and `references/rama.md`; this table is only what the engine does in response, and it carries no answer column on purpose — a third copy is how the two documents diverged before.

| Behavior | Reality |
| --- | --- |
| response body closes after a `200` | the stream is not re-requested unless `retry: 'always'` |
| `204 No Content` | no patch and no retry; `error` and `retrying` never fire, `started` and `finished` still do |
| `4xx` / `5xx` | `error` fires from the response handler with `argsRaw.status`; no patch is applied; whether `retrying` follows depends on the retry mode |
| a redirect (`3xx`) | never retried, never patched, no `error` |
| `retry: 'auto'` (the default) | never retries a non-`200` |
| `retry: 'error'` | retries `4xx` / `5xx` only |
| `retry: 'always'` | retries every status except `204` and redirects, and re-requests a `200` stream that closed |
| `Retry-After` | never read by the engine |
| SSE `retry:` field | becomes the backoff base (`retryInterval`), scaled by `retryScaler` and capped by `retryMaxWait` |
| `openWhenHidden` | `false` on `@get` only; a hidden tab aborts and rebuilds on `visibilitychange` |
| `requestCancellation` | `'auto'` by default; use `'cleanup'` for a stream anchored on a node a morph can replace |

`datastar-fetch` is the only lifecycle event; it fires on `document` with `detail.type` = `started`, `finished`, `error`, `retrying`, or `retries-failed`. There is no per-phase event name and no `datastar-retries-failed`. Guard on `detail.type`.

The default retry ladder is 1 s, 2 s, 4 s, 8 s, 16 s, then 30 s until the tenth attempt — roughly 181 s before `retries-failed`. A drain or an over-budget rejection therefore needs a final `PatchElements` that replaces the `@get` node (immediate re-subscribe) rather than relying on the ladder; `retry: 'always'` is the fallback, not the first choice. On a retry the engine itself resends the last event id it saw as `last-event-id`, which is why the server side of resume is an SSE header and not a query parameter.

### Non-SSE responses

A `200` does not have to be SSE. The engine dispatches on `Content-Type` (`plugins/actions/fetch.ts`):

- `text/html` → a `datastar-patch-elements` event whose `elements` is the body; `datastar-selector`, `datastar-mode`, `datastar-namespace`, and `datastar-use-view-transition` headers carry the rest, and a call-site `selector`/`mode` option overrides them.
- `application/json` → a `datastar-patch-signals` event whose `signals` is the body, honouring `datastar-only-if-missing`.
- `text/javascript` → the body is appended as a `<script>` element, plus the attributes named by the `datastar-script-attributes` JSON header.

So a command *can* patch elements: "commands never patch elements" is a stack rule about keeping the write path single-purpose, not something the engine enforces. Any other content type reaches the SSE reader and fails as `FetchExpectedTextEventStream`.

## Aliased Bundle Trap

`aliasify` rewrites every attribute to `data-star-*` when the bundle is built with an alias. `DatastarScript` serves the **unaliased** embedded bundle, so every example here uses `data-*`. A bring-your-own aliased bundle silently invalidates every attribute in this archive; serve the embedded bundle or rewrite the whole surface.

## Migration and Retired Forms

| Retired form | Replacement |
| --- | --- |
| `data-on-click` | `data-on:click` |
| `data-signals` with a JS expression string | JSON object (or keyed `data-signals:key`) |
| `data-bind` without a key | `data-bind:key` |
| `datastar-retries-failed` event | `data-on:datastar-fetch` with a `detail.type === 'retries-failed'` guard |
| `data-ignore` as the canvas morph boundary | `data-ignore-morph` on the canvas and its container |
| hand-written Origin checks in the app | `CsrfLayer` at the gateway; Datastar ships no CSRF rule |
