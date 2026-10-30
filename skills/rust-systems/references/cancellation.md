---
type: Reference
title: Async Cancellation Contracts, Lock Poisoning & Runtime Topology
generated: { by: agentic/2.0, at: 2026-10-22T10:35:00Z }
status: stable
sources:
  - id: google-rust-styleguide
    resource: https://google.github.io/styleguide/rustguide.html
  - id: advanced-rust-systems
    resource: references/rust-researches/advanced-rust-systems-programming-research.md
  - id: rust-bad-practices
    resource: references/rust-bad-practices-research.md
---

# Async Cancellation Contracts, Lock Poisoning & Runtime Topology

Soundness rules for async control flow, cancel-safety, mutex poison handling, lock scoping, and execution topologies.

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

## 2. Lock Discipline & Poison Soundness

1. **Never Bypass a Poisoned Mutex:**
   - Never reach inside a poisoned `std::sync::Mutex` or `RwLock` (e.g., via `PoisonError::into_inner` or `.unwrap_or_else(|e| e.into_inner())`) to access potentially corrupted state after a thread panic.
   - Propagate the error or allow `.expect("mutex poisoned")` to terminate the affected execution path.
2. **Synchronous Locks Across `.await` (`std::sync::Mutex`, `parking_lot::Mutex`, `RefCell`):**
   - MUST NEVER be held across an `.await` suspension point (`clippy::await_holding_lock`, `clippy::await_holding_refcell_ref`).
   - Enforce lexical scope contraction (`{ let guard = lock.lock().expect("lock poisoned"); ... }`) or encapsulate access in a synchronous closure accessor (`self.with_state(|state| ...)`).
3. **Encapsulate Guards via Closure Accessors (`with_foo`):**
   - Prefer exposing `pub fn with_foo<R>(&self, f: impl FnOnce(&Foo) -> R) -> R` over returning a raw `MutexGuard<Foo>` or `Ref<Foo>` from public methods. This guarantees the lock is released before the caller can reach an `.await` point and hides the synchronization primitive from the public API.
4. **Asynchronous Locks (`tokio::sync::Mutex`):**
   - Reserved exclusively for synchronization guards that must span an `.await`. Keep critical sections minimal to prevent thread starvation and head-of-line blocking.

## 3. Graceful Shutdown Protocol

- Use a hierarchical tree of `tokio_util::sync::CancellationToken` tokens to propagate cancellation.
- Never call raw `.abort()` on background worker tasks handling state transitions or transactions; bare abortion causes partial writes and leaked resources.
- Listen for shutdown tokens within control loops and allow in-flight tasks to flush before process exit.

## 4. Runtime Topology Governance & Platform Overrides

- **Default Runtime:** Tokio multi-threaded work-stealing scheduler (`#[tokio::main]`). Multi-threaded work-stealing provides optimal tail-latency absorption and resilient load balancing.
- **Topology Rule (ADR Required):** Any design proposing a thread-per-core architecture, in-process ring buffer, or `io_uring` runtime (e.g., `glommio`, `monoio`) MUST have a recorded Architecture Decision Record (ADR). Thread-per-core trades tail-latency resilience for L1/L2 cache locality, making it an architectural topology trade-off rather than a review default.
- **Platform Concurrency Profiles (When Activated by Brief):**
  - **`[chrome]` Target:** Do NOT use `async` / `.await` and do NOT start threads via `std::thread::spawn`; schedule asynchronous work through Chromium sequences.
  - **`[Fuchsia]` Target:** Use `fuchsia_sync::Mutex` rather than `std::sync::Mutex` or `parking_lot::Mutex`.