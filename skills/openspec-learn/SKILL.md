---
name: openspec-learn
description: >
  Analyze reports from `openspec-report` to generate OpenSpec proposals for
  skill improvements. Use when analyzing reports to plan skill creation,
  improvements, or lifecycle actions. Do NOT use when proposing a new change
  from scratch (use openspec-propose), generating reports from archived changes,
  or implementing proposals.
allowed-tools: Bash(openspec:*), Bash(node:*), Bash(mkdir:*), Bash(ls:*)
license: MIT
compatibility: Requires openspec CLI and bun.
metadata:
  author: agentic
  version: "1.3.1"
positive_triggers:
  - "analyze reports and improve skills"
  - "generate proposals from report insights"
  - "process reports and create improvement plans"
anti_triggers:
  - "propose a new change from scratch"
  - "generate a report from an archived change"
  - "implement a proposal or apply changes"
---

# Openspec Learn

Analyze reports and generate OpenSpec proposals for improvements.

## Quick Start

- **With argument**: Process single report: `./openspec/reports/<name>/`
- **Without argument**: Process ALL reports: `./openspec/reports/*/` (excluding `archives/`)
- **With store**: Forward selected `--store <id>` on applicable commands (`new change`, `status`, `instructions`, `list`, `show`, `validate`, `archive`, `doctor`, `context`, `schemas`, `view`); sticky for workflow; nearest-root if unselected

## Workflow

### Phase 1: Report Scanning

```bash
ls ./openspec/reports/ | grep -v archives
```

### Phase 2: Report Analysis

**From report.md:** OKF frontmatter, problem statement, approach, specs, implementation, validation, trade-offs, follow-ups.

**From assessment.md:** knowledge gaps, difficulty ratings, tool improvements, what could have helped.

### Phase 2a: Semantic Collision Detection

Scan existing skills for description overlap with proposed tool:

```bash
grep -r "description:" .agents/skills/*/SKILL.md ./project/skills/*/SKILL.md 2>/dev/null
```

Compare proposed tool's domain keywords against existing descriptions. If overlap detected → flag collision in proposal, suggest updating existing skill instead of creating new one.

### Phase 2b: Trigger Metadata Extraction

Extract trigger candidates from report assessment:
- What queries/situations led to this change? → candidate positive_triggers
- What was confusing or out-of-scope? → candidate anti_triggers

Include as "Suggested Triggers" section in proposal.

### Phase 2c: Ownership Pre-Check + Single-Responsibility Pre-Check

**Ownership pre-check (MANDATORY, runs first).** Classify every candidate target skill by ownership using this precedence chain — recorded facts before conventions, conventions before residual judgment:

1. Inside the agentic repo itself → `project/skills/*` is owned (editable only by the project owner and the owner's trusted assistant session)
2. Listed in `.agents/skills/.agentic-manifest.json` → agentic-distributed → **external** (read-only for consumers)
3. Located in `~/.pi/agent/skills/` (not created by this project) → **external**
4. Explicit verdict in `.agents/skills/.ownership.json` (`{"owned": [...], "external": [...]}`) → as declared
5. Named `openspec-*` and authored by OpenSpec (upstream path `.agents/skills/openspec-*`, frontmatter `author: openspec`) → **external** (public namespace claim; does NOT apply to agentic-authored `project/skills/openspec-{learn,report,harden}`, which remain owned at source per item 1 and read-only once installed elsewhere)
6. Any other skill in the project's `.agents/skills/` → project-created → editable
7. Unresolved after all checks → unknown = **external**, ask the user

Rules:
- Proposals MUST NOT target external skills. Never edit installed/upstream files under `.agents/skills/*` in place — consumer agents treat installed skills as read-only; the next atomic-replace install silently wipes in-place edits. Reroute improvements upstream or to project-local placements.
- Domain-specific knowledge belongs in project-local homes (wiki, checklists, project-created skills). If no local home exists, ask the user where to place it.
- Genuinely generic improvements to external skills: record as an upstream recommendation for the user (issue/PR), never edit directly.
- When you ask the user about an unknown skill's ownership, record the verdict in `.ownership.json` so each question is asked once.

**Single-responsibility pre-check** (only for targets that passed the ownership check):

For proposed updates to existing skills:
- Does the improvement align with the skill's atomic intent?
- Or does it add a new operational domain?

If scope expansion detected → propose splitting into separate skill instead of updating.

### Phase 2d: Value Justification

Estimate whether creating/updating a skill improves outcomes by >= 20%:
- Assessment difficulty >= 3/5 OR knowledge gaps identified → justified
- All difficulty <= 2/5 AND no gaps → flag as low value in proposal
- **Frequency × cost heuristic (new):** Read `Re-use Score` (high=3, medium=2, low=1) and `Time Cost` from report/assessment; prioritize `frequency × cost` — a `high` re-use gap that cost 60m and recurs ≥2 times outranks a singleton `low` gap even if its difficulty was 5/5

### Phase 2e: Context Budget Impact

Estimate Tier 1 + Tier 2 token cost of proposed skill based on similar skills. Warn if >2000 tokens in proposal.

### Phase 2f: Recurring Gap Clustering (compound learning)

Before proposing, cluster gaps and gotchas across ALL reports in `openspec/reports/*` (excluding `archives/`).

**Primary Clusterer (Hybrid Semantic via QMD):**
Query the project-local index (never a global or shared index) scoped to `openspec` and `references` collections:
```bash
qmd query $'intent: cluster recurring knowledge gaps, skills gaps, and gotchas across reports\nlex: knowledge gaps skills gaps gotchas mental model shift\nvec: recurring difficulties, surprises, and lessons learned from past changes' --json -n 20 -c openspec -c references
```
Retrieve evidence for clustered items via `qmd multi-get "<docids>" --json`. Clusters MUST carry `qmd://` document IDs as evidence in the proposal. Semantic matching groups paraphrased descriptions of the same underlying obstacle even when distinct keywords were used.

**Loud Fallback (Keyword Grep):**
If the QMD daemon is unreachable or the index is unhealthy (`qmd status` fails):
```bash
# Loud fallback: note "qmd unavailable, grep fallback" in proposal
for f in openspec/reports/*/report.md openspec/reports/*/assessment.md; do [ -f "$f" ] && echo "== $f ==" && grep -E "Knowledge gaps|Skills gaps|Concrete Gotcha|Before \(old|After \(new|Re-use Score|Time Cost" "$f" | head -n 20; done
```
Note `qmd unavailable, grep fallback` explicitly in the proposal's Analysis section.

Group recurring findings by topic/keyword and count occurrences. Prioritize a cluster that recurs in ≥2 reports over a singleton, even if the singleton's difficulty was higher. Record the cluster table (topic/keyword → count → representative gap → `qmd://` evidence) in the proposal's Analysis section; this drives `Deferred:` decisions in Phase 5.

**Dashboard generation (human curation view):** After clustering, write/overwrite `openspec/reports/dashboard.md` (never archived, never auto-loaded at agent startup):
```bash
# Header: generated at $(date -u +"%Y-%m-%dT%H:%M:%SZ") from N reports
# Table: keyword | count | avg Time Cost | avg Re-use (high=3/med=2/low=1) | owning skill | m  sorted by frequency×cost desc
# Source: grep Re-use Score + Time Cost + keyword + owning skill from clustered reports + benchmark.json m
# If no reports, write: No reports yet — run /opsx-report after a hard task
```
Header `generated at <timestamp> from N reports`; table sorted `frequency × cost` desc (count × Re-use weight × avg Time Cost). Overwrite on each learn run; human reads it to curate manual reports.

**Lifecycle check (prune/merge/split):** After clustering, also evaluate:
- **Prune:** If a skill's usage count is 0 in last 10 reports OR its `benchmark.json` `behavioral.m < 0.2`, mark `Prune: <skill> — 0/10 or low m`
- **Merge:** If ≥3 shared gaps under same keyword across 2 skills, mark `Merge: <target> ← <a> + <b> — shared keyword`
- **Split:** If a skill's description would need `and`, mark `Split: <skill> → <a> + <b> — single-responsibility`
Each emits one-path `What Changes: Remove project/skills/<skill>/` or `Merge: ...` with `Deferred:` for rejected lifecycle candidates.

### Phase 3: Tool Type Determination

See [references/tool-type-detection.md](references/tool-type-detection.md) for full detection matrix.

### Phase 4: Conflict Resolution

See [references/conflict-handling.md](references/conflict-handling.md) for merging strategies.

### Phase 5: OpenSpec Proposal Generation

Generate proposal including:
- What to build + why (from report + assessment)
- Suggested Triggers section (from Phase 2b) — MUST use the exact frontmatter field names `positive_triggers` and `anti_triggers` as list headers, with each value formatted for verbatim transfer into a skill's frontmatter (no prose labels like "Positive:" or "Negative:")
- **Contrast and Anti-example hints (from report's Mental Model Shift / Concrete Gotcha):** Carry `Contrast: Before X → After Y` (1–2 lines) and `Anti-example: Do NOT: <before code> → Do: <after code>` verbatim into What Changes so `skill-creator` can generate contrast tables and anti-examples as first-class content
- **Layer-aware decision note:** State `Layer: 1 (always) vs 2 (on-demand skill) vs 3 (gate)` — for `Re-use Score: high` + `Time Cost >30m` + recurring cluster, suggest `Layer 1/3` promotion (e.g., `guardrails` skill or `AGENTS.md` Must-read pointer); otherwise `Layer 2` new/updated skill; no gate is implemented in this change, only the hint
- **Lifecycle What Changes (when applicable):** Emit `What Changes: Remove project/skills/<skill>/` for prune, `What Changes: Merge project/skills/<target>/ ← <a> + <b>` for merge, or `Split` with two one-path creates; each with `Impact: evals + manifest updated` and `Deferred:` for rejected lifecycle candidates; cap 8 enforced here (see Gotchas)
- Value Justification section (from Phase 2d, now including frequency × cost)
- Collision warnings (from Phase 2a)
- Context budget impact (from Phase 2e)
- Clustering summary (from Phase 2f) — keyword → count → representative gap
- **Dashboard citation (MANDATORY when lifecycle or create):** Each `create`/`prune`/`merge`/`split` in `What Changes` MUST cite `Source: dashboard.md#<keyword> — <count>× <Re-use> <time> (avg)` with verification path `openspec/reports/dashboard.md` — e.g., `Source: dashboard.md#lifetime — 4× high 45m avg`
- Evals impact statement (MANDATORY when the proposal modifies an existing skill): state whether `evals/evals.json` changes; if triggers are added or altered, include at least one matching eval entry in Impact. No trigger changes → state that existing evals remain valid.
- Deferred signals line (when the source report/assessment contains more improvement candidates than the proposal adopts): name each unadopted candidate with a one-line reason, so deferral is explicit rather than silent

**One-path rule**: every What Changes and Impact item names exactly ONE concrete target file path. Either/or targets ("X or Y") are prohibited — resolve the choice during design, before tasks are written. Task verify clauses must reference the same single path.

**OpenSpec CLI Contract & Store Forwarding:**
- Scaffold new changes with `openspec new change "<name>"` (forwarding `--store <id>` if selected). Never create change directories by hand.
- Forward selected `--store <id>` on applicable commands (`new change`, `status`, `instructions`, `list`, `show`, `validate`, `archive`, `doctor`, `context`, `schemas`, `view`); keep sticky; nearest-root if unselected. Other commands run unflagged.
- Failure envelope: Parse stdout as single JSON payload; stderr carries prose/spinners/store banner (never parse stderr as JSON). On exit 1, parse `status: [diagnostic]` array (`severity`, `code`, `message`, `fix`). Exit 130 = prompt cancelled.
- Payload casing: Workflow payloads use `camelCase`; store payloads use `snake_case` (`root.store_id` always `snake_case`).
- Archive delegation: Follow-on change archiving delegates to `openspec archive --json` (`archivedAs`, `specsUpdated`, `totals`, `warnings`). Never hand `mv` change directories or hand-merge delta specs into main specs.

The proposal instructs the AI agent to invoke skill-creator during `/opsx-apply`.

### Phase 6: Archive Processed Reports

```bash
mkdir -p ./openspec/reports/archives
mv ./openspec/reports/<name> ./openspec/reports/archives/
# dashboard.md never moves — it stays at openspec/reports/dashboard.md (human curation view, not a report)
```
Note: Only processed reports are moved via `mv`. OpenSpec changes MUST be archived via `openspec archive --json`, never by hand `mv`.

### Phase 7: Display Summary

Report count, proposal count, archive count, next steps.

## Gotchas

- **Collision detection prevents dilution**: Two skills with similar descriptions reduce routing confidence for both.
- **Trigger metadata saves Discovery time**: Pre-filling triggers from assessment data gives skill-creator a head start.
- **Low-value skills waste context**: If difficulty <= 2/5 and no gaps, don't create a skill — the agent handles it fine already.
- **Context budget matters**: Every skill costs tokens on every activation. Estimate before creating.
- **Single-responsibility**: If improvement adds new domain to existing skill, split instead of updating.
- **Deferred is explicit (clustering-driven):** When clustering finds 4 candidates and proposal adopts 2, the remaining 2 MUST appear under `Deferred:` with one-line reasons — populated from Phase 2f cluster table, not silently dropped.
- **Lifecycle: prune/merge/split:** `Prune` when 0/10 or `m<0.2`, `Merge` when ≥3 shared gaps same keyword, `Split` when description needs `and` — emit one-path `What Changes` with `Deferred:` for rejected
- **Cap 8: create must pair with prune/merge at cap:** When 8 skills exist, any `create` proposal MUST also include a `prune` or `merge` in same proposal; never silently exceed cap

## Error Handling

| Error | Action |
|-------|--------|
| No reports found | Suggest `/opsx-report` |
| Report missing assessment.md | Process report.md only |
| Invalid proposal generation | Log error, continue |
| Archive move fails | Log error, leave in place |

## Reference Files

- `references/report-analysis.md` — How to parse reports
- `references/skill-quality.md` — Quality criteria
- `references/improvement-patterns.md` — Common improvement types
- `references/evaluation-methodology.md` — Eval framework
- `references/tool-type-detection.md` — Full detection matrix
- `references/conflict-handling.md` — Merging strategies
- `references/examples.md` — Worked examples
