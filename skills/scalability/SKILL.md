---
name: scalability
description: Design and implement queue-worker architectures, hub-and-spoke state coordination, backpressure controls, and real-time event streaming via WebSockets, SSE, and LISTEN/NOTIFY. Use when designing background job processing, worker topologies, push pipelines, or event-driven control loops.
---

# Scalability & Realtime Doctrine

## Summary
Execution blueprints for non-blocking asynchronous work, hub-and-spoke worker coordination, explicit backpressure, and push-based real-time transport.

## Core Mental Model
- **Coordinator Authority**: Axum/Tokio on Rust acts as the sole state owner via SQLx on PostgreSQL. It manages the primary state machine (`queued → running → succeeded | failed | cancelled`) with stable unique IDs and actor scoping.
- **Stateless Workers**: Disposable, horizontally scalable Rust workers (Axum + Rayon). Workers pull jobs via queue/RPC, report progress and results, and emit heartbeats. Lost workers trigger idempotent re-queuing.
- **Topology**: Strict hub-and-spoke (coordinator ↔ workers). Emergent peer-to-peer meshes are forbidden.
- **Deterministic State**: State transitions are pure functions over events (`delta: (State, Event) -> State`) without side effects. Hardware clocks (`Instant::now()`) are forbidden inside transition logic; logical timestamps must arrive via the ingress gateway boundary.

## Real-Time & Transport Layer
- **Live Push Default**: Real-time state flows over PostgreSQL LISTEN/NOTIFY and Tokio broadcast channels to Axum WebSocket/SSE endpoints for reactive client stores.
- **Inter-Worker Transport**: Backend inter-module and worker communication uses gRPC via `tonic` and Protobuf.
- **Event-Driven Control Loops**: Loops trigger strictly on discrete events (state transitions, inbound payloads, threshold crossings), never blind intervals.
- **Constrained Polling Fallback**: Polling is permitted only when upstream services lack webhooks or SSE. When required, configure the coarsest acceptable interval, protected by single-flight execution, timeouts, and deduplication.

## Implementation Matrix

| Mechanism | Preferred Primitive | Configuration & Guarantees |
| :--- | :--- | :--- |
| Job Queuing | PostgreSQL Queue Table via SQLx | At-least-once delivery, row locking (`FOR UPDATE SKIP LOCKED`), deduplication keys. |
| Heavy Execution | Rust + Rayon Worker Pools | Offloaded from Tokio async runtime; bounds prevent thread pool exhaustion. |
| Client State Sync | Axum WebSockets / SSE | Push state directly to Svelte 5 stores; client polling is an anti-pattern. |
| Internal RPC | gRPC (`tonic`) | Strongly typed inter-tier contracts; zero runtime filesystem coupling. |
| Concurrency Control | Bounded Channels & Semaphores | Explicit rate limits and queue capacity caps to reject unbounded memory growth. |

## Anti-Patterns & Operational Guardrails
- **Synchronous Heavy Work**: Never execute intensive compute or ML inside incoming request handlers.
- **Stateful Workers**: Workers must remain disposable; local state must not survive job lifecycles.
- **Cron Scheduling as Orchestration**: Do not use time-based schedulers for dependent workflows; trigger subsequent stages from event completion.
- **Bare Intervals**: Avoid `setInterval` loops in frontend code for tracking entity status; subscribe to WebSocket/SSE streams.
- **Unbounded Fan-Out**: Prohibit unthrottled sequential RPCs; use batching and bounded concurrency.