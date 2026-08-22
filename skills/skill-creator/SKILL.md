---
name: skill-creator
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

# Skill Creator

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
2. **Fragility**: Mutation = strict, read-only = loose, creative = low specificity.
3. **Progressive disclosure**: SKILL.md vs references/ with context budget per tier:
   - Tier 1 (frontmatter): <50 tokens
   - Tier 2 (SKILL.md body): <1500 tokens
   - Tier 3 (references/): on-demand only
4. **Components**: Persona / instructions / templates / data (not omnibus)
5. **Scripts**: Reusable logic to bundle (.mjs, cold/isolated, relative paths only)
6. **Eval strategy**: Test cases, assertions, near-miss negatives, baseline comparison
7. **Activation boundary**: Define what triggers and what does NOT trigger
8. **Runtime contract**: Required runtimes (bun/node/python), timeout_seconds, output_format (json)
9. **Output contract**: JSON schema for success and error responses

### Phase 3: Authoring

1. **Scaffold**: `scripts/scaffold-skill.mjs <name>` → creates directory + SKILL.md skeleton
2. **Frontmatter**: name, description (imperative, specific, "Use when... Do NOT use when..."), positive_triggers (min 3), anti_triggers (min 2), allowed-tools, compatibility, runtime
3. **SKILL.md body sections** (in order):
   - Activation Boundary: explicit trigger/exclusion lists
   - Pre-Flight Checks: environment probes before execution
   - Output Contract: JSON schema for success/error
   - Core instructions (<500 lines, <1500 tokens)
4. **Scripts**: Generate if clearly reusable (.mjs, self-contained, relative paths via import.meta.url, JSON output only)
5. **References**: Domain-specific docs, loaded on-demand
6. **Templates**: Output shapes, examples
7. **Single source**: Define each rule ONCE, reference everywhere else
8. **Portability**: No absolute paths (/home/, /root/, C:\), no harness-specific dirs (.pi/, .agents/) in executable code

### Phase 4: Validation (mandatory)

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

**Step 1: Create test cases**
- 2-3 test cases minimum
- Varied phrasing (formal, casual, terse)
- Edge cases, realistic context

**Step 2: Create near-miss negatives**
- Prompts that look similar but should NOT trigger
- Critical for catching over-firing

**Step 3: Measure baseline (no skill)**
Run all test cases WITHOUT the skill loaded. Record baseline_pass_rate.
This is required for quality score calculation.

**Step 4: Run eval loop WITH skill**
For each test case:
1. Run skill against prompt
2. Capture output
3. Grade assertions (PASS/FAIL with evidence)
4. Record timing

**Step 5: Near-miss grading**
Assert skill did NOT trigger on near-misses. Pass rate must be 100% for mutation tools.

**Step 6: Compute benchmarks**
```bash
scripts/compute-benchmark.mjs <eval-dir>
```

**Step 7: Calculate quality score**
```
d = direction (+1 if with_skill > baseline, -1 if lower, 0 if equal)
m = magnitude = |with_skill_pass_rate - baseline_pass_rate|
quality_score = d × m
```
Ship gate: d must be +1 AND m must be >= 0.2 (20% improvement over baseline).

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
2. **Portability certificate**: verify no hardcoded paths, runtime deps declared, timeout bounds set, output contract defined
3. **Present summary**: what skill does, tier achieved, eval results, trigger rate, quality score (d × m)
4. **Wait for user approval**
5. **Save to `./project/skills/<skill-name>/`**

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

- **Description is king**: Only thing agents see before loading. Make it specific, imperative, intent-driven.
- **Anti-triggers boost precision by 31.8%**: Without them, similar-domain queries falsely activate your skill.
- **Frontmatter-only indexing loses 29-44% recall**: Ensure description keywords appear in SKILL.md body.
- **Progressive disclosure budgets**: Tier 1 <50 tokens, Tier 2 <1500 tokens, Tier 3 on-demand. Exceeding budgets degrades attention.
- **Single-responsibility is measurable**: If you can't describe the skill in one sentence without "and", split it.
- **Start from real expertise**: Extract from working conversations, don't generate from nothing.
- **Validation non-negotiable**: Always run structural validation, routing validation, content review, and antipattern audit.
- **Near-miss negatives are critical**: Without them, over-firing passes silently.
- **Match fragility**: Mutation = strict. Read-only = loose. Creative = low specificity.
- **Single source**: Define each rule ONCE. Never copy-paste across files.
- **Component decomposition**: Persona / instructions / templates / data. Never omnibus.
- **Auto-fix and retry**: Most failures are fixable. Don't stop on first error.
- **.mjs for scripts**: ES modules, cold/isolated, standalone execution.
- **No hardcoded paths**: Use relative paths resolved via import.meta.url. Absolute paths break portability across harnesses.
- **Pre-flight probes prevent failures**: Check runtime availability before executing scripts.
- **Structured output contracts**: Scripts MUST output valid JSON. Unstructured output can't be deterministically parsed.
- **Quality score measures real value**: A skill with 90% pass rate but 88% baseline has m=0.02 — not worth the context cost.

## Examples

### Example 1: Create Skill from Problem Description

```bash
/skill-create csv-analyzer
```

1. System asks discovery questions (including trigger questions)
2. User provides: "Analyze CSV files, compute statistics, generate charts"
3. User provides positive_triggers: "analyze CSV", "compute stats from CSV", "chart from CSV data"
4. User provides anti_triggers: "write CSV to database", "edit Excel spreadsheet"
5. System designs: scope, fragility (read-only = loose), components, activation boundary
6. System scaffolds: `./project/skills/csv-analyzer/`
7. System writes SKILL.md with instructions, activation boundary, pre-flight checks, output contract
8. System validates structure, routing, and antipatterns
9. System runs evals (baseline + with-skill, calculates quality score)
10. System presents summary for approval
11. Skill saved to `./project/skills/csv-analyzer/`

### Example 2: Create Skill from Instruction File

```bash
/skill-create database-schema
```

1. System reads `./skills-todo/database-schema.md`
2. System skips Phase 1 (Discovery) — instructions have answers
3. System starts at Phase 2 (Design) with provided decisions
4. System follows standard workflow from there

### Example 3: Create Minimal Skill (Quick Prototyping)

```bash
/skill-create quick-helper
```

1. User requests Minimal tier
2. System scaffolds directory
3. System writes minimal SKILL.md
4. System validates structure
5. System presents summary
6. Skill saved (no evals, no optimization)

## Error Handling

| Error | Action |
|-------|--------|
| Invalid skill name | Ask for valid name (lowercase, hyphens, 1-64 chars) |
| Instruction file missing | Ask for problem description (Phase 1) |
| Validation fails | Auto-fix and retry |
| Routing validation fails | Revise triggers/description, re-validate |
| Portability check fails | Fix hardcoded paths, re-check |
| Antipattern detected | Auto-fix and re-audit |
| Evals fail | Analyze failures, fix instructions, re-run |
| Quality score below threshold | Improve skill or increase baseline gap |
| User rejects | Discard skill, start over if requested |

## References

- [Specification](references/specification.md) — Agent Skills spec: directory structure, SKILL.md format, frontmatter, progressive disclosure
- [Content Quality](references/content-quality-criteria.md) — What makes good instructions: clarity, actionability, edge cases, examples, gotchas
- [Eval Methodology](references/eval-methodology.md) — Full eval framework: test cases, assertions, grading, benchmarks, near-miss negatives
- [Description Optimization](references/description-optimization.md) — Trigger testing: queries, train/validation split, optimization loop
- [Gotchas Patterns](references/gotchas-patterns.md) — Common pitfalls: name format, description issues, SKILL.md length, over-specification
- [Fragility Matching](references/fragility-matching.md) — Task classification: mutation=strict, read-only=loose, creative=low specificity
- [Component Decomposition](references/component-decomposition.md) — Gem-factory pattern: persona / instructions / templates / data
- [Antipatterns](references/antipatterns.md) — 16 audited failure modes: phantom tools, duplicated invariants, passive-voice triggers
