---
name: hypermedia-engine-stacks
description: Recommend, scaffold, and enforce the Rust-first hypermedia architecture (Rama, SQLx, Maud, Datastar) with conditional Bevy WASM simulation and Rama WSS transport. Use when designing web applications, selecting backend or frontend stacks, scaffolding real-time SSE/WebSocket pipelines, or embedding interactive 2D/3D WASM canvases. Do not use for legacy Node.js, Bun, or SPA framework scaffolding.
---

# Hypermedia & Engine Stacks

## Summary
Guidance and architectural rules for scaffolding the workspace's Rust-first hypermedia and simulation stack. Every tier prioritizes compile-time verification, zero-cost server-side HTML generation, event-driven streaming, and strict separation between DOM hypermedia and high-frequency canvas simulations.

## Non-Negotiable Hypermedia & Simulation Invariants
- **Zero-JS Server Runtime**: Deliver web interfaces and APIs exclusively through the Rust hypermedia stack (Rama + SQLx + Maud + Datastar). Never introduce Node.js, Bun, or external SSR runtimes.
- **Compile-Time Persistence Lock-In**: Standardize relational persistence on PostgreSQL via SQLx compile-time macros (`query!`, `query_as!`). Never construct dual-engine abstraction layers or `#[cfg]` database feature gates. For isolated local/edge sub-projects requiring SQLite, decouple reactivity via in-process `tokio::sync::broadcast` channels.
- **Event-Driven Reactivity Only**: Client polling is prohibited. Stream state transitions via Rama Datastar SSE (`PatchElements`, `PatchSignals`) triggered by PostgreSQL `LISTEN/NOTIFY` or in-process broadcast channels.
- **Hybrid Simulation Boundary**: When embedding a Bevy WASM `<canvas>` inside a Maud/Datastar shell:
  - Route high-frequency simulation traffic (inputs, transforms, authoritative ticks) directly between Bevy WASM and Rama WSS endpoints, bypassing the DOM.
  - Route low-frequency UI coordination (HUD, inventory, menus, scores) via window `CustomEvent` dispatches or Datastar signal mutations through `wasm-bindgen`.
  - Never use `SharedArrayBuffer` or shared memory layouts between WASM and the DOM.

## Core Mental Model & Preferred Tiers
- **Backend & Gateway (Rama)**: Manages HTTP routing, modular middleware, connection lifecycles, native Datastar Server-Sent Events (`rama::http::sse::datastar`), and WebSocket (`WSS`) upgrades.
- **Persistence (SQLx + PostgreSQL)**: Enforces compile-time verified asynchronous queries (`query!`, `query_as!`), connection pooling, and schema migrations locked to PostgreSQL. Drives multi-instance reactivity via native `LISTEN/NOTIFY`.
- **Templating (Maud)**: Generates type-safe, zero-allocation HTML fragments compiled directly into the Rust binary via `html!` macros.
- **Client Reactivity (Datastar)**: Provides declarative DOM morphing (`PatchElements`), reactive client-side signals (`PatchSignals`), and zero-build hypermedia interactivity without Virtual DOM overhead.
- **High-Frequency Simulation (Conditional Bevy WASM)**: Executes local physics prediction, continuous rendering, and interactive 2D/3D scenes inside a Maud-rendered `<canvas>` when declarative DOM morphing is insufficient.
- **High-Frequency Transport (Conditional Rama WSS)**: Streams raw binary or JSON WebSocket frames directly between Rama and Bevy WASM for sub-frame multiplayer inputs, cursors, and low-latency telemetry.

## Architectural Selection Matrix

| Workload Domain | Recommended Architecture & Engine | Rationale & Trade-offs |
| :--- | :--- | :--- |
| Full-Stack Web Application | Rama + Maud + Datastar | Eliminates client bundle builds and JS SSR runtimes via server-streamed hypermedia. |
| Relational Persistence | PostgreSQL + SQLx (`migrations/`) | Guarantees compile-time SQL verification via `sqlx-data.json` and zero-broker pub/sub. |
| Real-Time UI & State Sync | PostgreSQL `LISTEN/NOTIFY` + Rama Datastar SSE | Pushes surgical DOM fragments and signal updates across instances without polling. |
| Local/Edge Embedded Storage | SQLite + SQLx + `tokio::sync::broadcast` | Standalone fallback for isolated CLI/edge tools; decouples events from DB engine. |
| Interactive 2D/3D Simulation | Maud `<canvas>` + Bevy WASM | Native ECS execution and WebGL2/WebGPU rendering isolated from DOM layout cycles. |
| Sub-Frame Multiplayer & Telemetry | Rama WSS + Bevy WASM | Bypasses DOM and SSE framing for high-tick binary/JSON state synchronization. |
| Shell-to-Canvas HUD Coordination | Datastar Signals + DOM `CustomEvent` (`wasm-bindgen`) | Low-frequency bridge for menus, inventory, and scores without shared memory locks. |
| Heavy Background Compute | Rust (Tokio `spawn_blocking` / Rayon) | Offloads CPU-intensive work from async Rama request and stream reactors. |

## Database & Reactivity Doctrine
1. **Strict PostgreSQL Lock-In**:
   - Bind SQLx `query!` and `query_as!` macros directly to PostgreSQL.
   - Never construct dual-engine abstraction traits or maintain parallel `#[cfg]` feature gates across SQLite and PostgreSQL.
2. **Zero-Broker Pub/Sub**:
   - Hook `sqlx::postgres::PgListener` directly into Rama SSE pipelines to broadcast `PatchElements` and `PatchSignals` upon database state transitions.
3. **Decoupled Embedded Exception**:
   - When an isolated sub-project strictly requires embedded SQLite, never emulate `LISTEN/NOTIFY` in SQL. Route application events through an in-process `tokio::sync::broadcast` channel feeding the Rama SSE responder.

## Hybrid Simulation Boundary (Bevy WASM + Datastar)
When a view requires continuous 60+ FPS rendering or physics alongside standard UI controls:
1. **High-Frequency Path (Direct Rama WSS)**:
   - Connect Bevy WASM directly to Rama's WebSocket endpoint.
   - Stream player inputs, entity transforms, and authoritative server ticks over binary (Postcard/Bincode) or compact JSON frames, bypassing JavaScript and Datastar entirely.
2. **Low-Frequency Path (DOM `CustomEvent` & Signals)**:
   - Render the surrounding HUD, lobbies, pause menus, and inventory panels using Maud and Datastar.
   - Cross the WASM-to-DOM boundary exclusively via window `CustomEvent` dispatches or Datastar signal updates invoked through `wasm-bindgen` / `web-sys`.
3. **Prohibition of Shared Memory Buffers**:
   - Never use `SharedArrayBuffer` or cross-origin memory locks between Bevy WASM and the DOM. UI-frequency updates gain zero measurable throughput from shared memory while incurring severe synchronization fragility.

## Operational Workflow
1. **Scope Intake & Schema Definition**
   - Determine whether the feature is pure hypermedia (Maud + Datastar) or requires a hybrid simulation canvas (Bevy WASM + WSS).
   - Author expand-contract SQL migrations in `migrations/` and verify queries against PostgreSQL.
2. **View & Handler Assembly**
   - Author modular Maud components using the `html!` macro with embedded Datastar attributes (`data-signals`, `data-on-click`, `data-bind`).
   - Register routes and middleware in the Rama service stack, mounting SSE endpoints for reactive subscriptions.
3. **Simulation & Transport Wiring (If Applicable)**
   - Mount a dedicated Rama WebSocket upgrade handler for sub-frame simulation traffic.
   - Compile the Bevy target to `wasm32-unknown-unknown` via `wasm-bindgen` and mount the canvas inside a Maud container with `data-ignore` to prevent Datastar morphing collisions.
4. **Offline Metadata & CI Verification**
   - Execute `cargo sqlx prepare --workspace` prior to committing so CI verifies all SQL macros hermetically without a live database.

## Anti-Patterns & Edge Cases
- **Client Polling**: Never use `setInterval` or Datastar polling loops to fetch state updates; push mutations exclusively over Rama Datastar SSE or WSS.
- **Unprotected Canvas Morphing**: Always annotate the parent element of a Bevy `<canvas>` with `data-ignore` (or preserve keys) so Datastar `PatchElements` morphs do not destroy the active WebGL/WebGPU context.
- **Blocking the Async Reactor**: Never run synchronous file I/O, cryptographic hashing, or heavy simulation steps inside Rama request handlers; delegate to `tokio::task::spawn_blocking` or a Rayon pool.
- **DOM Thrashing on High-Tick Data**: Never stream 60Hz entity coordinates through Datastar signals or Maud HTML fragments; route continuous telemetry over Rama WSS directly into Bevy.

## Reference Archives
- **PostgreSQL Event Streaming & Broadcast Fallback**: Consult `references/postgres-listen-notify.md` when wiring `PgListener` or `tokio::sync::broadcast` into Rama Datastar SSE endpoints.
- **Bevy WASM & Datastar Interop Patterns**: Consult `references/bevy-datastar-bridge.md` when bridging Bevy ECS events with Datastar signals and Rama WebSockets.
