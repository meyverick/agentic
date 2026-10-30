---
name: scalability
description: Design and implement language-agnostic queue-worker architectures, hub-and-spoke state coordination, backpressure controls, and real-time event streaming via SSE, WebSockets, and pub/sub channels. Use when designing background job processing, worker topologies, push pipelines, or event-driven control loops in any language or project.
---

# Scalability & Realtime Doctrine

## Summary
Universal execution blueprints for non-blocking asynchronous work, hub-and-spoke worker coordination, explicit backpressure, and push-based real-time transport across any programming language or runtime stack.

## Core Mental Model
- **Coordinator Authority**: A single authoritative service or persistence tier owns the primary job state machine (`queued -> running -> succeeded | failed | cancelled`) with stable unique IDs, idempotency keys, and actor scoping.
- **Stateless Workers**: Disposable, horizontally scalable workers pull or receive leased jobs, emit heartbeats, and report progress or terminal results. Expired leases trigger idempotent re-queuing.
- **Hub-and-Spoke Topology**: Enforce strict coordinator-to-worker orchestration. Emergent peer-to-peer worker meshes and cyclic inter-worker dependencies are forbidden.
- **Deterministic State Transitions**: State reducers execute as pure functions over events (`delta(State, Event) -> State`) with zero side effects and zero hardware clock calls (`Instant::now()`, `Date.now()`, `time.monotonic()`); logical timestamps and UUIDs arrive inside the ingress event payload.
- **Reactor Protection**: Synchronous request paths validate input, persist or enqueue intent, and return a task receipt immediately. Heavy CPU, bulk I/O, and long-running workflows always execute off the request thread/reactor.

## Real-Time & Transport Layer
- **Live Push Default**: Stream state transitions to connected clients over Server-Sent Events (`SSE`) or WebSockets (`WSS`) driven by database pub/sub or in-process broadcast fan-out. Client interval polling is prohibited.
- **Inter-Service & Worker RPC**: Use strongly typed binary or schema-validated wire contracts (e.g., gRPC/Protobuf, IPC queues, or transactional DB leases) without cross-service filesystem traversal (`../`).
- **Event-Driven Control Loops**: Trigger downstream stages strictly on discrete state transition events or threshold crossings, never blind cron or sleep loops.
- **Constrained Polling Fallback**: Poll external third-party APIs only when webhooks or streaming endpoints do not exist; enforce the coarsest acceptable interval, single-flight coalescing, bounded timeouts, and jittered exponential backoff.

## Implementation & Ecosystem Matrix

| Mechanism | Architectural Pattern & Guarantees | Recommended Ecosystem Specificities |
| :--- | :--- | :--- |
| **Transactional Job Queue** | At-least-once delivery, lease timeouts, dead-letter routing, and idempotency keys. | **PostgreSQL**: `FOR UPDATE SKIP LOCKED` queue tables. **Dedicated Brokers**: Redis Streams, NATS JetStream, RabbitMQ. |
| **Compute Offloading** | Isolate CPU-bound work from async I/O event loops to prevent reactor starvation. | **Rust**: Tokio `spawn_blocking` / Rayon pools. **Go**: bounded goroutine worker pools. **TS/Bun/Node**: `Worker` threads. **Python**: `ProcessPoolExecutor`. |
| **Real-Time Client Push** | Multiplex a single backend event listener into a fan-out broadcast channel feeding active client streams. | **PostgreSQL + SSE/WSS**: `LISTEN/NOTIFY` (`PgListener`) -> broadcast channel -> SSE (e.g., Datastar `PatchElements`/`PatchSignals`) or WebSockets. |
| **Internal RPC** | Schema-first, low-overhead inter-process communication with deadline propagation. | **Rust**: `tonic` (gRPC) / Postcard. **Go/Polyglot**: gRPC, Connect-RPC, or Cap'n Proto. |
| **Backpressure & Flow Control** | Bounded memory buffers, concurrency semaphores, tenant rate limits, and load shedding (`HTTP 429`/`503`). | **Rust**: bounded `tokio::sync::mpsc` & `Semaphore`. **Go**: buffered `chan` + `x/time/rate`. **Web/Edge**: `ReadableStream` backpressure. |

## Anti-Patterns & Operational Guardrails
- **Synchronous Heavy Work**: Never execute intensive CPU math, cryptographic hashing, ML inference, or bulk I/O inside incoming HTTP/WS request handlers.
- **Per-Client Database Listeners**: Never spawn a dedicated database `LISTEN` connection per connected SSE/WebSocket client; multiplex one listener into an in-memory broadcast fan-out channel.
- **Stateful Workers**: Workers must remain disposable; local in-memory state must never be required to recover a failed job.
- **Cron as Workflow Orchestration**: Never chain dependent pipeline stages via wall-clock cron schedules; trigger subsequent stages directly from completion events.
- **Unbounded Fan-Out & Queues**: Reject unbounded channels (`unbounded_channel`, unthrottled `Promise.all` over dynamic inputs) on network-facing paths.