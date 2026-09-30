---
type: Reference
title: Async Cancellation Contracts & Runtime Topology
generated: { by: agentic/1.0, at: 2026-09-30T13:57:00Z }
status: stable
sources:
  - id: advanced-rust-systems
    resource: references/rust-researches/advanced-rust-systems-programming-research.md
  - id: rust-bad-practices
    resource: references/rust-bad-practices-research.md
---

# Async Cancellation Contracts & Runtime Topology

Soundness rules for async control flow, cancel-safety, and Tokio execution topologies.

## 1. Cancel-Safety in `tokio::select!`

Every branch in a `tokio::select!` must be cancellation-safe. Dropping a future at an `.await` suspension point must not lose partial state or corrupt data.

| Operation | Cancel-Safe? | Reason & Invariant |
|---|---|---|
| `AsyncReadExt::read_exact` | **UNSAFE** | Drops partially filled buffer on cancellation. Replace with `read` loop or isolate in task. |
| `AsyncWriteExt::write_all` | **UNSAFE** | Drops partially flushed buffer on cancellation. Replace with single dedicated writer task. |
| `tokio::sync::Mutex::lock` | **UNSAFE** | May acquire lock on wakeup right as another branch completes, dropping acquired guard. |
| `tokio::sync::Semaphore::acquire` | **UNSAFE** | May acquire permit simultaneously with cancellation, leaking the permit. |
| `AsyncReadExt::read` | **SAFE** | Reads available bytes into buffer; cancelled future loses 0 already-read bytes. |
| `mpsc::Receiver::recv` | **SAFE** | Yields a message or remains unconsumed. |
| `broadcast::Receiver::recv` | **SAFE** | Tracks stream position without dropping message frames. |
| `watch::Receiver::changed` | **SAFE** | State flag is inspected idempotently. |

### Remediation for Cancel-Unsafe Operations
1. **Spawn Isolation:** Offload the cancel-unsafe sequence into a `tokio::spawn`ed worker task and communicate via an `mpsc` channel.
2. **Dedicated Single Writer:** Sockets and output sinks MUST be owned by a single dedicated writer task receiving write jobs through a queue. Never share writer handles via async mutexes across tasks.

## 2. Lock Discipline Across Suspension Points

- **Synchronous Locks (`std::sync::Mutex`, `parking_lot::Mutex`, `RefCell`):** MUST NEVER be held across an `.await` suspension point. Enforce lexical scope contraction (`{ let _guard = lock.lock(); ... }`) so the guard is dropped before awaiting.
- **Asynchronous Locks (`tokio::sync::Mutex`):** Reserved exclusively for synchronization guards that must span an `.await`. Keep critical sections minimal to prevent thread starvation and head-of-line blocking.

## 3. Graceful Shutdown Protocol

- Use a hierarchical tree of `tokio_util::sync::CancellationToken` tokens to propagate cancellation.
- Never call raw `.abort()` on background worker tasks handling state transitions or transactions; bare abortion causes partial writes and leaked resources.
- Listen for shutdown tokens within control loops and allow in-flight tasks to flush before process exit.

## 4. Runtime Topology Governance

- **Default Runtime:** Tokio multi-threaded work-stealing scheduler (`#[tokio::main]`). Multi-threaded work-stealing provides optimal tail-latency absorption and resilient load balancing.
- **Topology Rule (ADR Required):** Any design proposing a thread-per-core architecture, in-process ring buffer, or `io_uring` runtime (e.g. `glommio`, `monoio`) MUST have a recorded Architecture Decision Record (ADR). Thread-per-core trades tail-latency resilience for L1/L2 cache locality, making it an architectural topology trade-off rather than a review default.
