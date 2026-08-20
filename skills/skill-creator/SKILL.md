---
name: skill-creator
description: Create new Agent Skills from problem descriptions or instruction files. Walks through discovery, design, authoring, validation, evaluation, and optimization phases. Use when the user wants to build a new skill, create a skill from a workflow, extract a reusable pattern from a task, or set up evaluation for an existing skill.
allowed-tools: Bash(*)
license: MIT
compatibility: Requires bun.
metadata:
  author: agentic
  version: "1.1"
---

# Skill Creator

Create new Agent Skills from problem descriptions or instruction files. Fully autonomous workflow.

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
| **Rigorous** | Standard + full eval + description optimization | High-stakes workflows, shared skills |

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

### Phase 2: Design

Determine:

1. **Scope**: Coherent unit of work. Not too broad, not too narrow.
2. **Fragility**: Mutation = strict, read-only = loose, creative = low specificity.
3. **Progressive disclosure**: SKILL.md vs references/
4. **Components**: Persona / instructions / templates / data (not omnibus)
5. **Scripts**: Reusable logic to bundle (.mjs, cold/isolated)
6. **Eval strategy**: Test cases, assertions, near-miss negatives

### Phase 3: Authoring

1. **Scaffold**: `scripts/scaffold-skill.mjs <name>` → creates directory + SKILL.md skeleton
2. **Frontmatter**: name, description (imperative, specific, "Use when...")
3. **SKILL.md body**: Core instructions (<500 lines)
4. **Scripts**: Generate if clearly reusable (.mjs, self-contained)
5. **References**: Domain-specific docs, loaded on-demand
6. **Templates**: Output shapes, examples
7. **Single source**: Define each rule ONCE, reference everywhere else

### Phase 4: Validation (mandatory)

**Step 1: Structural validation**
```bash
scripts/validate-structure.mjs <skill-dir>
```
Checks: name format, description format, directory structure, file references.

**Step 2: Content review**
Agent assesses:
- Description specificity (imperative, intent-driven)
- Instruction clarity (actionable, not vague)
- Progressive disclosure (SKILL.md <500 lines)
- Gotchas present (environment-specific facts)
- Fragility matching (strict for mutation, loose for read-only)

**Step 3: Antipattern self-audit**
```bash
scripts/audit-antipatterns.mjs <skill-dir>
```
Checks: phantom tools, duplicated invariants, passive-voice triggers, prose bloat, single-file omnibus, vague success bars.

Self-correct any issues before proceeding.

### Phase 5: Evaluation (mandatory)

**Step 1: Create test cases**
- 2-3 test cases minimum
- Varied phrasing (formal, casual, terse)
- Edge cases, realistic context

**Step 2: Create near-miss negatives**
- Prompts that look similar but should NOT trigger
- Critical for catching over-firing

**Step 3: Run eval loop**
For each test case:
1. Run skill against prompt
2. Capture output
3. Grade assertions (PASS/FAIL with evidence)
4. Record timing

**Step 4: Near-miss grading**
Assert skill did NOT trigger on near-misses. Pass rate must be 100% for mutation tools.

**Step 5: Compute benchmarks**
```bash
scripts/compute-benchmark.mjs <eval-dir>
```

**Step 6: Iterate**
If quality insufficient:
1. Analyze failures
2. Fix instructions
3. Re-run evals
4. Repeat until plateau

### Phase 6: Optimization (mandatory)

**Step 1: Create trigger test queries**
- 10-20 queries (mix should/shouldn't trigger + near-misses)

**Step 2: Test description triggering**
Run each query, check if skill activates correctly.

**Step 3: Iterate on description**
If trigger rate insufficient:
1. Revise description (imperative, intent-driven)
2. Re-test
3. Repeat until acceptable

**Step 4: Final validation**
Run `scripts/validate-structure.mjs` again after changes.

### Phase 7: Ship

1. **Final structural validation**
2. **Present summary**: what skill does, tier achieved, eval results, trigger rate
3. **Wait for user approval**
4. **Save to `./project/skills/<skill-name>/`**

## Gotchas

- **Description is king**: Only thing agents see before loading. Make it specific, imperative, intent-driven.
- **Progressive disclosure**: Keep SKILL.md under 500 lines. Move details to references/.
- **Start from real expertise**: Extract from working conversations, don't generate from nothing.
- **Validation non-negotiable**: Always run structural validation. Always review content. Always audit antipatterns.
- **Near-miss negatives are critical**: Without them, over-firing passes silently.
- **Match fragility**: Mutation = strict. Read-only = loose. Creative = low specificity.
- **Single source**: Define each rule ONCE. Never copy-paste across files.
- **Component decomposition**: Persona / instructions / templates / data. Never omnibus.
- **Auto-fix and retry**: Most failures are fixable. Don't stop on first error.
- **.mjs for scripts**: ES modules, cold/isolated, standalone execution.

## Examples

### Example 1: Create Skill from Problem Description

```bash
/skill-create csv-analyzer
```

1. System asks discovery questions
2. User provides: "Analyze CSV files, compute statistics, generate charts"
3. System designs: scope, fragility (read-only = loose), components
4. System scaffolds: `./project/skills/csv-analyzer/`
5. System writes SKILL.md with instructions
6. System validates structure and antipatterns
7. System runs evals (2-3 test cases)
8. System presents summary for approval
9. Skill saved to `./project/skills/csv-analyzer/`
```

### Example 2: Create Skill from Instruction File

```bash
/skill-create database-schema
```

1. System reads `./skills-todo/database-schema.md`
2. System skips Phase 1 (Discovery) — instructions have answers
3. System starts at Phase 2 (Design) with provided decisions
4. System follows standard workflow from there
```

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
```

## Error Handling

| Error | Action |
|-------|--------|
| Invalid skill name | Ask for valid name (lowercase, hyphens, 1-64 chars) |
| Instruction file missing | Ask for problem description (Phase 1) |
| Validation fails | Auto-fix and retry |
| Antipattern detected | Auto-fix and re-audit |
| Evals fail | Analyze failures, fix instructions, re-run |
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
