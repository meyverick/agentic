# Apex Performance Auditor: Empirical Profiling & Diagnostic Playbooks

Use these stack-specific recipes during **Phase 2 (Baseline Empirical Profiling)** and **Phase 4 (Verification)** whenever the corresponding runtime toolchain is available.

---

## 1. Universal Statistical Benchmarking (`perf_harness.py`)
When evaluating any CLI command, test runner, or standalone workload script, capture statistically rigorous latency distributions ($p_{50}, p_{95}, p_{99}$, CV%) and peak RSS memory using the bundled harness:

```bash
# 1. Static Hotspot Reconnaissance
python3 scripts/perf_harness.py scan /path/to/repo

# 2. Capture Baseline Metrics (3 warmup runs, 15 measured runs)
python3 scripts/perf_harness.py bench \
  --cmd "<target_command>" \
  --warmup 3 \
  --runs 15 \
  --output /tmp/perf_baseline.json

# 3. Verify Post-Optimization Delta Against Baseline
python3 scripts/perf_harness.py bench \
  --cmd "<target_command>" \
  --warmup 3 \
  --runs 15 \
  --baseline-json /tmp/perf_baseline.json
```

---

## 2. Rust (`Cargo` / `rustc`)
- **Microbenchmarking**:
  ```bash
  cargo bench --no-fail-fast
  ```
- **Performance Lint Pass**:
  ```bash
  cargo clippy --all-targets -- -W clippy::perf -W clippy::needless_pass_by_value -W clippy::large_enum_variant -W clippy::rc_buffer
  ```
- **Struct Size & Alignment Padding Inspection**:
  ```bash
  RUSTFLAGS="-Zprint-type-sizes" cargo +nightly build --release
  ```
- **Assembly & Vectorization Inspection** (if `cargo-show-asm` is installed):
  ```bash
  cargo asm --lib <crate>::<module>::<function>
  ```
- **Concurrency & Undefined Behavior Verification**:
  ```bash
  # ThreadSanitizer for data races
  RUSTFLAGS="-Zsanitizer=thread" cargo +nightly test --target x86_64-unknown-linux-gnu
  ```

---

## 3. Go (`go` toolchain)
- **Benchmark with Heap Allocation Accounting**:
  ```bash
  go test -run=^$ -bench=. -benchmem -count=5 ./...
  ```
- **Compiler Escape Analysis & Inlining Decisions** (identifies heap escapes and missed inlining on hot paths):
  ```bash
  go build -gcflags="all=-m=2" ./... 2>&1 | grep -E "escapes to heap|moved to heap|can inline|cannot inline"
  ```
- **Bounds-Check Elimination (BCE) Check**:
  ```bash
  go build -gcflags="all=-d=ssa/check_bce/debug=1" ./...
  ```
- **Data Race Detection**:
  ```bash
  go test -race ./...
  ```
- **CPU, Heap & Mutex Contention Profiling**:
  ```bash
  go test -run=^$ -bench=<BenchName> -cpuprofile=/tmp/cpu.prof -memprofile=/tmp/mem.prof -mutexprofile=/tmp/mutex.prof ./<pkg>
  go tool pprof -top -cum /tmp/cpu.prof
  go tool pprof -alloc_space -top /tmp/mem.prof
  ```

---

## 4. TypeScript / JavaScript (Node.js & Bun)
- **V8 JIT Optimization & Deoptimization Tracing** (identifies polymorphic inline caches and hidden-class bailouts):
  ```bash
  node --trace-opt --trace-deopt <entry.js> 2>&1 | grep -E "\[deoptimize|\[marking"
  ```
- **V8 CPU Tick Profiling**:
  ```bash
  node --prof <entry.js>
  node --prof-process isolate-*.log > /tmp/v8_profile.txt
  head -n 80 /tmp/v8_profile.txt
  ```
- **Garbage Collection & Heap Churn Tracing**:
  ```bash
  node --trace-gc <entry.js>
  ```
- **Bun High-Precision Test & Benchmark Runner**:
  ```bash
  bun test
  ```

---

## 5. Python (`cpython` / `pytest`)
- **Deterministic Call-Graph CPU Profiling (`cProfile`)**:
  ```bash
  python3 -m cProfile -s cumulative <script.py> | head -n 45
  ```
- **Line-Level Heap Allocation Tracking (`tracemalloc`)**:
  ```bash
  python3 -c "
  import tracemalloc, runpy
  tracemalloc.start(25)
  runpy.run_path('<script.py>', run_name='__main__')
  snap = tracemalloc.take_snapshot()
  for stat in snap.statistics('lineno')[:15]:
      print(stat)
  "
  ```
- **Bytecode Disassembly** (inspect inner-loop instruction overhead and global lookups):
  ```bash
  python3 -m dis <module_or_script.py>
  ```

---

## 6. C / C++ (`gcc` / `clang` / Linux `perf`)
- **Compiler Vectorization & Optimization Diagnostics**:
  ```bash
  # GCC missed optimizations
  g++ -O3 -march=native -fopt-info-vec-missed <file.cpp>
  # Clang optimization remarks
  clang++ -O3 -Rpass=loop-vectorize -Rpass-missed=loop-vectorize <file.cpp>
  ```
- **Hardware Performance Counters (`perf stat`)**:
  ```bash
  perf stat -d ./<binary> <args>
  ```
- **AddressSanitizer & ThreadSanitizer**:
  ```bash
  clang++ -O1 -g -fsanitize=address,undefined -fno-omit-frame-pointer <file.cpp>
  clang++ -O1 -g -fsanitize=thread -fno-omit-frame-pointer <file.cpp>
  ```

---

## 7. C# / .NET (`dotnet`)
- **Release Build & BenchmarkDotNet Execution**:
  ```bash
  dotnet run -c Release -- --filter *
  ```
- **Live Runtime GC & ThreadPool Telemetry**:
  ```bash
  dotnet-counters monitor --counters System.Runtime -- process-id <PID>
  ```

---

## 8. Relational Databases (PostgreSQL / SQLite / MySQL)
- **PostgreSQL Execution Plan & Buffer Hit Analysis**:
  ```sql
  EXPLAIN (ANALYZE, BUFFERS, WAL, VERBOSE, SETTINGS) <SQL_QUERY>;
  ```
  - **Red Flags to Audit**:
    - `Seq Scan` on tables with $> 10{,}000$ rows where an index or partial index applies.
    - High `Rows Removed by Filter` ratio (indicates poor index selectivity).
    - `Sort Method: external merge Disk` (indicates `work_mem` spill to disk).
    - `Nested Loop` with high outer-row count executing repeated inner lookups ($N+1$ at the query planner level).
- **SQLite Query Plan Inspection**:
  ```sql
  EXPLAIN QUERY PLAN <SQL_QUERY>;
  ```
  - Look for `SCAN TABLE` without `USING INDEX` or `USE TEMP B-TREE FOR ORDER BY`.