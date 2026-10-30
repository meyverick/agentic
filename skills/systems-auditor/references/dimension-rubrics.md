# Systems Auditor: Dimension Rubrics & Triage Matrix

This reference defines the evaluation heuristics and triage classification standards for `systems-auditor`.

---

## 1. Triage Matrix Definitions

### Severity Classification
| Severity | Definition & Qualifying Criteria | Diff Requirement |
| :--- | :--- | :--- |
| **Critical** | Exploitable security vulnerability, silent data corruption/loss, unhandled crash on a primary execution path, leaked credentials, or broken architectural invariant blocking production safety. | Full production `diff` required |
| **High** | Severe performance bottleneck (e.g., unbounded memory growth or $\mathcal{O}(n^2)$ hot path), race condition/deadlock hazard, missing validation/authz on secondary paths, or severe tight coupling blocking core extensibility. | Full production `diff` required |
| **Medium** | Non-idiomatic patterns increasing defect probability, swallowed or uncontextualized errors, suboptimal resource cleanup, leaky domain abstractions, or missing tests on critical business logic. | Full production `diff` required |
| **Low** | Minor code smells, localized duplication, high function-level cognitive complexity without immediate bug risk, or minor documentation/configuration drift. | Concise 1-2 sentence directive |
| **Informational** | Architectural observations, defense-in-depth suggestions, or optional modernization notes with zero immediate operational risk. | Concise 1-2 sentence directive |

### Implementation Effort Classification
- **Low**: Isolated single-file modification, guard clause addition, or configuration adjustment (typically $< 1$ hour, zero cross-module interface changes).
- **Medium**: Multi-file module refactoring, contract adjustment, or test suite expansion ($1\text{--}8$ hours, localized interface updates).
- **High**: Cross-cutting architectural redesign, state/schema migration, or concurrency model overhaul (multi-day initiative).

---

## 2. Language-Agnostic Dimensional Checklists

### Dimension 1: Architecture & Modular Design (`ARCH`)
Evaluate structural integrity independent of language syntax:
- **Coupling & Cohesion (`ARCH-COUP`)**:
  - Are modules grouping unrelated responsibilities (low cohesion) or reaching directly into the internal state of peer modules (tight coupling)?
  - Do circular dependencies exist between packages, namespaces, or directories?
- **Separation of Concerns & Boundary Violations (`ARCH-BOUND`)**:
  - Does core domain/business logic import transport (HTTP/gRPC/CLI), UI, or persistence (SQL/ORM/filesystem) details directly?
  - Do data transfer objects (DTOs) or database entities leak across architectural layers without mapping or boundary encapsulation?
- **Extensibility & Contract Design (`ARCH-EXT`)**:
  - Do modules depend on concrete implementations where interfaces, traits, protocols, or callbacks are warranted?
  - Are brittle switch/if-else chains repeated across files instead of using polymorphism, data-driven dispatch, or composition?
- **Obsolete & Dead Code Paths (`ARCH-DEAD`)**:
  - Are there unreachable branches, unused exports/symbols, commented-out legacy blocks, or deprecated feature flags still wired into active modules?

### Dimension 2: Code Quality & Maintainability (`QUAL`)
Evaluate clarity, defect resistance, and test effectiveness:
- **Idiomatic Style & Readability (`QUAL-IDIOM`)**:
  - Does the code violate established idioms of the detected language (e.g., manual resource management instead of RAII/`defer`/`with`/`using`, mutable globals where immutability is standard)?
  - Are identifier names ambiguous, misleading, or inconsistent with domain terminology?
- **Cognitive Complexity & Code Smells (`QUAL-COMP`)**:
  - Are functions excessively long, deeply nested ($> 3$ levels of control flow), or mixing multiple levels of abstraction?
  - Are magic numbers, hardcoded strings, or boolean trap parameters used instead of named constants or typed options?
- **DRY & Abstraction Balance (`QUAL-DRY`)**:
  - Is critical validation, calculation, or transformation logic duplicated across multiple locations where divergence would cause bugs?
  - Conversely, has premature abstraction coupled unrelated workflows behind an over-parameterized helper?
- **Test Coverage & Robustness (`QUAL-TEST`)**:
  - Are critical domain invariants, boundary conditions, and failure/error paths covered by automated tests?
  - Are tests brittle (testing private implementation details, relying on wall-clock sleep timers, or sharing mutable state between test cases)?

### Dimension 3: Security, Safety & Integrity (`SEC`)
Evaluate attack surfaces, trust boundaries, and data protection:
- **Input Validation & Injection Surfaces (`SEC-INJ`)**:
  - Is untrusted external input (HTTP params, CLI args, file uploads, message payloads, environment variables) validated against strict schemas before use?
  - Are raw strings interpolated into SQL/NoSQL queries, OS shell commands, templates, file paths (path traversal), or dynamic code evaluation (`eval`/reflection)?
- **Authentication & Authorization Invariants (`SEC-AUTH`)**:
  - Are authentication and object-level/role-level authorization checks enforced consistently at every entry point, or can internal handlers be invoked without verification?
  - Does session, token, or cryptographic handling rely on weak algorithms, insecure defaults, or timing-vulnerable comparisons?
- **Secret Hygiene & Data Leakage (`SEC-DATA`)**:
  - Are API keys, private keys, tokens, or passwords hardcoded in source files, build scripts, or test fixtures?
  - Can sensitive PII, credentials, or internal stack traces leak into logs, error responses, or telemetry payloads?
- **Supply Chain & Dependency Risks (`SEC-DEPS`)**:
  - Are dependencies unpinned, pulling from untrusted registries, or relying on abandoned/deprecated packages?

### Dimension 4: Performance & Resource Lifecycle (`PERF`)
Evaluate execution efficiency, scalability, and resource determinism:
- **Computational & Algorithmic Complexity (`PERF-ALGO`)**:
  - Do hot paths contain hidden $\mathcal{O}(n^2)$ or worse loops (e.g., linear array searches inside iterations instead of $\mathcal{O}(1)$ hash set/map lookups)?
  - Are expensive regex compilations, schema parses, or cryptographic initializations repeated inside tight loops?
- **I/O & Persistence Bottlenecks (`PERF-IO`)**:
  - Do database or network calls execute inside loops ($N+1$ query pattern) instead of batching or prefetching?
  - Are synchronous/blocking I/O operations executed on event loops or async runtime threads?
- **Memory Footprint & Resource Leaks (`PERF-MEM`)**:
  - Are file descriptors, database connections, network sockets, streams, or timers left unclosed on error/early-return paths?
  - Are entire large files or unbounded query result sets loaded into memory at once instead of streaming or paginating?
- **Concurrency & Synchronization Hazards (`PERF-CONC`)**:
  - Is shared mutable state accessed across threads, coroutines, or async tasks without atomic operations, locks, or message passing?
  - Are there lock-ordering inversions, unbounded goroutine/task spawns, or missing timeouts/cancellation propagation on external calls?

### Dimension 5: Operational Reliability & DX (`OPS`)
Evaluate production readiness, failure recovery, and developer workflows:
- **Error Handling & Recovery (`OPS-ERR`)**:
  - Are errors silently swallowed (empty `catch` blocks, ignored return tuples/results), or returned without causal context?
  - Do transient external failures lack bounded retries with exponential backoff, jitter, or circuit-breaking?
- **Telemetry & Observability (`OPS-OBS`)**:
  - Does the system emit structured logs with correlation/request IDs, or rely on unstructured stdout prints?
  - Are health checks, readiness probes, and key operational metrics missing at service boundaries?
- **Build, Deployment & Configuration Ergonomics (`OPS-BUILD`)**:
  - Does configuration fail fast at startup when required environment variables or settings are missing/invalid?
  - Are build scripts, container definitions, or CI pipelines non-reproducible, missing cache layers, or running privileged containers unnecessarily?
- **Documentation & Onboarding Accuracy (`OPS-DOC`)**:
  - Do `README.md`, architecture docs, or inline docstrings contradict the actual entry points, build commands, or runtime behavior of the code?