---
name: learning-curator
description: Curates empirical development struggles from ./learnings/*.md into permanent architectural immunity by auditing ~/.agents/skills/ and AGENTS.md to propose rulebook elevations, upgrade existing skills, split overloaded skills (>500 lines or multi-domain), or create new skills. Trigger when the user asks to process, curate, promote, or convert learnings into skills or rulebook updates. Never modifies or deletes files inside ./learnings/ and never targets local project skill directories outside ~/.agents/skills/.
---

# Learning Curator (`learning-curator`)

## 1. Purpose & Inviolable Constraints

Transform empirical development struggles staged in `./learnings/*.md` into permanent procedural immunity across `AGENTS.md` and the global `~/.agents/skills/` catalog without duplicating guidance, bloating existing skills, or mutating the learning inbox.

### Inviolable Operational Constraints

| Constraint Identifier | Enforcement Rule |
| :--- | :--- |
| `Read-Only Learning Inbox` | Treat `./learnings/*.md` strictly as immutable inputs. Never delete, move, rename, edit, or append status markers inside `./learnings/*.md`. |
| `Global Skill Scope Only` | Inspect, create, upgrade, and split skills exclusively inside `~/.agents/skills/`. Never scan or mutate workspace-local skill folders (`.opencode/skills/`, `./.agents/skills/`). |
| `Surgical Mutations` | Apply updates to `AGENTS.md` and existing `~/.agents/skills/*/SKILL.md` files via targeted `SEARCH/REPLACE` deltas; never perform blind whole-file overwrites on existing artifacts. |
| `500-Line Holocron Ceiling` | Every `SKILL.md` in `~/.agents/skills/` must remain strictly under `500` physical lines (`wc -l`). Skills reaching `450+` lines during an upgrade must undergo reference extraction or sibling splitting. |
| `Idempotent Re-Execution` | Because `./learnings/*.md` remains untouched after curation, verify whether each learning's `Prevention Rule` is already codified in `AGENTS.md` or `~/.agents/skills/` before proposing mutations. |

---

## 2. Core Mental Model: The 5-Way Curation Routing Matrix

Every staged learning entry (`Situation & Blocker`, `Applied Solution`, `Prevention Rule`) must be evaluated against `AGENTS.md` and `~/.agents/skills/` and assigned to exactly one of five mutually exclusive routing actions:

| Routing Action | Qualification Criteria | Target Artifact Mutation |
| :--- | :--- | :--- |
| `NO-OP (Already Integrated)` | The `Prevention Rule` invariant and its procedural remedy already exist in `AGENTS.md` or `~/.agents/skills/<skill>/` (`>= 75%` invariant token overlap or semantic equivalence). | None. Log exact file path and section where the rule is already enforced. |
| `ELEVATE (Propose AGENTS.md Update)` | Learning expresses a universal, language-agnostic, repository-agnostic invariant applicable to `100%` of tasks (e.g., git lock safety, command-chaining gates, universal verification hygiene) and fits a telegraphic OKF v0.2 factual triple (`Subject -> Predicate -> Object`). | Propose surgical `SEARCH/REPLACE` delta against `./AGENTS.md` (plus global `AGENTS.md` if applicable). |
| `UPGRADE (Enhance Existing Global Skill)` | Existing skill in `~/.agents/skills/<skill>/SKILL.md` shares `>= 60%` domain, trigger, or toolchain affinity, and integrating the new workflow/gotcha keeps `SKILL.md` strictly under `450` lines. | Update `~/.agents/skills/<skill>/SKILL.md` (and optional `references/` or `scripts/`). |
| `SPLIT (Decompose Overloaded Global Skill)` | Existing skill matches the domain (`>= 60%` affinity), but integrating the learning pushes `SKILL.md` to `>= 450` physical lines (`wc -l`) or mixes distinct execution lifecycles/personas. | Extract deep lookup matrices into `~/.agents/skills/<skill>/references/` (Vertical Split) or partition into two sibling skills under `~/.agents/skills/` (Horizontal Split). |
| `CREATE (Mint New Global Skill)` | Learning is situational or domain-specific (not a universal `AGENTS.md` invariant), and no existing skill in `~/.agents/skills/` reaches the `60%` domain affinity threshold. | Create `~/.agents/skills/<new-skill>/SKILL.md` (`< 500` lines) with optional `references/` and `scripts/`. |

---

## 3. Sequential Execution Workflow

### Phase 1: Deterministic Intake & Catalog Inventory

1. Run the bundled deterministic audit script to inventory `./learnings/*.md`, `~/.agents/skills/`, and `./AGENTS.md`:
   ```bash
   bun scripts/audit-catalog.ts \
     --learnings-dir ./learnings \
     --skills-dir ~/.agents/skills \
     --agents-md ./AGENTS.md \
     --format markdown
   ```
2. Inspect the generated inventory for:
   * Total parsed learning entries, their deterministic SHA-256 `Prevention Rule` fingerprints, and automated `NO-OP` / candidate skill affinity rankings.
   * Existing global skills in `~/.agents/skills/`, their physical line counts (`wc -l`), frontmatter trigger descriptions, and any `SPLIT_CANDIDATE` (`>= 450` lines) flags.
3. Read the full text of any candidate `~/.agents/skills/<skill>/SKILL.md` flagged by the script before designing mutations.

### Phase 2: Semantic Deduplication & Triage Classification

1. Consult `references/triage-and-split-rubric.md` to score domain affinity and transform each learning's components (`Situation & Blocker`, `Applied Solution`, `Prevention Rule`).
2. Group related learnings across `./learnings/*.md` that target the same destination skill so cohesive upgrades, reference extractions, or sibling splits occur in a single atomic pass.
3. Construct the **Curation Triage Table** (Section 4) mapping every learning entry to its chosen routing action (`NO-OP`, `ELEVATE`, `UPGRADE`, `SPLIT`, or `CREATE`), target path, and structural transformation plan.
4. If the user asked for a dry run or proposal, present the Curation Triage Table and await confirmation. If the user requested direct execution, proceed immediately to Phase 3.

### Phase 3: Artifact Mutation & Holocron Synthesis

Execute the approved routing actions strictly according to target tier rules:

* **For `NO-OP`**:
  * Record the existing location in the triage report. Perform zero file writes.
* **For `ELEVATE` (`AGENTS.md`)**:
  * Format the `Prevention Rule` as a strict OKF v0.2 telegraphic bullet or table row (`Subject -> Predicate -> Object`, explicit entity names, zero conversational filler, zero LaTeX or ASCII diagrams).
  * Place the rule in the matching chapter of `AGENTS.md` (e.g., Chapter 2 for operational guardrails, Chapter 6 for state/concurrency invariants, Chapter 7 for verification/testing gates, Chapter 9 for git/release hygiene).
  * Provide or apply the exact `SEARCH/REPLACE` delta.
* **For `UPGRADE` (`~/.agents/skills/<skill>/SKILL.md`)**:
  * Map `Prevention Rule` -> **Mandatory Preconditions / Decision Gate** section.
  * Map `Applied Solution` -> **Sequential Execution Workflow** step (or extract reusable check logic into `scripts/`).
  * Map `Situation & Blocker` -> **Gotchas & Edge Cases** entry (symptom signature + deterministic fix).
  * Expand the YAML frontmatter `description` trigger keywords only if the learning introduces a new failure symptom or tool trigger within the same domain.
* **For `SPLIT` (`~/.agents/skills/<skill>/`)**:
  * **Pattern A (Vertical Reference Extraction)**: When the domain is cohesive but `SKILL.md` exceeds `450` lines, move OS-specific matrices, verbose config templates, or protocol tables into `~/.agents/skills/<skill>/references/<topic>.md` and link them from `SKILL.md`.
  * **Pattern B (Horizontal Sibling Split)**: When a skill straddles two distinct lifecycles or roles, mint `~/.agents/skills/<sibling-skill>/SKILL.md`, migrate the secondary domain sections, and add explicit negative boundaries (`Never trigger for...`) to both skills' YAML frontmatter `description` fields.
* **For `CREATE` (`~/.agents/skills/<new-skill>/SKILL.md`)**:
  * Create `~/.agents/skills/<new-skill>/SKILL.md` using a clean kebab-case directory name.
  * Include valid YAML frontmatter (`name`, `description` with explicit positive activation triggers and negative scope boundaries).
  * Structure the syllabus with: Purpose & Preconditions, Decision Matrix, Sequential Workflow, and Gotchas & Edge Cases.
  * If `AGENTS.md` Chapter 4 (`Skill Delegation & Discovery`) lacks a routing row for the new domain capability, propose a surgical `SEARCH/REPLACE` row addition to `AGENTS.md`.

### Phase 4: Post-Curation Verification Gate

1. Execute the audit script in verification mode to confirm all global skills in `~/.agents/skills/` have valid frontmatter and remain strictly under `500` physical lines:
   ```bash
   bun scripts/audit-catalog.ts \
     --learnings-dir ./learnings \
     --skills-dir ~/.agents/skills \
     --agents-md ./AGENTS.md \
     --verify-skills
   ```
2. Verify that `./learnings/` remains completely untouched:
   ```bash
   git status --porcelain ./learnings
   ```
   Output must be empty (`0` modified, added, or deleted files in `./learnings/`).

---

## 4. Curation Triage Report Template

Always emit the following structured Markdown summary when reporting curation analysis or execution results:

```markdown
## Learning Curation Triage Matrix

| Learning Source & Date | Entry Title | Rule Fingerprint | Routing Action | Target Holocron / Artifact | Transformation Summary |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `toolchain.md` (2026-10-25) | `<Title>` | `<8-char-sha>` | `UPGRADE` | `~/.agents/skills/<skill>/SKILL.md` | Add precondition gate + Windows `.cmd` gotcha |
```

---

## 5. Gotchas & Edge Cases

* **Host vs. Workspace Skill Path Drift**:
  * *Symptom*: `AGENTS.md` or a staged learning entry references `.agents/skills/<domain>/SKILL.md` or `.opencode/skills/<domain>/SKILL.md` as a workspace-relative path.
  * *Remedy*: `learning-curator` operates exclusively on the host global catalog at `~/.agents/skills/`. Never create or modify skills inside workspace-local `.agents/skills/` or `.opencode/skills/`. When proposing Chapter 4 table updates to `AGENTS.md`, preserve the repository's established path convention in `AGENTS.md` while storing the curated skill implementation in `~/.agents/skills/`.
* **Idempotent Re-Runs on Unmodified `./learnings/`**:
  * *Symptom*: Running `learning-curator` a second time appends duplicate bullets or duplicate gotcha sections to `~/.agents/skills/<skill>/SKILL.md` because `./learnings/*.md` files are never deleted or marked inline.
  * *Remedy*: Always check both the `audit-catalog.ts` overlap flags and the target file's existing rules before mutating. If the `Prevention Rule` semantics are already present, classify the entry as `NO-OP (Already Integrated)`.
* **Over-Elevating Situational Rules to `AGENTS.md`**:
  * *Symptom*: Platform-specific or tool-specific workarounds (e.g., Windows `npm.cmd` requiring `shell: true` with `execFile`, or `npm publish` `0.0.0-stage` registry polling) get elevated into `AGENTS.md`, bloating the universal rulebook.
  * *Remedy*: Apply the 4-Gate Elevation Filter in `references/triage-and-split-rubric.md`. If a rule names a specific OS, package manager, framework, or runtime API (`npm`, `Windows`, `execFile`, `opencode`), route it to `~/.agents/skills/` (`UPGRADE`, `SPLIT`, or `CREATE`), never `AGENTS.md`.
* **Orphaned References During `SPLIT`**:
  * *Symptom*: Extracting a section from `SKILL.md` into `references/<topic>.md` leaves no explicit pointer in `SKILL.md`, causing agents not to discover the reference file.
  * *Remedy*: Every file placed in `references/` or `scripts/` must be explicitly cited with an activation condition inside the parent `SKILL.md` workflow.