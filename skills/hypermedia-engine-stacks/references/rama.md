Re-verify when: the rama pin recorded in `scripts/provenance.lock` moves, `Sse`/`PatchElements`/`ConcurrentCounter` change modules, or a first-class drain API lands.

# Rama — Gateway, SSE, WSS, and Drain

Rama owns everything between the socket and a rendered fragment: routing, extraction, SSE framing, WebSocket upgrades, admission limits, CSRF, compression, and graceful shutdown. Datastar wire types are `rama::http::sse::datastar`; the transport is `rama::http::service::web::response::Sse` over `rama::http::sse::server::{KeepAlive, KeepAliveStream}`.

## Service, Layer, Router

- `Service<Input>` is `async fn serve(&self, input) -> Result<Output, Error>` — a shared reference, no `poll_ready` handshake, so request state is cheap to clone across workers.
- `Layer::into_layer(inner)` wraps a service; compose outer-to-inner in the order you want them applied.
- `Router::new_with_state(state)` plus `extract::State<T>` extracts a cloned application state without a global. `match_service!` dispatches a request into per-branch services when one handler would otherwise carry a method match.
- Two state kinds, and the split decides where a value lives. **Static** state sits on the service struct or is captured by a closure. **Dynamic** state is injected as an extension on a request, response, or connection that implements `ExtensionsRef`. Clients, pools, and configuration are static; per-request and per-connection facts — a principal, a peer address, a negotiated subprotocol — are dynamic.
- Extensions are append-only with parent-chain lookup: a child request sees parent inserts, a parent never sees a child insert. `#[derive(Extension)]` plus `AddInputExtensionLayer` is the supported insert path; `ExtensionsRef::extensions()` reads and `ExtensionsMut::extensions_mut()` replaces the store, so a request-local overlay never mutates a store shared by cloned inputs.
- Read a group in one pass instead of one lookup per type: `get_many_ref::<(A, B)>()` borrows, `get_many_arc::<(A, B)>()` returns owned `Arc`s, and `#[derive(FromExtensions)]` over a struct of `Option<&'a T>` fields builds a view of whatever is present (`View::from_extensions(&ext)`). Every slot is `Option`, because optional middleware state is absent unless that middleware ran: handle absence instead of unwrapping.
- `ReadSignals<T>` is the Datastar signal extractor: `GET`/`DELETE` read the URL-encoded `datastar` query parameter, every other method (including `QUERY`) reads the JSON body.
- `ReadSignals<Option<T>>` absorbs a missing `?datastar=` because the missing value is coerced to `"null"`. `Option<ReadSignals<T>>` yields `None` when the `Datastar-Request` header is absent. They are different contracts; pick the one you mean.
- `TypedHeader<T>` extracts any header that implements `HeaderDecode` (`extract::TypedHeader<UserAgent>`). Make it `Option<TypedHeader<T>>` for a header that may be absent: a bare `TypedHeader` rejects with `TypedHeaderRejection` on a missing value, which turns an optional header into a hard `400`.
- `DatastarScript::default()` serves the embedded **unaliased** Datastar bundle; `DatastarSourceMap::default()` serves its map. The script response adds **no** nonce attribute, so strict CSP needs the shell to render `<script type="module" src="/assets/datastar.js" nonce="…">` itself.

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
| `PatchElements` fields | `with_selector(..)`, `with_mode(..)`, `with_namespace(..)`, `with_use_view_transition(true)`, `with_view_transition_selector(..)` | written as the `selector` / `mode` / `namespace` / `useViewTransition` / `viewTransitionSelector` data lines, each omitted when left at its default |
| `Namespace` | `Html` (default), `Svg`, `MathMl` | the DOM namespace the patched elements are created in; set it or an SVG patch lands as inert HTML |
| modes | `Outer`, `Inner`, `Replace`, `Prepend`, `Append`, `Before`, `After`, `Remove` | only `Outer` and `Inner` morph; the rest reset state |
| `PatchSignals<JsonEventData<T>>` | `new(..)`, `.with_only_if_missing(true)` or `.set_only_if_missing(true)` | RFC 7396 merge patch; `null` deletes a signal. `only_if_missing` is the field and the wire line is `onlyIfMissing`; neither is the builder name. |
| `ExecuteScript` | `new(NonEmptyStr)`, `.with_auto_remove(bool)`, `.with_attribute(..)` | sugar: its wire event is **`datastar-patch-elements`**, since `ExecuteScript::TYPE` is `EventType::PatchElements`; it hardcodes `selector body`, `mode append`, and wraps the payload in a `<script>` element |
| `DatastarEvent<JsonEventData<T>>` | — | crate alias for `Event<EventData<T>>` |
| conversions | `try_into_sse_event()`, `try_into_datastar_event()` | both return `Result`; there is no infallible variant |

`PatchElements::new` takes `NonEmptyStr`; build it with `NonEmptyStr::try_from(html)` for dynamic markup (the `non_empty_str!` macro panics on an empty value) and use the same bridge for any Maud fragment.

### Resume

Resume is an SSE mechanism, not a WebSocket one: the browser replays the last id it saw in the `Last-Event-ID` request header on reconnect, and the Datastar engine tracks the `id:` field of every event it applies. Three parts, all required.

1. **Assign a stable id to every patch.** `Event::id(..)` is fallible — it rejects `\n`, `\r`, and `\0` — so the consuming builder is `try_with_id`, not `with_id`.
2. **Extract the header typed.** `Option<TypedHeader<LastEventId>>` (`rama::http::headers::LastEventId`, `rama::http::service::web::extract::TypedHeader`); the `Option` is the whole point, because a first connect has no header and an un-optionaled extractor rejects it.
3. **Replay from that id** before the live stream resumes. An id the server no longer holds — pruned, or from a previous deploy — falls back to the same snapshot-then-subscribe path `RecvError::Lagged` uses, so resume and resync converge on one code path instead of two.

```rust
async fn stream(last_id: Option<TypedHeader<LastEventId>>) -> impl IntoResponse {
    let after: Option<u64> = last_id.and_then(|id| id.as_str().parse().ok());
    // replay patches after `after`, then continue from the live receiver
}

let event = patch.try_into_sse_event()?.try_with_id(event_id)?;   // writes `id: <event_id>`
yielder.yield_item(event).await;
```

A `204` and a re-anchored node both carry no id to replay from, which is why the drain path re-anchors rather than resuming; the client half of that rule lives in *Graceful Drain*.

## Transport Status

One table owns drain, capacity, and command answers. The Datastar consequence column is the reason the rule exists.

| State | Answer | Datastar consequence |
| --- | --- | --- |
| Draining, stream route | `410 Gone` (+ `Retry-After`, proxy-facing) | `datastar-fetch` `error`; `retry: 'auto'` does not retry a 4xx, so the client needs the re-anchor patch |
| Draining, command route | `503` + `Retry-After` | error event, no retry |
| Over stream budget | `503` + `Retry-After` | error event, no retry; pair with the same re-anchor patch |
| Stream ended on purpose | `410`, never `204` | `204` applies no patch and emits no `error` or `retrying` event; `started` and `finished` still fire |
| Command accepted | `204 No Content` | command routes only; never a stream |

`Retry-After` is proxy, load-balancer, and browser-facing: the Datastar engine never reads it. `Sse` already sets the cache and connection headers.

## Limits and Admission

Two lanes, two answers: the rate lane is about request rate and answers `429`, the capacity lane is about in-flight work and answers `503` with `Retry-After`. They are sized against different resources and must not be reported as one another.

Import paths, since both lanes read as `Limit*` otherwise: `rama::layer::limit::LimitLayer`, `rama::layer::limit::policy::{ConcurrentCounter, ConcurrentPolicy, ConcurrentTracker, LimitReached, RatePolicy, RateLimitReached}`, and `rama::net::rate::{ClientIpRateKey, KeyedRatePolicy}` — the per-key policy lives in `rama-net`, not with the limit layer.

Stack rate **outside** concurrency: the `RatePolicy` layer outermost, per-route `ConcurrentPolicy` inside. A rate-rejected request then never consumes a concurrency slot, so a burst of rejected requests cannot occupy the capacity lane (`examples/src/http_rate_limit.rs`).

### Rate lane

- `RatePolicy::abort(Rate::per_sec(n))` caps one shared request rate; `KeyedRatePolicy::abort(ClientIpRateKey::new(), Rate::per_sec(n))` gives every client its own bucket. Both reject with `RateLimitReached`, whose `IntoResponse` is `429 Too Many Requests` plus a typed `Retry-After` (`rama-http/src/service/web/endpoint/response/into_response.rs`). `RatePolicy::wait(..)` paces instead of rejecting, for a route that must never fail.
- `KeyedRatePolicy` is `rama::net::rate::KeyedRatePolicy`, the per-key sibling of the shared `RatePolicy`; it is not a `LimitLayer` primitive.
- Size `set_max_keys` (65 536 default) and `set_idle_timeout` (clamped to the burst-refill time) together. **Lower** `ClientIpRateKey::set_ipv6_prefix` to aggregate more clients per bucket: the default is `/64`, and one routed `/48` holds 65 536 of them — exactly the default key capacity. `128` keys the exact address. Decide `set_missing_key_allowed` explicitly. `RateKeyCapacityReached` (bucket cache full) is distinct from `LimitReached` (a spent budget).
- Multi-replica rate limiting is a distributed store or the edge; the in-memory policy is one node's view.

### Capacity lane

- `LimitLayer::new(ConcurrentPolicy::max(n))` bounds in-flight `serve()` inputs. An SSE response completes at handoff (`Sse::into_response` is synchronous), so the permit is released **before the first event**: it never bounds open streams, and it is not the stream budget.
- The open-stream budget is `ConcurrentCounter::new(max)` plus `ConcurrentTracker::try_access()` (the trait must be in scope). Move the returned guard into the stream so `Drop` releases it when the response body ends. Over budget answers `503` + `Retry-After`, because the resource is temporary occupancy rather than a spent budget.

### Body cap

The third admission control, and the one that bounds a single request rather than a rate or an occupancy. `BodyLimitLayer::new(n)` (`rama::http::layer::body_limit::BodyLimitLayer`) caps the request body per route or service; the transport-level `rama::http::BodyLimit` caps it connection-wide before HTTP is decoded, and when both are present the smaller request limit wins (`rama-http/src/layer/body_limit.rs`). CSRF checks the origin, the body cap bounds the payload, and the stream guard bounds occupancy — three different resources, three separate layers, none of them a substitute for another.

## CSRF

`CsrfLayer::new().add_trusted_origin("https://app.example.com")?` with `.with_rejection_response(..)` is the CSRF mechanism for mutating verbs; rejections default to `403 Forbidden`. `GET`, `HEAD`, and `OPTIONS` are exempt; `QUERY` is deliberately not exempt because it is not CORS-safelisted. Datastar ships no CSRF rule of its own, which is why the gateway layer is mandatory rather than an application-invented origin check.

## WebSockets (WSS)

`WebSocketAcceptor::new().into_service(handler)` accepts upgrades over HTTP/1.1 `GET` and over HTTP/2 and HTTP/3 Extended `CONNECT`. Those are two router registrations, not one: `with_get` for the H1 handshake and `with_connect` for the extended-CONNECT handshake, and HTTP/2 only routes the latter after `h2_mut().set_enable_connect_protocol()` runs on the server. `UpgradeLayer` makes the upgrade optional, so a rejected upgrade falls through instead of failing the request.

```rust
// H1 handshake and the H2/H3 extended CONNECT handshake mount the same service.
Router::new()
    .with_get("/chat", WebSocketAcceptor::new().into_service(service_fn(chat)))
    .with_connect("/chat", WebSocketAcceptor::new().into_service(service_fn(chat)))

let mut h2 = HttpServer::new_h2(Executor::graceful(guard.clone()));
h2.h2_mut().set_enable_connect_protocol();      // without this, H2 CONNECT is not routed

// One socket handler: a bounded producer feeds the sink, recv drives the loop.
async fn chat(mut ws: ServerWebSocket) -> Result<(), Infallible> {
    let (tx, mut rx) = tokio::sync::mpsc::channel::<Message>(64);   // bounded: a slow consumer
    // `upstream` is the application's broadcast receiver, supplied by the handler state.
    tokio::spawn(async move {                                       //   backpressures here, not into the heap
        while let Some(msg) = upstream.recv().await {
            if tx.send(msg).await.is_err() { break; }
        }
    });
    loop {
        tokio::select! {
            result = ws.recv_message() => match result {
                Ok(Message::Text(_) | Message::Binary(_)) => { /* domain input */ }
                Ok(Message::Close(_)) => return Ok(()),             // peer ended the handshake
                Ok(_) => {}                                          // ping/pong/frame
                Err(err) if err.is_connection_error() => return Ok(()),
                Err(err) => { tracing::error!("websocket failed: {err}"); return Ok(()); }
            },
            Some(out) = rx.recv() => {
                if ws.send_message(out).await.is_err() { return Ok(()); }
            }
        }
    }
}
```

- `recv_message()` yields `Result<Message, ProtocolError>`, so a closed peer is a `Message::Close(_)` and a dropped connection is an `Err`; neither is an empty message. Match both, and treat `ProtocolError::ResetWithoutClosingHandshake` as a drop, not a fault.
- Verify principal and `Origin` at upgrade time; a socket cannot re-authenticate in place.
- Bound the outbound queue and complete the close handshake on shutdown; an unbounded sender turns a slow consumer into heap growth. Because `send_message` flushes, the sink sits in `select!` beside `recv_message`, never behind it.
- Subprotocols are negotiated from an allow list: `protocols(Some(SecWebSocketProtocol::new(non_empty_str!("v1"))))` accepts only the protocols the server names, and an unlisted request is denied; use `SecWebSocketProtocol::try_new(NonEmptyStr::try_from(offer)?)` when the value is not a trusted literal, because `new` skips RFC 6455 token validation. `protocols_flex(true)` also accepts a request that offers none (and, with no server list at all, accepts any offer). `echo_protocols()` presets the echo service's three constants — it is not a general reflection switch.
- permessage-deflate is opt-in and feature-gated: `.per_message_deflate()` or `.per_message_deflate_with_config(..)` adds the extension, while the `_overwrite_extensions` variants replace the whole extension set. `.extensions(Some(..))` also overwrites, so pick one path.
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

`StreamCompressionLayer` defaults to `DefaultStreamPredicate` (images excluded) but **not** to excluding `text/event-stream`; add `NotForContentType::SSE` or do not compress the stream. `always_flush` already treats `text/event-stream` through `is_streaming_content_type`, so `X-Accel-Buffering: no` is an nginx-facing header rather than a rama-side requirement. `PartialUpdates` is a separate non-SSE strategy — `text/html` with `<?marker>` plus `<template for>`, shipping in current Chromium and polyfilled elsewhere — selected for first-paint panel fan-out, never mixed into the SSE narrative.

## Telemetry

Emit four server gauges/counters beside the client `datastar-fetch` rule: `open_streams` (current `ConcurrentCounter` occupancy), `broadcast_lagged_total` (`RecvError::Lagged` occurrences, i.e. resyncs), `drain_state` (accepting or draining), and `stream_rejections_total` (over-budget and drain-time admission). A wide event per request/stream completion carries route, status, duration, tenant, and these values.

The emitter is `TraceLayer` (`rama::http::layer::trace::TraceLayer`) with `.on_eos(..)`. `OnEos::on_eos(trailers, stream_duration, span)` fires when the streaming body ends, which is the only moment a duration means anything for a stream; `on_response` fires at handoff, so a wide event built there reports every SSE stream as zero-duration. Use `on_eos` for the duration and `on_response` for the status line.

## Retired and Replacement

| Retired form | Replacement |
| --- | --- |
| `.into_sse_event()` | `try_into_sse_event()` |
| `ElementPatchMode::Morph` | `ElementPatchMode::Outer` (or `Inner` for a fragment) |
| `Shutdown::shutdown_with_limit` misuse as `spawn_signal_handler()` / `.graceful(..)` | `default_signal`, `spawn_task`, `spawn_task_fn`, `shutdown_with_limit` |
| application-invented origin checks | `CsrfLayer` |
| `LimitLayer` as the open-stream cap | `ConcurrentCounter` guard moved into the stream |
