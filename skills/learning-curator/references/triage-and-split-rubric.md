# Triage, Elevation, Transformation & Split Rubric

Reference guide for `~/.agents/skills/learning-curator/SKILL.md`. Use these deterministic rubrics during **Phase 2 (Semantic Deduplication & Triage Classification)** and **Phase 3 (Artifact Mutation & Holocron Synthesis)**.

---

## Section 1: Quantitative & Qualitative Overlap Rubric

When evaluating a learning entry against an existing global skill in `~/.agents/skills/<skill>/SKILL.md`, compute the **Domain Affinity Score (`0%` to `100%`)** across three weighted dimensions:

| Dimension | Weight | Scoring Criteria |
| :--- | :--- | :--- |
| **1. Trigger & Failure Context Overlap** | `40%` | Does the learning occur during the exact activity described in the skill's YAML `description`? (`40%` = identical task trigger; `20%` = adjacent workflow; `0%` = unrelated trigger). |
| **2. Toolchain & Entity Affinity** | `35%` | Do the entities in `Situation & Blocker` and `Prevention Rule` (e.g., `git`, `check.sh`, `MCP`, `worker queue`, `npm`, `CI runner`) match the tools governed by the skill? (`35%` = core tool match; `15%` = shared runtime only; `0%` = disjoint stack). |
| **3. Lifecycle Phase Alignment** | `25%` | Does the `Applied Solution` execute in the same engineering phase (e.g., architecture design, inner-loop implementation, test verification, release/publish)? (`25%` = same phase; `10%` = adjacent phase; `0%` = different lifecycle phase). |

### Affinity Decision Thresholds

* **Score `>= 60%` and target `SKILL.md` post-edit `< 450` lines** -> **`UPGRADE`** existing skill.
* **Score `>= 60%` and target `SKILL.md` post-edit `>= 450` lines (or mixes distinct lifecycles)** -> **`SPLIT`** existing skill.
* **Score `< 60%` across all skills in `~/.agents/skills/`** -> Evaluate against the **Section 2 Elevation Filter**:
  * Passes all 4 Elevation Gates -> **`ELEVATE`** to `AGENTS.md`.
  * Fails any Elevation Gate -> **`CREATE`** a new global skill in `~/.agents/skills/<new-skill>/`.

---

## Section 2: The 4-Gate `AGENTS.md` Elevation Filter

`AGENTS.md` is the persistent, universal rulebook loaded into every session. To protect context budget, a learning qualifies for `ELEVATE` if and only if it passes **all four gates**:

| Gate | Requirement | Pass Example | Fail Example (Route to `SKILL.md` Instead) |
| :--- | :--- | :--- | :--- |
| **Gate 1: Universal Stack Agnosticism** | Applies to `100%` of repositories regardless of programming language, OS, or framework. | Retry state machine distinguishing `off` (never active) vs. `recovering` (lost active). | Node `execFile` requiring `shell: true` for `.cmd` shims on Windows. |
| **Gate 2: Zero Procedural Bulk** | Expressible as a single OKF v0.2 factual triple (`Subject -> Predicate -> Object`) or single table row (`<= 3` lines) without helper scripts or multi-step bash recipes. | Non-blocking tests synchronizing on explicit gate signals rather than wall-clock sleep durations. | Polling `npm view <pkg> version` and purging `~/.cache/opencode/npm/` to bypass `0.0.0-stage`. |
| **Gate 3: Architectural / Operational Invariant** | Governs core agent safety, git integrity, state determinism, IPC/boundary contracts, or verification determinism. | Never chaining dependent `git` mutations across heredoc terminators; verifying no live `git` process before removing `.git/index.lock`. | Setting `* text=auto eol=lf` in `.gitattributes` and creating dual `npm` / `npm.cmd` test fakes. |
| **Gate 4: Non-Redundancy with Existing Chapters** | Complements an existing chapter in `AGENTS.md` without duplicating an already stated invariant. | Adding cross-lane cache `refresh()` autonomy to Chapter 6 (State & Concurrency). | Re-stating that secrets must not be committed (already in Chapter 2 & Chapter 9). |

---

## Section 3: Anatomy of a Learning Transformation

Each learning in `./learnings/<domain>.md` contains three structured fields. Transform them according to the target artifact type:

### A. When Routing to `ELEVATE` (`AGENTS.md`)

Compress the entire learning into a single **OKF v0.2 Factual Triple** or **Guardrail Bullet** using exclusively the `Prevention Rule` and core entity names from `Applied Solution`:

* **Input Learning (`testing.md`)**:
  * *Situation & Blocker*: Test asserted plugin setup returned within a fixed sub-second window while a fake npm probe slept; failed under parallel load.
  * *Applied Solution*: Replaced sleep and elapsed-time assertion with a gate file blocking the fake probe until opened by the test.
  * *Prevention Rule*: A test for non-blocking behavior -> must synchronize on an explicit signal -> never on elapsed wall-clock time or a sleep duration.
* **Transformed `AGENTS.md` Bullet (Chapter 7: Quality Invariants & Verification)**:
  ```markdown
  * `Deterministic Async Test Synchronization`: `Non-Blocking Test` synchronizes strictly on explicit coordination signals, latches, or gate handles; `Coding Agent` forbids wall-clock elapsed-time assertions and fixed sleep durations in concurrency tests.
  ```

### B. When Routing to `UPGRADE`, `SPLIT`, or `CREATE` (`~/.agents/skills/<skill>/SKILL.md`)

Decompose all three fields of the learning into three distinct structural zones of the target skill:

1. **`Prevention Rule` -> Mandatory Precondition / Decision Gate**:
   Place near the top of `SKILL.md` (or the relevant workflow phase) as an unbreakable gate before action:
   ```markdown
   * **Precondition (Registry Publish Readiness)**: Before installing a newly published package via consumer CLI tools, verify `npm view <pkg> version` matches the target release version; never rely on `latest` tag resolution inside the registry's initial processing window.
   ```
2. **`Applied Solution` -> Actionable Sequential Workflow Step**:
   Convert past-tense narrative into imperative commands or reusable patterns:
   ```markdown
   1. Poll registry availability until `npm view <pkg> version` outputs `<expected-version>`.
   2. If a prior install attempt ran during the `0.0.0-stage` window, purge the poisoned cache (`rm -rf ~/.cache/opencode/npm/<pkg>@latest`) and re-run with `NPM_CONFIG_PREFER_ONLINE=true`.
   ```
3. **`Situation & Blocker` -> Gotchas & Edge Cases Signature**:
   Preserve the concrete failure symptom and error message so the agent recognizes it immediately upon encounter:
   ```markdown
   * **First `npm publish` `0.0.0-stage` Placeholder Poisoning**:
     * *Symptom*: Running `opencode plugin add <pkg>` immediately after initial `npm publish` fails with `Plugin package has no server or TUI entrypoint: <pkg>`, and retries continue failing due to cached metadata.
     * *Root Cause*: npm 12 briefly points `latest` at a temporary `0.0.0-stage` stub tarball while processing a new unscoped package.
     * *Remedy*: Wait for `npm view <pkg> version` to report the real version, delete `~/.cache/opencode/npm/<pkg>@latest`, and reinstall with `NPM_CONFIG_PREFER_ONLINE=true`.
   ```

---

## Section 4: Skill Splitting Patterns (`SPLIT` Execution Playbook)

Trigger a `SPLIT` whenever an upgraded skill in `~/.agents/skills/<skill>/SKILL.md` would exceed `450` physical lines (`wc -l`) or when a single `SKILL.md` accumulates uncorrelated domain responsibilities.

### Pattern A: Vertical Reference Extraction (Cohesive Domain, High Line Count)

Use when `~/.agents/skills/<skill>/SKILL.md` has a single unified trigger scope, but detailed OS matrices, error catalogs, or configuration templates push it over `450` lines.

1. Keep the YAML frontmatter, Core Mental Model, Mandatory Preconditions, and high-level Sequential Workflow inside `~/.agents/skills/<skill>/SKILL.md` (targeting `150-250` lines).
2. Extract detailed lookup tables, platform-specific workarounds (e.g., Windows vs. POSIX CI shims), and code templates into `~/.agents/skills/<skill>/references/<subtopic>.md`.
3. Add an explicit pointer in `SKILL.md` instructing the agent when to read `references/<subtopic>.md` (e.g., *"When authoring multi-OS test fakes or diagnosing Windows CI failures, read `references/cross-platform-ci-parity.md`"*).

### Pattern B: Horizontal Sibling Split (Multi-Domain or Multi-Lifecycle Overload)

Use when `~/.agents/skills/<skill>/SKILL.md` mixes two separate engineering lifecycles (for example, combining inner-loop unit test harness execution with external package registry publishing).

1. Retain the primary lifecycle in `~/.agents/skills/<skill-a>/SKILL.md`.
2. Mint a sibling directory `~/.agents/skills/<skill-b>/SKILL.md` for the secondary lifecycle.
3. Update both YAML frontmatter `description` fields with **mutually exclusive negative boundaries**:
   * In `<skill-a>/SKILL.md`: *"Trigger when running local verification gates or multi-OS CI test harnesses. Never trigger for package registry publishing or version release workflows (use `<skill-b>`)."*
   * In `<skill-b>/SKILL.md`: *"Trigger when publishing packages to registries, verifying artifact propagation, or managing release tags. Never trigger for local test harness execution (use `<skill-a>`)."*
4. Re-run `scripts/audit_learning_catalog.py --verify-skills` to confirm both sibling skills are `< 500` physical lines and have valid frontmatter.

---

## Section 5: Idempotency & `NO-OP` Verification Protocol

Because `./learnings/*.md` is strictly read-only and never purged after curation:

1. Check the SHA-256 `Rule Fingerprint` and token overlap score emitted by `scripts/audit_learning_catalog.py`.
2. Any learning with `>= 75%` normalized token overlap against `AGENTS.md` or an existing `~/.agents/skills/*/SKILL.md` (or `references/*.md`) is flagged by the script as `CANDIDATE_NO_OP`.
3. Visually confirm that both the **invariant constraint** (`Prevention Rule`) and the **actionable remedy** (`Applied Solution`) are present in the matched target file.
4. If confirmed, classify as `NO-OP (Already Integrated)` in the Curation Triage Matrix and skip all file mutations for that entry.