---
name: hypermedia-engine-stacks
description: Use when the task is a Rust-first hypermedia application or simulation shell: a Rama gateway with SSE, SQLx typed queries and LISTEN/NOTIFY fan-out, Maud server-rendered HTML, Datastar signals and morphing, a Bevy WASM canvas, or binary rama-ws telemetry. Task-shaped triggers include an SSE dashboard, a WASM canvas embedded in server-rendered HTML, PostgreSQL notify fan-out, a graceful drain of open streams, a stream connection budget, and a SQLx offline metadata drift gate. Do not use for SvelteKit, React, or any JS SPA stack; do not use for Axum-based hypermedia, which has its own extractor and SSE surface.
---

# Hypermedia & Engine Stacks

Rust-first architecture for server-rendered applications: Rama is the gateway, SQLx the typed persistence layer, Maud the template compiler, Datastar the client engine, and Bevy WASM plus `rama-ws` the conditional simulation tier. Five per-pillar archives carry the signatures; this syllabus carries the rules.

Fidelity command of record: `bun scripts/verify-archives.ts`. It asserts both Markdown ceilings, archive-link resolution, the provenance headers, the single corpus digest, and the retired-token sweep.

## Six-Pillar Matrix

| Pillar | Owns | Archive |
| --- | --- | --- |
| Gateway and transport | routing, extraction, SSE framing, WSS upgrade, limits, CSRF, drain | `references/rama.md` |
| Persistence and fan-out | compile-time SQL, pools, migrations, `LISTEN/NOTIFY` to `broadcast` | `references/sqlx.md` |
| Templating | compile-time HTML, escaping, single-buffer rendering | `references/maud.md` |
| Client reactivity | signals, actions, CQRS commands, Fat Morphing, retry | `references/datastar.md` |
| Simulation | ECS schedules, messages versus events, WASM build, canvas mount | `references/bevy.md` |
| High-frequency transport | binary/text frames over `rama-ws`, consumed by Bevy | `references/rama.md`, `references/bevy.md` |

Selection boundary: `framework-engine-stacks` owns SvelteKit, Axum, and other stack choices; this skill is the Rust hypermedia alternative. Queue topology belongs to `scalability`; this skill carries only the SSE/WSS transport contract.

## Non-Negotiable Hypermedia & Simulation Invariants

- **Zero-JS server runtime**: every byte of HTML comes from Maud through Rama. No Node.js, Bun, or external SSR runtime in the serving path.
- **Compile-time PostgreSQL lock-in**: `query!`/`query_as!` against PostgreSQL, `.sqlx/` committed, `cargo sqlx prepare --check` in CI. No dual-engine trait, no `#[cfg]` database gate. The isolated SQLite fallback publishes to the same in-process `broadcast` channel and never emulates `LISTEN/NOTIFY` in SQL.
- **Event-driven reactivity only**: push state over SSE or WSS. Polling, `setInterval` refetches, and Datastar interval actions are prohibited as state transport.
- **Hybrid simulation boundary**: high-frequency inputs and ticks go directly over `rama-ws` into Bevy; low-frequency HUD, inventory, and menus cross via `CustomEvent` or Datastar signals. A 60 Hz transform stream never touches the DOM.
- **No shared memory**: `SharedArrayBuffer` and cross-origin memory locks are prohibited between WASM and the DOM. Bound the `wasm-bindgen` queue instead; a hidden tab pauses `requestAnimationFrame` while WSS keeps writing.
- **Canvas morph boundary**: `data-ignore-morph` on the `<canvas>` **and** its mount container. `data-ignore` suppresses plugin processing and is not a morph boundary. Any `data-on:*` listener that must survive a patch sits on an ancestor outside the morphed region.
- **Open streams are bounded**: `ConcurrentCounter::new(max)` with the guard moved into the stream, released on `Drop`; over budget answers `503` with `Retry-After`, never `429` and never `204`. `LimitLayer`/`ConcurrentPolicy` cap in-flight `serve()` inputs only, because an SSE response completes at handoff.
- **Streams end by decision**: drain broadcasts an explicit exit, answers new streams `410 Gone` with a proxy-facing `Retry-After`, and re-anchors the `@get` node with a final `PatchElements`. A clean `200` close is not re-requested by the engine.
- **Authorization is bounded, not re-checked**: an established SSE response cannot re-authorize. Cap the stream lifetime; at expiry re-anchor under a fresh principal check, or answer `410` when the session is gone.
- **Lag is a resync signal**: `RecvError::Lagged(n)` means drop buffered state, re-query a snapshot, render it, and count it. It is not an error to log and ignore.
- **CSRF is a gateway layer**: `CsrfLayer` with trusted origins and a rejection response. Datastar ships no CSRF rule, so an application-invented origin check is not a substitute.

## Transport Status

| State | Answer | Datastar consequence |
| --- | --- | --- |
| Draining, stream route | `410 Gone` (+ `Retry-After`, proxy-facing) | `datastar-fetch` `error`; `retry: 'auto'` does not retry a 4xx, so the client needs the re-anchor patch |
| Draining, command route | `503` + `Retry-After` | error event, no retry |
| Over stream budget | `503` + `Retry-After` | error event, no retry; pair with the same re-anchor patch |
| Stream ended on purpose | `410`, never `204` | `204` is terminal before the retry gate and before the error dispatch: no event, no retry |
| Command accepted | `204 No Content` | command routes only; never a stream |

`410` is stream-only: it means permanently gone, and a deploy is not. `Retry-After` is proxy, load-balancer, and browser-facing; the Datastar engine never reads it.

## Bounded Streams and Principal Reverification

- Admit with the `ConcurrentCounter` guard inside the stream; the guard is the budget, not a request-layer permit.
- Cap the stream lifetime (a value inside the proxy idle timeout) and treat expiry as a re-subscription, not a mid-stream check: emit a final `PatchElements` that replaces the `@get` node, or answer `410` when the session is gone.
- `openWhenHidden: false` on `@get` already forces one rebuild per tab on `visibilitychange`; the lifetime bound rides that re-subscribe instead of inventing a second one.
- Prefer the re-anchor over `retry: 'always'`: the ladder is 1 s → 30 s over ten attempts (~181 s) before `retries-failed`, while a replaced node re-subscribes immediately.

## Retained and Retired Invariants

| Shipped invariant | Status | Home |
| --- | --- | --- |
| Zero-JS server runtime | carried | this syllabus |
| PostgreSQL compile-time lock-in | carried | `references/sqlx.md` |
| Polling prohibition | carried | this syllabus |
| Hybrid simulation boundary | carried and sharpened to the `Message`/`Event` lane rule | `references/bevy.md` |
| `SharedArrayBuffer` prohibition | carried, with the bounded-queue replacement | `references/bevy.md` |
| Canvas morph boundary | rewritten: `data-ignore` → `data-ignore-morph` on canvas **and** container | `references/datastar.md`, `references/bevy.md` |

## Telemetry

Server signals beside the client rule: `open_streams` (current stream budget occupancy), `broadcast_lagged_total` (`RecvError::Lagged` occurrences, i.e. resyncs), `drain_state` (accepting or draining), and `stream_rejections_total` (over-budget and drain-time admission). The client `datastar-fetch` event is the only lifecycle signal; it fires on `document` with `detail.type` = `started`, `finished`, `error`, `retrying`, or `retries-failed`. No per-phase event name exists.

## Workflow

1. **Scope the tier.** Pick the matrix row; write the one-line boundary (hypermedia only, or canvas plus WSS).
2. **Shape the data.** Append expand-contract migrations; write `query!`/`query_as!`; run `cargo sqlx prepare --workspace -- --all-targets --all-features` in the same commit.
3. **Wire the gateway.** `Router::new_with_state`, `ReadSignals` per the method rule, `CsrfLayer`, a request-concurrency `LimitLayer`, and the `ConcurrentCounter` stream budget. Commands answer `204`; streams answer `410` at drain.
4. **Render the shell.** Maud components with deterministic `id`s, serialized `data-signals` JSON spliced through escaping (never `PreEscaped`), and a single pre-sized buffer with `Render::render_to` for row lists.
5. **Fan out events.** One `PgListener::connect(url)` per replica into `tokio::sync::broadcast`; one `ConcurrentCounter`-guarded SSE route per view; `Lagged` triggers a snapshot resync.
6. **Mount simulation when required.** Bevy canvas with `data-ignore-morph`, `Message` for frame telemetry and `On<E>` for input reactions, `postcard` over `rama-ws` for high-frequency traffic, `CustomEvent` for the HUD.
7. **Verify.** `bun scripts/verify-archives.ts`, then `bun scripts/gates.ts` in the package and `bun scripts/check.ts --quick` at the workspace root. Run `cargo sqlx prepare --check` in CI.

## Anti-Pattern Matrix

| Anti-pattern | Failure | Instead |
| --- | --- | --- |
| `LimitLayer` as the open-stream cap | permit released at response handoff | `ConcurrentCounter` guard owned by the stream |
| `204` ending a stream | silent terminal: no event, no retry | `410` plus a re-anchor patch |
| Relying on `Retry-After` in the client | the engine never reads it | re-anchor, or `retry: 'always'` |
| `data-ignore` on the canvas | plugin suppression, not a morph boundary | `data-ignore-morph` on canvas and container |
| 60 Hz coordinates through signals or HTML | DOM thrashing | binary frames over `rama-ws` |
| `EventReader` for cross-frame telemetry | buffered lane used as an immediate one | `MessageReader` with `#[derive(Message)]` |
| Nested `html!` inside a loop | one allocation per row | `Render::render_to` into one buffer |
| Hand-concatenated `data-signals` JSON | escaping bypassed | serialize, then splice through Maud |
| `PgListener::connect_with(&app_pool)` | the listener holds an application-pool connection for its life | `PgListener::connect(url)` |
| `test_before_acquire(true)` everywhere | a round trip on every checkout | `test_before_acquire(false)` plus `before_acquire` on `meta.idle_for` |
| Aliased Datastar bundle | every `data-*` attribute is silently dead | serve the embedded unaliased bundle |
| SQL state without offline metadata | CI cannot build without a database | commit `.sqlx/` and gate `prepare --check` |

## Reference Archives

- `references/rama.md` — read before touching routing, SSE framing, the stream budget, CSRF, WSS upgrades, compression, or drain.
- `references/sqlx.md` — read before adding SQL, tuning the pool, writing a migration, or wiring `PgListener`.
- `references/maud.md` — read before changing templates, escaping, JSON attributes, or `Markup` conversion.
- `references/datastar.md` — read before changing attributes, signals, actions, morph boundaries, CSP, or retry behaviour.
- `references/bevy.md` — read before touching ECS schedules, WASM builds, the canvas mount, or the shell bridge.

Corpus provenance: the upstream pins are recorded per archive; the local mirror digest `sha256:7bae3f954bf1836ec270bd36ff9fe23614e398097a39297339ec5f7c72c8656b` is local-corpus scoped, because it also folds the cargo-registry crates. `bun scripts/docs-corpus.ts --check` reports `stale` for the five hand-placed reports; the pins, not the digest, are the durable anchor.
