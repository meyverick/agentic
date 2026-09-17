---
name: create-skill
description: Create new Agent Skills from problem descriptions or instruction files. Walks through discovery, design, authoring, validation, evaluation, and optimization phases. Use when the user wants to build a new skill, create a skill from a workflow, extract a reusable pattern from a task, or set up evaluation for an existing skill. Do NOT use when the task involves general coding, debugging application code, writing project documentation, or any work unrelated to skill creation.
allowed-tools: Bash(*)
license: MIT
compatibility: Requires bun.
metadata:
  author: agentic
  version: "2.0"
positive_triggers:
  - "create a new skill"
  - "build a skill from a workflow"
  - "extract a reusable pattern into a skill"
  - "set up evaluation for an existing skill"
  - "improve or fix an existing skill"
anti_triggers:
  - "general coding task not related to skills"
  - "debug or fix application code"
  - "write project documentation or README"
runtime:
  requires:
    - bun >= 1.0
  timeout_seconds: 30
  output_format: json
---

# Create Skill

Create new Agent Skills from problem descriptions or instruction files. Fully autonomous workflow with research-informed quality standards.

## Quick Start

When the user wants to build a new skill:

1. Run `scripts/scaffold-skill.mjs <skill-name>` to create skeleton in `./project/skills/`
2. Follow the workflow below to fill in content
3. Skill ships when Phase 7 completes

When invoked from `/skill-create <name>` with instruction file:

1. Read `./skills-todo/<name>.md`
2. Skip Phase 1 (Discovery) — instructions have answers
3. Start at Phase 2 (Design) with provided decisions
4. Follow standard workflow from there

The workflow is fully autonomous — it runs continuously until user input is needed (Discovery answers, Ship approval). Auto-fix and retry on validation/eval failures.

## Tiers

| Tier | What's Included | When to Use |
|------|-----------------|-------------|
| **Minimal** | Structural validation + content review | Quick prototyping, low-stakes skills |
| **Standard** | Minimal + 2-3 test cases + manual eval | Most production skills |
| **Rigorous** | Standard + full eval + description optimization + quality score | High-stakes workflows, shared skills |

**Default: Rigorous.** User can request early exit to Minimal or Standard.

## Workflow

### Phase 0: Read Instructions (if provided)

If invoked from `/skill-create <name>`:

1. Read `./skills-todo/<name>.md`
2. Extract: problem, requirements, design decisions, gotchas, eval strategy
3. Skip to Phase 2 (Design) with provided information

If invoked directly (no instruction file):
1. Continue to Phase 1 (Discovery)

### Phase 1: Discovery

**Skip this phase if instructions were provided.**

Ask the user (open-ended, no presets):

1. What problem should this skill solve?
2. What domain knowledge is needed?
3. Which agent/harness will use it?
4. Existing patterns to extract from?
5. What does success look like?
6. Which tier? (default: Rigorous)
7. **What queries or situations SHOULD activate this skill?** (collect at least 3 examples → positive_triggers)
8. **What queries look similar but should NOT activate this skill?** (collect at least 2 examples → anti_triggers)
9. **Can you describe the skill's purpose in ONE sentence without using "and"?** (verifies atomic intent)

### Phase 2: Design

Determine:

1. **Scope**: Single atomic intent. One sentence, no "and". If compound → split into multiple skills.
2. **Fragility**: Mutation = strict, read-only = loose, creative = low — see `references/fragility-matching.md` (Level 2).
3. **Progressive disclosure**: SKILL.md vs references/ with context budget per tier:
   - Tier 1 (frontmatter): <50 tokens
   - Tier 2 (SKILL.md body): <1500 tokens
   - Tier 3 (references/): on-demand only
4. **Components**: Persona / instructions / templates / data (not omnibus) — see `references/component-decomposition.md` (Level 2).
5. **Scripts**: Reusable logic to bundle (.mjs, cold/isolated, relative paths only)
6. **Eval strategy**: Test cases, assertions, near-miss negatives, baseline comparison
7. **Activation boundary**: Define what triggers and what does NOT trigger
8. **Runtime contract**: Required runtimes (bun/node/python), timeout_seconds, output_format (json)
9. **Output contract**: JSON schema for success and error responses
10. **Retrieval collision check**: Run hybrid retrieval over installed and project skills before scaffolding: `qmd query "<intent>" --json -n 10` (hybrid) per `project/AGENTS.md:180`, fetch hits via `qmd multi-get`, and evaluate description overlap. If semantic overlap is detected, flag the collision and suggest updating the existing skill instead of creating a new one.

### Phase 3: Authoring

1. **Scaffold**: `scripts/scaffold-skill.mjs <name>` → creates directory + SKILL.md skeleton
2. **Frontmatter**: name, description (imperative, specific, "Use when... Do NOT use when..."), positive_triggers (min 3), anti_triggers (min 2), allowed-tools, compatibility, runtime
3. **SKILL.md body sections** (in order):
   - Activation Boundary: explicit trigger/exclusion lists
   - Pre-Flight Checks: environment probes before execution
   - Output Contract: JSON schema for success/error
   - Core instructions (<500 lines, <1500 tokens)
   - Contrast: `| Before (old) | After (new) | Why different |` table when proposal carries `Contrast:` hint (e.g., `C# null → Rust Option`); keep distinct from routing
   - Anti-examples: `Do NOT: <before>` → `Do: <after>` with Why, when proposal carries `Anti-example:` hint from report's Concrete Gotcha; body content, NOT frontmatter `anti_triggers`
   - Tiered depth: Level 1 basics inline, Level 2 advanced behind `references/<topic>.md` (cap one file per skill)
4. **Scripts**: Generate if clearly reusable (.mjs, self-contained, relative paths via import.meta.url, JSON output only)
5. **References**: Domain-specific docs, loaded on-demand — **Tiered depth:** Level 1 basics inline in SKILL.md, Level 2 advanced behind `references/<topic>.md`; cap at one `references/` file per skill; link explicitly from SKILL.md
6. **Templates**: Output shapes, examples
7. **Single source**: Define each rule ONCE, reference everywhere else
8. **Portability**: No absolute paths (/home/, /root/, C:\), no harness-specific dirs (.pi/, .agents/) in executable code

### Phase 4: Validation (mandatory)

**Output contract**: all three validators emit one shared JSON envelope — `{target, pass, checks:[{id, status: PASS|FAIL|WARN|SKIP, detail}], summary}` — so downstream tooling branches deterministically on `pass` and `checks[].status` regardless of which script produced it.

**Step 1: Structural validation**
```bash
scripts/validate-structure.mjs <skill-dir>
```
Checks: name format, description format, directory structure, file references, positive_triggers (min 3), anti_triggers (min 2), "Use when" phrasing, "Do NOT use when" phrasing, no compound intent, no hardcoded paths, runtime declared when scripts exist.

**Evidence requirement**: record each validator's output (stdout or pass summary) in the creation session's tasks or summary before proceeding to the next step. An unrecorded validation counts as not performed.

**Step 2: Semantic routing validation**
```bash
scripts/validate-routing.mjs <skill-dir>
```
Checks: positive_triggers coverage, anti_triggers coverage, description-body alignment, single-responsibility verification.

**Step 3: Content review**
Agent assesses:
- Description specificity (imperative, intent-driven, single atomic intent)
- Instruction clarity (actionable, not vague)
- Progressive disclosure (SKILL.md <500 lines, <1500 tokens)
- Gotchas present (environment-specific facts)
- Fragility matching (strict for mutation, loose for read-only)
- Activation boundary completeness (all triggers documented)

**Step 4: Antipattern self-audit**
```bash
scripts/audit-antipatterns.mjs <skill-dir>
```
Checks: phantom tools, duplicated invariants, passive-voice triggers, prose bloat, single-file omnibus, vague success bars, multi-domain descriptions (A17), missing activation boundary (A18), hardcoded paths (A19), context budget violation (A20).

Self-correct any issues before proceeding.

### Phase 5: Evaluation (mandatory)

**Step 1-5: Eval loop** — 2-3 cases + near-miss negatives; measure baseline (no skill) then with-skill (grade PASS/FAIL, record timing); near-miss 100% for mutation.

**Step 6: Compute benchmarks**
```bash
scripts/compute-benchmark.mjs <eval-dir>
```

**Step 6b: Cold-agent behavioral proof (mandatory)**
```bash
scripts/run-cold-eval.mjs <skill-dir>
```
Runs `evals/evals.json` cold A/B (without vs with skill), computes `d = sign(with - baseline)`, `m = |with - baseline|`, emits unified envelope `{target, pass, checks, summary}` + `behavioral: {at, baseline, with_skill, d, m, ship}` (30s timeout, JSON only). Writes `evals/benchmark.json` with `stage: behavioral` block (`{at, baseline, with_skill, d, m, ship}`) replacing `pending_cold_agent_run`; record outputs in creation session. Reuses `compute-benchmark.mjs` logic; no network, deterministic.

**Step 7: Calculate quality score**
```
d = direction (+1 if with_skill > baseline, -1 if lower, 0 if equal)
m = magnitude = |with_skill_pass_rate - baseline_pass_rate|
quality_score = d × m
```
Ship gate: d must be +1 AND m must be >= 0.2 (20% improvement over baseline) — now proven by `run-cold-eval.mjs` behavioral block.

**Step 8: Iterate**
If quality insufficient:
1. Analyze failures
2. Fix instructions
3. Re-run evals
4. Repeat until plateau

### Phase 6: Optimization (mandatory)

**Step 1: Create trigger test queries**
- 10-20 queries (mix should/shouldn't trigger + near-misses)
- Include queries matching each positive_trigger
- Include queries matching each anti_trigger

**Step 2: Test description triggering**
Run each query, check if skill activates correctly.

**Step 3: Iterate on description**
If trigger rate insufficient:
1. Revise description (imperative, intent-driven)
2. Re-test
3. Repeat until acceptable

**Step 4: Iterate on anti-triggers**
If false positives occur:
1. Revise anti_triggers to cover the missed exclusion
2. Update "Do NOT use when" in description
3. Re-test

**Step 5: Final validation**
Run `scripts/validate-structure.mjs` and `scripts/validate-routing.mjs` again after changes.

### Phase 7: Ship

1. **Final structural validation — HARD GATE**: run `scripts/validate-structure.mjs` and `scripts/validate-routing.mjs`; both MUST report pass with outputs recorded. If either fails, the skill is NOT presented for approval — self-correct and re-run until both pass.
2. **Behavioral proof — HARD GATE (fail-closed)**: run `scripts/run-cold-eval.mjs <skill-dir>`; `d == +1 AND m >= 0.2` required with outputs recorded. If fails, emit `FAIL: m < 0.2 — not worth context cost` with validator + behavioral outputs, loop to Optimization (revise description/instructions) and re-run; never present for approval without behavioral pass.
3. **Portability certificate**: verify no hardcoded paths, runtime deps declared, timeout bounds set, output contract defined
4. **Present summary**: what skill does, tier achieved, eval results, trigger rate, quality score (d × m) + behavioral `d×m`
5. **Wait for user approval**
6. **Save to `./project/skills/<skill-name>/`**

## Frontmatter Schema Reference

Every generated skill MUST include these fields:

```yaml
---
name: skill-name
description: >
  Single atomic intent description.
  Use when [specific conditions].
  Do NOT use when [specific exclusions].
allowed-tools: Bash(*)
license: MIT
compatibility: Requires bun >= 1.0.
metadata:
  author: agentic
  version: "1.0"
positive_triggers:
  - "query that should activate this skill"
  - "another activating query"
  - "third activating query"
anti_triggers:
  - "similar-looking query that needs different handling"
  - "out-of-domain query sharing keywords"
runtime:
  requires:
    - bun >= 1.0
  timeout_seconds: 30
  output_format: json
---
```

## Gotchas

- **Description is king**: Specific, imperative, intent-driven — see `references/description-optimization.md`.
- **Anti-triggers +31.8% precision**: Frontmatter `anti_triggers` min 2, plus body `Anti-examples` distinct from routing.
- **Progressive disclosure**: Tier 1 <50, Tier 2 <1500, Tier 3 on-demand — see `references/component-decomposition.md`.
- **Single-responsibility**: One sentence without `and`, else split.
- **Validation + behavioral gate is fail-closed**: `validate-structure` + `validate-routing` + `run-cold-eval.mjs` (`d=+1,m≥0.2`) mandatory; `m<0.2` blocks Ship.
- **Fragility**: Mutation strict, read-only loose, creative low — see `references/fragility-matching.md`.
- **No hardcoded paths**: Relative via `import.meta.url`; no `.pi`/`.agents` in scripts.

## Examples

### Example: Create Skill from Problem Description

```bash
/skill-create csv-analyzer
# 1. Discovery: Q "analyze CSV" → positive_triggers 3, anti_triggers 2
# 2. Design: scope atomic, fragility read-only=loose (see fragility-matching.md)
# 3. Scaffold: scripts/scaffold-skill.mjs csv-analyzer
# 4. Author SKILL.md with Contrast/Anti-examples, Tiered depth
# 5. Validate routing+structure + run-cold-eval (d×m≥0.2)
# 6. Ship when both gates pass
```

## Error Handling

Validation/evals fail → auto-fix and retry; quality <0.2 → loop to Optimization; invalid name → ask for valid (lowercase, hyphens, 1-64); user rejects → discard.

## References

- [Specification](references/specification.md) — Agent Skills spec: directory structure, SKILL.md format, frontmatter, progressive disclosure
- [Content Quality](references/content-quality-criteria.md) — What makes good instructions: clarity, actionability, edge cases, examples, gotchas
- [Eval Methodology](references/eval-methodology.md) — Full eval framework: test cases, assertions, grading, benchmarks, near-miss negatives
- [Description Optimization](references/description-optimization.md) — Trigger testing: queries, train/validation split, optimization loop
- [Gotchas Patterns](references/gotchas-patterns.md) — Common pitfalls: name format, description issues, SKILL.md length, over-specification
- [Fragility Matching](references/fragility-matching.md) — Task classification: mutation=strict, read-only=loose, creative=low specificity
- [Component Decomposition](references/component-decomposition.md) — Gem-factory pattern: persona / instructions / templates / data
- [Antipatterns](references/antipatterns.md) — 16 audited failure modes: phantom tools, duplicated invariants, passive-voice triggers
