# Queue + Worker Pattern

From AGENTS.md §6: Scalability & Queuing Architecture.

## Overview

Heavy/asynchronous work SHALL NOT run synchronously in request path. Use queue + worker + streaming.

## Components

### Coordinator (SvelteKit on Bun)

- Single state owner
- Persisted PostgreSQL records
- Strict state machine: `queued → running → succeeded | failed | cancelled`
- Stable unique IDs
- Per-actor scoping

### Workers (Rust + Axum + Rayon)

- Stateless, disposable, horizontally scalable
- Register with coordinator
- Pull work via RPC/queue
- Report progress + results
- Heartbeat

### Queue (PostgreSQL)

- Table-based queue
- At-least-once delivery
- Idempotent consumption
- Lost worker → work re-queued

## State Machine

```
queued → running → succeeded
                  → failed
                  → cancelled
```

## Anti-Patterns

- ❌ Stateful workers
- ❌ Multiple state owners
- ❌ Cron-as-distributed-scheduler
- ❌ Unbounded queues
- ❌ Blocking the request path
- ❌ Emergent peer-to-peer delegation meshes

## Defaults

- PostgreSQL table for queue (Drizzle ORM)
- WebSocket/SSE streaming for realtime
- Lightweight stateless Rust workers
- Platform primitives over new brokers
