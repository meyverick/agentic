Source: `rama@2fbd04041` · verified 2026-10-31 (workspace `0.5.0`; `0.4.0` is the newest release, so HEAD is post-release)
Re-verify when: the rama pin moves, `Sse`/`PatchElements`/`ConcurrentCounter` change modules, or a first-class drain API lands.

# Rama — Gateway, SSE, WSS, and Drain

Rama owns everything between the socket and a rendered fragment: routing, extraction, SSE framing, WebSocket upgrades, admission limits, CSRF, compression, and graceful shutdown. Datastar wire types are `rama::http::sse::datastar`; the transport is `rama::http::service::web::response::Sse` over `rama::http::sse::server::{KeepAlive, KeepAliveStream}`.

## Service, Layer, Router

- `Service<Input>` is `async fn serve(&self, input) -> Result<Output, Error>` — a shared reference, no `poll_ready` handshake, so request state is cheap to clone across workers.
- `Layer::into_layer(inner)` wraps a service; compose outer-to-inner in the order you want them applied.
- `Router::new_with_state(state)` plus `extract::State<T>` extracts a cloned application state without a global. `match_service!` dispatches a request into per-branch services when one handler would otherwise carry a method match.
- Extensions are append-only with parent-chain lookup: a child request sees parent inserts, a parent never sees a child insert. `#[derive(Extension)]` and `AddInputExtensionLayer` are the supported path.
- `ReadSignals<T>` is the Datastar signal extractor: `GET`/`DELETE` read the URL-encoded `datastar` query parameter, every other method (including `QUERY`) reads the JSON body.
- `ReadSignals<Option<T>>` absorbs a missing `?datastar=` because the missing value is coerced to `"null"`. `Option<ReadSignals<T>>` yields `None` when the `Datastar-Request` header is absent. They are different contracts; pick the one you mean.
- `DatastarScript::default()` serves the embedded **unaliased** Datastar 1.0.4 bundle; `DatastarSourceMap::default()` serves its map. The script response adds **no** nonce attribute, so strict CSP needs the shell to render `<script type="module" src="/assets/datastar.js" nonce="…">` itself.

```rust
Router::new_with_state(state)
    .with_get("/", handlers::index)
    .with_get("/rows/stream", handlers::stream)
    .with_post("/rows", handlers::create)      // command: 204, no body
    .with_get("/assets/datastar.js", DatastarScript::default())
```

## SSE

`Sse::new(stream)` frames an event stream. Keep-alive uses `KeepAliveStream::new(KeepAlive::new(), inner)`; the corpus example wraps a `stream_fn(move |mut yielder| …)` that yields `Result<Event<_>, _>`.

`Sse::into_response` already sets `Cache-Control: no-cache`, `Content-Type: text/event-stream`, and a `Connection: keep-alive` that is filtered for h2+. Do not hand-roll them.

```rust
Sse::new(KeepAliveStream::new(
    KeepAlive::new(),
    stream_fn(move |mut yielder| async move {
        let _permit = permit;                     // stream-owned budget, dropped with the stream
        loop {
            match rx.recv().await {
                Ok(patch) => yielder.yield_item(patch.try_into_sse_event()).await,
                Err(RecvError::Lagged(lost)) => resync(&mut rx, lost).await,
                Err(RecvError::Closed) => break,
            }
        }
    }),
))
```

| Type | Constructor / builder | Notes |
| --- | --- | --- |
| `PatchElements` | `new(NonEmptyStr)`, `new_remove(selector)` | defaults to `ElementPatchMode::Outer`; a fragment patch needs `.with_mode(Inner)` |
| modes | `Outer`, `Inner`, `Replace`, `Prepend`, `Append`, `Before`, `After`, `Remove` | only `Outer` and `Inner` morph; the rest reset state |
| `PatchSignals<JsonEventData<T>>` | `new(..)`, `.only_if_missing(true)` | RFC 7396 merge patch; `null` deletes a signal |
| `ExecuteScript` | `new(NonEmptyStr)` | sugar for a script element patch |
| `DatastarEvent<JsonEventData<T>>` | — | crate alias for `Event<EventData<T>>` |
| conversions | `try_into_sse_event()`, `try_into_datastar_event()` | both return `Result`; there is no infallible variant |

`PatchElements::new` takes `NonEmptyStr`; build it with `NonEmptyStr::try_from(html)` for dynamic markup (the `non_empty_str!` macro panics on an empty value) and use the same bridge for any Maud fragment.

## Transport Status

One table owns drain, capacity, and command answers. The Datastar consequence column is the reason the rule exists.

| State | Answer | Datastar consequence |
| --- | --- | --- |
| Draining, stream route | `410 Gone` (+ `Retry-After`, proxy-facing) | `datastar-fetch` `error`; `retry: 'auto'` does not retry a 4xx, so the client needs the re-anchor patch |
| Draining, command route | `503` + `Retry-After` | error event, no retry |
| Over stream budget | `503` + `Retry-After` | error event, no retry; pair with the same re-anchor patch |
| Stream ended on purpose | `410`, never `204` | `204` is terminal before the retry gate and before the error dispatch: no event, no retry |
| Command accepted | `204 No Content` | command routes only; never a stream |

`Retry-After` is proxy, load-balancer, and browser-facing: the Datastar engine never reads it. `Sse` already sets the cache and connection headers.

## Limits and Admission

- `LimitLayer` with `ConcurrentPolicy` or `RatePolicy` caps in-flight `serve()` inputs. An SSE response completes at handoff (`Sse::into_response` is synchronous), so the permit is released **before the first event**: it never bounds open streams.
- The open-stream budget is `ConcurrentCounter::new(max)` plus `ConcurrentTracker::try_access()` (the trait must be in scope). Move the returned guard into the stream so `Drop` releases it when the response body ends. Over budget answers `503` + `Retry-After`, never `429` and never `204`.
- `KeyedRatePolicy::abort(ClientIpRateKey::new(), Rate::per_sec(n))` adds a single-node per-IP cap. Size `set_max_keys` (65 536 default) and `set_idle_timeout` (clamped to the burst-refill time), raise `ClientIpRateKey::set_ipv6_prefix` when a routed `/48` would exhaust the default `/64` bucket budget, and decide `set_missing_key_allowed` explicitly. `RateKeyCapacityReached` is distinct from `LimitReached`.
- Multi-replica rate limiting is a distributed store or the edge; the in-memory policy is one node's view.

## CSRF

`CsrfLayer::new().add_trusted_origin("https://app.example.com")?` with `.with_rejection_response(..)` is the CSRF mechanism for mutating verbs; rejections default to `403 Forbidden`. `GET`, `HEAD`, and `OPTIONS` are exempt; `QUERY` is deliberately not exempt because it is not CORS-safelisted. Datastar ships no CSRF rule of its own, which is why the gateway layer is mandatory rather than an application-invented origin check.

## WebSockets (WSS)

`WebSocketAcceptor::new().into_service(handler)` accepts upgrades over HTTP/1.1 and over HTTP/2 and HTTP/3 Extended `CONNECT`. H1 `GET` and H2/H3 `CONNECT` are separate registrations, and HTTP/2 needs `h2_mut().set_enable_connect_protocol()`. `UpgradeLayer` makes the upgrade optional (a rejected upgrade falls through instead of failing the request).

- Verify principal and `Origin` at upgrade time; a socket cannot re-authenticate in place.
- Bound the outbound queue and complete the close handshake on shutdown; an unbounded sender turns a slow consumer into heap growth.
- Resume with the typed `LastEventId` header extractor rather than a hand-parsed string.
- Message frames carry `Message::Binary` (`postcard`) or `Message::Text`; the client must set `binaryType = "arraybuffer"` for binary frames.

## Graceful Drain

`rama::graceful` re-exports `tokio_graceful`: `Shutdown::default()`, `guard()`, `spawn_task` (future owns a weak guard) and `spawn_task_fn` (task receives the guard), `shutdown_with_limit(..)`, `default_signal`.

1. Run the listener under the guard (`Executor::graceful(guard)`), clone a weak guard (`guard.clone_weak()`) for the watcher, and hold a `ShutdownGuard` in each stream task; await `into_cancelled()`.
2. Broadcast an explicit `Exit` message on the event channel; every stream ends on that message rather than on a poll of the guard.
3. From the first cancelled moment, answer new stream requests `410 Gone` and new commands `503`, both with `Retry-After`.
4. End the process with `shutdown_with_limit(..)` as the hard ceiling.

`410` is stream-only: `410` means permanently gone and a deploy is not. The drain window must sit above the 15 s keep-alive so idle streams notice the close, and below the proxy idle timeout so the proxy does not reuse a dead connection. The corpus returns a bare `410`; `Retry-After` is guidance for the proxy tier, not a Datastar-read header.

The client half is mandatory: a cleanly closed `200` stream is **not** re-requested by the Datastar engine. End the drain with a final `PatchElements` that replaces the `@get` node (fresh subscription, immediate), or opt the page into `retry: 'always'` (1 s→30 s ladder, 10 attempts, ~181 s before `retries-failed`). Rank the re-anchor first.

## Compression, Buffering, Partial Updates

`StreamCompressionLayer` defaults to `DefaultStreamPredicate` (images excluded) but **not** to excluding `text/event-stream`; add `NotForContentType::SSE` or do not compress the stream. `always_flush` already treats `text/event-stream` through `is_streaming_content_type`, so `X-Accel-Buffering: no` is an nginx-facing header rather than a rama-side requirement. `PartialUpdates` is a separate non-SSE strategy — `text/html` with `<?marker>` plus `<template for>`, native in Chrome 148+ and polyfilled elsewhere — selected for first-paint panel fan-out, never mixed into the SSE narrative.

## Telemetry

Emit four server gauges/counters beside the client `datastar-fetch` rule: `open_streams` (current `ConcurrentCounter` occupancy), `broadcast_lagged_total` (`RecvError::Lagged` occurrences, i.e. resyncs), `drain_state` (accepting or draining), and `stream_rejections_total` (over-budget and drain-time admission). A wide event per request/stream completion carries route, status, duration, tenant, and these values.

## Retired and Replacement

| Retired form | Replacement |
| --- | --- |
| `.into_sse_event()` | `try_into_sse_event()` |
| `ElementPatchMode::Morph` | `ElementPatchMode::Outer` (or `Inner` for a fragment) |
| `Shutdown::shutdown_with_limit` misuse as `spawn_signal_handler()` / `.graceful(..)` | `default_signal`, `spawn_task`, `spawn_task_fn`, `shutdown_with_limit` |
| application-invented origin checks | `CsrfLayer` |
| `LimitLayer` as the open-stream cap | `ConcurrentCounter` guard moved into the stream |
