# Apex Performance Auditor: Six-Dimension Rubrics & Quantitative Triage Matrix

This reference defines the priority classification standards, quantitative impact modeling rules, and deep-dive evaluation checklists across the six performance and runtime stability dimensions.

---

## 1. Priority, Effort & Quantitative ROI Matrix

### Priority Classification
| Priority | Qualifying Criteria (Performance, Efficiency & Stability) | Required Deliverable |
| :--- | :--- | :--- |
| **Critical** | • Super-linear complexity ($\mathcal{O}(n^2)$ or worse) on a primary hot path or unbounded input.<br>• Unbounded memory allocation, leaked descriptors/connections, or in-memory buffering capable of triggering an OOM kill.<br>• Data race, deadlock, livelock, or async executor starvation blocking progress.<br>• Unhandled panic, crash, null dereference, or state corruption on a production execution path. | Full production `diff` + quantitative impact model/measurement + verification command |
| **High** | • High-frequency heap allocation churn inside tight loops or per-request handlers.<br>• $N+1$ database/RPC queries or unindexed full-table scans on active endpoints.<br>• Coarse mutex contention across threads or locks held across I/O/`await` points.<br>• Missing I/O timeouts, unbounded retry storms, or absent backpressure on external boundaries. | Full production `diff` + quantitative impact model/measurement + verification command |
| **Medium** | • Redundant serialization, deep cloning, or repeated regex/schema compilation.<br>• Suboptimal container choice (e.g., $\mathcal{O}(n)$ linear scan instead of $\mathcal{O}(1)$ hash lookup for moderate $n$).<br>• Missing container pre-allocation (`with_capacity`), unpooled buffers, or chatty unbuffered I/O.<br>• Swallowed error context, missing retry jitter, or suboptimal connection pool sizing. | Full production `diff` + quantitative impact model/measurement + verification command |
| **Low** | • Cold-path allocations, minor branch inefficiencies, struct padding waste on low-count objects, or missing performance telemetry counters. | Concise 1–2 sentence optimization directive |

### Verification Basis Tags
- **`[EMPIRICAL]`**: Validated by running benchmarks, `scripts/perf_harness.py bench`, compiler escape/assembly analysis, race detector, or query `EXPLAIN ANALYZE`. Must cite baseline vs. target metrics (e.g., `$p_{50}: 14.2\text{ ms} \rightarrow 3.1\text{ ms} (-78\%)$`).
- **`[STATIC-MODEL]`**: Derived from deterministic static analysis of source code when runtime execution is unavailable or requires external infrastructure. Must state explicit complexity or resource deltas (e.g., `$\mathcal{O}(N \cdot M) \rightarrow \mathcal{O}(N + M)$`, `Eliminates $2N$ heap allocations per batch`).

### Implementation Effort Classification
- **Low**: Drop-in replacement within a single function or file (e.g., pre-sizing a vector, hoisting a regex, adding a timeout, swapping a slice scan for a `HashSet`) with zero cross-module signature changes ($< 1$ hour).
- **Medium**: Module-level refactoring (e.g., batching an $N+1$ query, introducing a `sync.Pool`/buffer pool, splitting a coarse lock, converting buffered I/O to a stream) requiring localized interface or test updates ($1\text{--}8$ hours).
- **High**: Cross-cutting architectural optimization (e.g., redesigning data layout from Array-of-Structs to Struct-of-Arrays, replacing synchronous threading with bounded actor/channel pipelines, schema re-indexing with migration) ($> 1$ day).

---

## 2. Six-Dimension Deep Audit Checklists

### Dimension 1: Compute, Algorithmic Complexity & Mechanical Sympathy (`COMP`)
Evaluate CPU utilization, instruction count, and cache efficiency:
- **Algorithmic Complexity & Data Structures (`COMP-ALGO`)**:
  - Are nested loops performing hidden $\mathcal{O}(n^2)$ lookups (`.contains()`, `.find()`, `.indexOf()`, linear slice scans) that can be reduced to $\mathcal{O}(1)$ via hash maps/sets or $\mathcal{O}(\log n)$ via sorted binary search?
  - Are sorting operations executed repeatedly inside loops instead of maintaining a heap/priority queue or sorting once outside the loop?
  - Are linked lists, tree maps, or pointer-heavy graphs used where contiguous arrays/vectors or ring buffers provide superior constant factors?
- **CPU Cache Locality & Data Layout (`COMP-CACHE`)**:
  - Does hot-loop iteration chase pointers across fragmented heap objects instead of traversing contiguous memory (Cache-Line Utilization)?
  - Are large structs containing cold fields iterated over purely to inspect 1–2 hot fields (opportunity for Struct-of-Arrays or hot/cold struct splitting)?
  - In statically compiled languages (Rust, C, C++, Go, C#), do struct field orderings introduce excessive alignment padding bytes?
- **Loop & Branch Mechanics (`COMP-BRANCH`)**:
  - Do tight inner loops contain invariant calculations, configuration lookups, or dynamic dispatch/reflection calls that can be hoisted out of the loop?
  - Are unpredictable data-dependent branches inside hot loops replaceable with branchless arithmetic, lookup tables, or pre-partitioned data?
- **Redundant Compilation & Parsing (`COMP-PARSE`)**:
  - Are regular expressions, JSON schemas, templates, or SQL statements compiled/parsed repeatedly per invocation instead of initialized once via static/lazy singletons?
  - Are values repeatedly formatted to strings and re-parsed across internal function boundaries instead of passed as strongly typed primitives or structs?

### Dimension 2: Memory Hierarchy, Allocation Lifecycle & Footprint (`MEM`)
Evaluate heap pressure, allocator contention, GC pauses, and resource determinism:
- **Heap Escapes & Boxing (`MEM-ESC`)**:
  - Do short-lived variables escape to the heap due to returning pointers, capturing references in closures, or boxing primitives into trait objects/interfaces (`dyn Trait`, `interface{}`, `any`, `Object`) on hot paths?
  - Are large structs passed by value across deep call stacks causing excessive stack/memory copying, or conversely, tiny values heap-allocated unnecessarily?
- **Transient Allocation Churn & Pre-Sizing (`MEM-ALLOC`)**:
  - Are dynamic collections (`Vec`, `slice`, `ArrayList`, `List<T>`, `dict`, `Map`) grown incrementally inside loops without upfront capacity reservation (`with_capacity`, `make([]T, 0, n)`) when the size bound is known or estimable?
  - Is string concatenation (`+`, `fmt.Sprintf`, f-strings) executed inside loops instead of writing into a pre-sized string builder or byte buffer?
  - Are temporary buffers allocated and discarded on every request instead of recycled via thread-local buffers or object pools (`sync.Pool`, `ArrayPool<T>`, arena allocators)?
- **Streaming vs. Full-Buffer Materialization (`MEM-STREAM`)**:
  - Are entire files, HTTP bodies, or multi-megabyte database result sets read completely into memory (`read_to_end`, `ioutil.ReadAll`, `.toArray()`) before processing, instead of processed incrementally via bounded streams/iterators?
  - Do transformation pipelines allocate intermediate arrays at every stage (`.map().filter().collect()`) instead of chaining lazy iterators or mutating in place?
- **Memory & Resource Leaks (`MEM-LEAK`)**:
  - Do global caches, memoization tables, event listeners, or session maps grow monotonically without TTL expiration, LRU/LFU eviction, or maximum capacity bounds?
  - Do sub-slices or substrings pin large underlying backing arrays in memory after the parent buffer is no longer needed?
  - Are file descriptors, sockets, database cursors, or native handles leaked when an early `return`, exception, or panic bypasses cleanup logic?

### Dimension 3: Concurrency, Lock Contention & Scheduler Mechanics (`CONC`)
Evaluate multi-core scalability, thread safety, and async runtime health:
- **Lock Granularity & Hold Duration (`CONC-LOCK`)**:
  - Is a single coarse-grained `Mutex` or `RwLock` protecting independent data domains or held across slow operations (network I/O, disk flushes, JSON serialization, `await` suspension points)?
  - Can read-heavy shared state use `RwLock`, atomic primitives (`AtomicU64`, `arc-swap`), copy-on-write, or sharded/striped locks to eliminate cross-core serialization?
  - Do hot atomic counters or per-worker states reside on the same 64-byte CPU cache line, inducing hardware cache-coherency ping-pong (false sharing)?
- **Scheduler Starvation & Blocking in Async Contexts (`CONC-SCHED`)**:
  - Are synchronous blocking calls (blocking file/network I/O, `thread::sleep`, heavy CPU hashing/compression/parsing) executed directly on async event-loop threads (Tokio, Node.js/Bun, Python `asyncio`, Go netpoller) instead of offloaded to dedicated blocking/worker pools?
  - Are independent asynchronous operations awaited sequentially (`await a(); await b();`) when they can execute concurrently (`join!`, `Promise.all`, `errgroup`)?
- **Data Races, Deadlocks & Ordering Hazards (`CONC-RACE`)**:
  - Is shared mutable state accessed across threads, goroutines, or async tasks without synchronization?
  - Does check-then-act logic (`if !map.contains(k) { map.insert(k, v) }`) create time-of-check-to-time-of-use (TOCTOU) race conditions instead of using atomic entry APIs?
  - Can multiple locks be acquired in inconsistent orders across call paths, creating a lock-inversion deadlock hazard?
- **Unbounded Concurrency & Task Spawning (`CONC-BOUND`)**:
  - Does the system spawn a new thread, goroutine (`go func()`), or async task (`tokio::spawn`, `Promise.all(hugeArray.map(...))`) per incoming item inside an unbounded loop without a semaphore, worker pool, or concurrency limit?

### Dimension 4: I/O, Persistence, Network & Serialization Throughput (`IO`)
Evaluate external boundary latency, bandwidth efficiency, and storage mechanics:
- **Batching & $N+1$ Elimination (`IO-BATCH`)**:
  - Are database queries, cache lookups, or HTTP/gRPC calls executed inside loops ($N+1$ problem) instead of batched into single multi-key fetches (`WHERE id = ANY($1)`, `MGET`, bulk `INSERT`/`UPSERT`)?
  - Are disk writes or network sends issued per line/record without buffered writers (`BufWriter`, `bufio.Writer`) or vectored I/O (`writev`)?
- **Query Execution & Index Selectivity (`IO-QUERY`)**:
  - Do frequent queries filter, join, or sort on unindexed columns, or apply functions to indexed columns that defeat index usage?
  - Do queries fetch `SELECT *` (including large text/blob columns) when only a narrow projection is required, or use slow `OFFSET` pagination on deep pages instead of keyset/cursor pagination?
  - Are write-heavy transactions holding row/table locks longer than necessary by interleaving external RPC calls inside open database transactions?
- **Connection Pooling & Reuse (`IO-POOL`)**:
  - Are HTTP clients, database connections, or TLS sessions instantiated per request instead of reusing persistent keep-alive connection pools?
  - Are connection pool limits (`max_open_conns`, `max_idle_conns`, idle timeouts) unconfigured or mismatched with downstream capacity?
- **Serialization & Payload Efficiency (`IO-SERDE`)**:
  - Are payloads parsed into generic dynamic ASTs (`serde_json::Value`, `map[string]any`, `JsonNode`) only to extract a few fields, or re-serialized multiple times across internal layers?
  - Are large network responses transmitted uncompressed or without streaming chunked transfer where appropriate?
  - Are concurrent cache misses for the same hot key triggering duplicate downstream queries (cache stampede / thundering herd) due to missing request coalescing (`singleflight`)?

### Dimension 5: Runtime Stability, Invariant Enforcement & Crash Immunity (`STAB`)
Evaluate deterministic execution, fault containment, and crash prevention:
- **Panic, Unwrap & Null-Dereference Immunity (`STAB-PANIC`)**:
  - Does production code invoke `.unwrap()`, `.expect()`, array/slice indexing `arr[i]` without bounds proof, forced type casts, or unguarded pointer/null dereferences on paths reachable by external input?
  - Can division by zero, modulo by zero, or regex catastrophic backtracking (ReDoS) be triggered by untrusted or degenerate inputs?
- **Arithmetic Safety & Numeric Determinism (`STAB-ARITH`)**:
  - Can counters, byte sizes, timeouts, or financial/metric calculations overflow, underflow, or silently wrap around without checked/saturating arithmetic?
  - Do floating-point accumulations suffer from precision loss or propagate `NaN`/`Infinity` into sorting comparators or JSON serializers (which fails or corrupts payloads)?
- **Deterministic Cleanup & Error-Path Integrity (`STAB-CLEAN`)**:
  - When an operation fails partway through, are acquired locks, temporary files, transactions, or worker slots deterministically released via RAII, `defer`, `try/finally`, or `using` blocks?
  - Are errors silently ignored (`_ = ...`, empty `catch {}`) leaving the caller operating on uninitialized or stale state?
- **State Invariant & Transactional Consistency (`STAB-ATOM`)**:
  - Do multi-step in-memory state mutations update several structures sequentially such that an error or panic mid-update leaves the service in a permanently corrupted state?

### Dimension 6: Tail-Latency Control, Backpressure & Fault Recovery (`RESIL`)
Evaluate $p_{99}/p_{99.9}$ predictability and survival under overload or partial outage:
- **Backpressure & Bounded Queues (`RESIL-BACK`)**:
  - Are channels, work queues, or in-memory buffers unbounded (`mpsc::unbounded_channel`, unbuffered accumulation arrays), allowing a slow consumer to exhaust system memory under traffic spikes?
  - Does the system lack admission control, rate limiting, or explicit load shedding when saturation thresholds are crossed?
- **End-to-End Timeouts & Cancellation Propagation (`RESIL-TIME`)**:
  - Are external network requests, database queries, or lock acquisitions executed without explicit deadlines/timeouts (`context.WithTimeout`, `Timeout`, `AbortSignal.timeout`)?
  - When a client disconnects or a request times out, is cancellation propagated downstream to abort in-flight database queries and compute tasks rather than wasting resources on orphaned work?
- **Retry Budgets, Backoff & Jitter (`RESIL-RETRY`)**:
  - Do retry loops execute immediately or at fixed intervals without exponential backoff and randomized jitter, amplifying transient blips into self-inflicted retry storms?
  - Are non-idempotent operations or permanent client errors ($4\text{xx}$) retried blindly without a bounded retry budget?
- **Circuit Breaking & Graceful Degradation (`RESIL-DEGRADE`)**:
  - Can a single slow or failing non-critical dependency block primary request threads because it lacks a circuit breaker, bulkhead isolation, or fallback path?
  - Does process termination (`SIGTERM`/`SIGINT`) abruptly drop in-flight requests and corrupt buffered writes instead of executing a bounded graceful shutdown drain?