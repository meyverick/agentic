---
name: apex-performance-auditor
description: Execute an exhaustive, deep-dive performance, efficiency, robustness, and runtime stability audit combining static mechanical-sympathy analysis with empirical profiling and benchmarking. Trigger when the user requests code optimization, bottleneck hunting, latency/throughput tuning, memory/GC reduction, concurrency/lock contention analysis, stress/fault testing, or runtime stability hardening. Do not trigger for general security audits, high-level architectural scaffolding, or basic syntax/style linting.
---
# Apex Performance Auditor

## Overview
Perform an unattended, Principal-level performance engineering, resource efficiency, and runtime stability audit across any programming language or systems stack. Unlike broad readiness reviews, this skill focuses exclusively on mechanical sympathy, algorithmic efficiency, memory lifecycle determinism, concurrency contention elimination, crash immunity, and tail-latency ($p_{99}/p_{99.9}$) resilience. It pairs deterministic static hotspot inspection with opportunistic empirical benchmarking and compiler/profiler verification to deliver quantified, proof-backed optimization reports.

## Core Mental Model
1. **Measure First, Model Second, Never Guess**: Whenever a local toolchain is available, execute existing benchmarks, compiler escape/assembly diagnostics, and `scripts/perf_harness.py` to establish an empirical baseline. When running in a static-only environment, formulate explicit asymptotic complexity and memory-allocation cost models. Tag every finding with its verification basis: `[EMPIRICAL]` or `[STATIC-MODEL]`.
2. **Mechanical Sympathy Over Micro-Hacks**: Prioritize high-leverage physical and runtime mechanics—CPU cache locality, zero-copy memory lifecycles, lock-free or fine-grained concurrency, batched/pipelined I/O, and predictable tail latency—over cosmetic syntax micro-tweaks that degrade readability for negligible gain.
3. **Stability is Non-Negotiable Performance**: Throughput without fault tolerance is a production hazard. Audit panic/crash vectors, resource leaks on early-return error paths, unbounded queues/allocations, race conditions, and missing timeouts/backpressure with the same rigor as CPU and memory bottlenecks.
4. **Evidence, Quantified Deltas, and Verifiable Diffs**: Every finding must cite an exact file path and line range (`path/to/file.ext:L10-L42`), state a measured or mathematically modeled impact delta (e.g., latency reduction, allocations/op saved, throughput multiplier, or blast-radius elimination), and supply both a drop-in production `diff` and a reproducible verification command.
5. **Unattended End-to-End Execution**: Complete all four phases through the final Sequenced Execution Roadmap in a single uninterrupted run. Provide full production `diff` blocks for `Critical`, `High`, and `Medium` findings, and concise 1–2 sentence optimization directives for `Low` findings.

---

## Unattended Execution Pipeline

### Phase 1: Topology, Hot-Path & Hazard Reconnaissance
1. **Map Runtime & Build Topology**: Inspect package manifests, build profiles, compiler flags, and runtime configurations (e.g., `Cargo.toml`, `go.mod`, `package.json`, `pyproject.toml`, `.csproj`, `CMakeLists.txt`, `Dockerfile`, database schemas) to identify the execution model, garbage collector or memory model, async executor, and hardware concurrency constraints.
2. **Trace Critical Execution Paths**: Locate high-frequency entry points and hot paths:
   - Request/event ingress handlers, middleware chains, and serialization/deserialization pipelines.
   - Inner computational loops, data transformations, and in-memory indexing structures.
   - Database queries, network RPC clients, filesystem I/O, and caching layers.
   - Shared mutable state, lock primitives, worker pools, channels, and background schedulers.
3. **Automated Hotspot Scan**: If Python 3 is available in the environment, execute:
   ```bash
   python3 scripts/perf_harness.py scan <target_path>
   ```
   Use the emitted JSON candidate list as an initial leads map, then manually verify each candidate in source context to eliminate false positives and trace cross-function call graphs.

### Phase 2: Baseline Empirical Profiling & Stress Verification
1. **Load Language Playbooks**: Read `references/profiling-playbooks.md` and select the diagnostic toolchain matching the target stack.
2. **Capture Baseline Metrics**:
   - Execute existing microbenchmarks or test suites with memory and timing instrumentation enabled.
   - For CLI binaries, scripts, or reproducible workloads, run statistical benchmarking via:
     ```bash
     python3 scripts/perf_harness.py bench --cmd "<workload_command>" --warmup 3 --runs 15 --output /tmp/baseline_perf.json
     ```
   - Inspect compiler escape analysis, inlining decisions, race detector output, or database `EXPLAIN` plans where applicable.
3. **Boundary & Stress Probing**: Evaluate how the system behaves under adverse runtime conditions:
   - High-cardinality inputs ($10\times\text{--}100\times$ normal payload sizes).
   - Concurrent worker saturation and lock contention spikes.
   - Downstream slowdowns, dropped connections, and malformed inputs.

### Phase 3: Six-Dimension Deep Audit
Load `references/optimization-rubrics.md` and systematically evaluate the codebase against all six dimensions:
1. **Compute, Algorithmic Complexity & Mechanical Sympathy (`COMP`)**: Asymptotic complexity on hot paths, data structure selection, CPU cache locality, branch prediction friendliness, redundant parsing/compilation, and vectorization/batching opportunities.
2. **Memory Hierarchy, Allocation Lifecycle & Footprint (`MEM`)**: Heap escape frequency, transient allocation churn, missing container pre-sizing, streaming vs. full-buffer materialization, struct layout/padding, object/buffer pooling, and deterministic resource cleanup.
3. **Concurrency, Lock Contention & Scheduler Mechanics (`CONC`)**: Mutex granularity, locks held across I/O or `await` suspension points, false sharing, async event-loop blocking, unbounded goroutine/task spawning, channel contention, and data race elimination.
4. **I/O, Persistence, Network & Serialization Throughput (`IO`)**: $N+1$ query/RPC elimination, query index selectivity, connection pool sizing, buffered/vectored I/O, zero-copy or streaming serialization, and cache stampede prevention (singleflight/coalescing).
5. **Runtime Stability, Invariant Enforcement & Crash Immunity (`STAB`)**: Elimination of unhandled panics/unwraps/null dereferences, checked arithmetic and bounds validation, leak-free error recovery paths, and atomic state transitions.
6. **Tail-Latency Control, Backpressure & Fault Recovery (`RESIL`)**: Bounded queues with load shedding, end-to-end deadline/cancellation propagation, exponential backoff with jitter and retry budgets, circuit breaking, and graceful shutdown draining.

### Phase 4: Quantitative Triage, Diff Synthesis & Verification
1. **Classify & Quantify**: Assign every verified issue a unique ID (`COMP-01`, `MEM-01`, `CONC-01`, `IO-01`, `STAB-01`, `RESIL-01`), a **Priority** (`Critical`, `High`, `Medium`, `Low`), an **Effort** (`Low`, `Medium`, `High`), a **Verification Basis** (`[EMPIRICAL]` or `[STATIC-MODEL]`), and a concrete **Estimated / Measured Impact** (e.g., `$\mathcal{O}(n^2) \rightarrow \mathcal{O}(n)$, -85% p99 latency` or `-4 allocs/op, -12 KB/req`).
2. **Synthesize Production Diffs**: Write clean, idiomatic, drop-in `diff` blocks for all `Critical`, `High`, and `Medium` findings. Preserve existing public API contracts unless breaking a contract is required to fix a `Critical` stability or performance flaw (which must be explicitly noted).
3. **Post-Patch Empirical Check (When Runtime Available)**: If applying or testing patches in a sandbox or benchmark harness is feasible, re-run `scripts/perf_harness.py bench --cmd "<workload_command>" --baseline-json /tmp/baseline_perf.json` to record exact before/after percentage deltas ($\Delta\%$).

---

## Mandatory Output Structure
Deliver the audit report using these exact five sections in sequence:

### 1. Executive Performance & Stability Baseline
Synthesize the runtime architecture, primary hot paths, execution model constraints, baseline empirical metrics (or static complexity baseline), and the dominant bottleneck and stability risk themes uncovered during the audit.

### 2. Quantified Optimization & Stability Matrix
Present a Markdown summary table sorted by Priority (`Critical` down to `Low`), then by lowest Effort (highest ROI first):

| ID | Dimension | Priority | Basis | Effort | Location | Bottleneck / Stability Hazard | Est. / Measured Impact |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |

### 3. Deep-Dive Findings, Proofs & Target Diffs
Group findings by remediation tier:
- **Critical, High & Medium Findings**: For each finding, provide:
  - **Root Cause & Mechanical Analysis**: Exact technical explanation of why the bottleneck, contention, resource leak, or crash hazard occurs at the hardware, runtime, or algorithmic level (`path/to/file.ext:LStart-LEnd`).
  - **Failure / Latency Blast Radius**: What happens under peak load, adversarial input, or downstream degradation if left unaddressed (e.g., OOM kill, thread-pool starvation, $p_{99}$ tail explosion).
  - **Quantified Impact & Verification Command**: Measured benchmark delta or mathematical cost model, alongside the exact CLI command or test case to verify the improvement.
  - **Target Production Diff**: Self-contained, idiomatic `diff` block ready for application.
- **Low Priority Findings**: Compact bulleted list citing `ID`, `Location`, mechanical issue, and a 1–2 sentence optimization directive.

### 4. Empirical Verification & Stress-Test Protocol
Provide copy-pasteable benchmark commands, profiler invocations, stress-test harnesses, and `scripts/perf_harness.py` recipes tailored to the repository so engineers and CI pipelines can validate the gains and guard against future performance regressions.

### 5. Sequenced Execution Roadmap
Organize all findings into three pragmatic implementation horizons:
1. **Horizon 1: Zero-Delay Stability & Critical Bottlenecks**: Immediate patches for OOM vectors, data races, deadlocks, unhandled crash paths, and severe hot-path stalls.
2. **Horizon 2: High-ROI Throughput & Tail-Latency Tuning**: High-leverage allocation elimination, $N+1$ I/O batching, lock contention splitting, and timeout/backpressure enforcement.
3. **Horizon 3: Architectural Mechanical Sympathy**: Deep data-layout refactoring, streaming pipeline migration, custom memory pooling, and concurrency model upgrades.