---
name: systems-auditor
description: Execute an exhaustive, unattended, multi-disciplinary technical audit across Architecture, Code Quality, Security, Performance, and Operational Reliability/DX for any project or programming language. Trigger when the user requests a full system audit, codebase review, technical health assessment, architectural audit, or holistic readiness evaluation. Do not trigger for single-function debugging, isolated syntax fixes, or greenfield feature scaffolding.
---
# Systems Auditor

## Overview
Perform an end-to-end, unattended Principal-level systems audit across five technical dimensions in any programming language or stack. This skill applies progressive reconnaissance and tiered remediation so the codebase is evaluated rigorously in a single pass without exhausting context limits or requiring pre-installed third-party CLI scanners.

## Core Mental Model
1. **Reconnaissance Before Ingestion**: Map project topology, entry points, and manifests first; never read every file blindly at step zero.
2. **Progressive Standards Loading**: Check for workspace-level @references/ standards alongside this skill's `references/dimension-rubrics.md`, loading rules dynamically as each subsystem is evaluated.
3. **Evidence or Silence**: Every finding must cite an exact file path, line range (`path/to/file.ext:L10-L25`), or symbol identifier. Speculative critiques and unverified assumptions are forbidden.
4. **Unattended Completion Guarantee**: Execute all phases through the final Action Plan in a single uninterrupted run. To prevent output truncation, provide full production code diffs for `Critical`, `High`, and `Medium` findings, and concise remediation directives for `Low` and `Informational` findings.

## Unattended Execution Workflow

### Phase 1: Stack & Topology Reconnaissance
1. **Map Directory & Manifests**: List top-level directories and inspect build, package, and runtime manifests (e.g., `package.json`, `Cargo.toml`, `go.mod`, `pyproject.toml`, `pom.xml`, `build.gradle`, `Gemfile`, `Composer.json`, `Makefile`, `Dockerfile`, CI/CD workflows) to determine languages, frameworks, and architectural boundaries.
2. **Load Reference Standards**:
   - Read `references/dimension-rubrics.md` within this skill directory to load the 5-dimension evaluation criteria and Triage Matrix definitions.
   - If the target project contains a @references/ or `docs/standards/` directory, scan its index and ingest relevant architectural and compliance standards.
3. **Identify High-Risk Hotspots**: Locate core domain modules, authentication/authorization boundaries, data persistence layers, external I/O boundaries, concurrency primitives, and application entry points for deep inspection.

### Phase 2: Five-Dimension Evaluation
Evaluate the system systematically against the rubrics in `references/dimension-rubrics.md`:
1. **Architecture & Modular Design (`ARCH`)**: Component coupling, cohesion, separation of concerns, architectural boundary violations, extensibility, and obsolete/dead code paths.
2. **Code Quality & Maintainability (`QUAL`)**: Readability, idiomatic style for the detected language, DRY compliance, cognitive complexity, code smells, and test coverage/robustness.
3. **Security, Safety & Integrity (`SEC`)**: Attack surfaces, input/schema validation, secret hygiene, dependency supply chain risks, data leakage, and authn/authz invariants.
4. **Performance & Resource Lifecycle (`PERF`)**: Algorithmic complexity, I/O and query bottlenecks, memory footprint, concurrency/race hazards, caching strategy, and resource/connection leaks.
5. **Operational Reliability & DX (`OPS`)**: Telemetry/observability, structured error handling and recovery, deployment ergonomics, build toolchain efficiency, and documentation accuracy.

### Phase 3: Triage & Diff Synthesis
1. Assign every verified finding a unique ID (`ARCH-01`, `QUAL-01`, `SEC-01`, `PERF-01`, `OPS-01`), a **Severity** (`Critical`, `High`, `Medium`, `Low`, `Informational`), and an **Effort** (`Low`, `Medium`, `High`).
2. Verify that every finding references an exact file path and line range (`path/to/file.ext:LStart-LEnd`).
3. Construct production-ready target code diffs (`diff` blocks) for all `Critical`, `High`, and `Medium` issues, ensuring idiomatic syntax and zero regressions. For `Low` and `Informational` findings, write a concise 1-2 sentence implementation directive.

## Mandatory Output Structure
Deliver the audit report using these exact four sections in sequence:

### 1. System Health Overview
High-level synthesis of the detected tech stack, system architecture, maturity baseline, and dominant risk themes across the five dimensions.

### 2. Audit Findings Table
Markdown summary table containing all identified issues sorted by Severity (`Critical` down to `Informational`):

| ID | Category | Severity | Effort | Location | Summary |
| :--- | :--- | :--- | :--- | :--- | :--- |

### 3. Detailed Findings & Diffs
Group findings by remediation tier:
- **Critical, High & Medium Findings**: For each finding, include:
  - **Root Cause & Blast Radius**: Why the issue exists and what fails or degrades if left unaddressed.
  - **Remediation & Target Diff**: Concrete implementation guidance followed by a production-ready `diff` block.
- **Low & Informational Findings**: Compact bulleted list citing `ID`, `Location`, root cause, and exact remediation directive.

### 4. Prioritized Action Plan
Sequenced remediation backlog organized into three execution horizons:
1. **Immediate Fixes (Stop-the-Bleeding)**: `Critical` and `High` security, safety, data-loss, or crash hazards requiring zero-delay patching.
2. **Tactical Refactoring (Short-Term Stability)**: High-ROI code quality, test coverage, performance bottleneck, and operational reliability improvements.
3. **Strategic Enhancements (Long-Term Architecture)**: Deep decoupling, boundary redesign, and toolchain modernization initiatives.