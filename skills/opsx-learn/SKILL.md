---
name: opsx-learn
description: >
  Analyze reports from `opsx-report` to generate OpenSpec proposals for
  skill/prompt improvements. Use when analyzing reports to plan skill creation,
  improvements, or prompt updates. Do NOT use when generating reports from
  archived changes or implementing proposals.
allowed-tools: Bash(openspec:*), Bash(node:*), Bash(mkdir:*), Bash(ls:*)
license: MIT
compatibility: Requires openspec CLI and bun.
metadata:
  author: agentic
  version: "1.3.0"
positive_triggers:
  - "analyze reports and improve skills"
  - "generate proposals from report insights"
  - "process reports and create improvement plans"
anti_triggers:
  - "generate a report from an archived change"
  - "implement a proposal or apply changes"
runtime:
  requires:
    - openspec CLI
    - bun >= 1.0
  timeout_seconds: 30
  output_format: json
---

# Opsx Learn

Analyze reports and generate OpenSpec proposals for improvements.

## Quick Start

- **With argument**: Process single report: `./openspec/reports/<name>/`
- **Without argument**: Process ALL reports: `./openspec/reports/*/` (excluding `archives/`)

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
grep -r "description:" .pi/skills/*/SKILL.md ./project/skills/*/SKILL.md 2>/dev/null
```

Compare proposed tool's domain keywords against existing descriptions. If overlap detected → flag collision in proposal, suggest updating existing skill instead of creating new one.

### Phase 2b: Trigger Metadata Extraction

Extract trigger candidates from report assessment:
- What queries/situations led to this change? → candidate positive_triggers
- What was confusing or out-of-scope? → candidate anti_triggers

Include as "Suggested Triggers" section in proposal.

### Phase 2c: Single-Responsibility Pre-Check

For proposed updates to existing skills:
- Does the improvement align with the skill's atomic intent?
- Or does it add a new operational domain?

If scope expansion detected → propose splitting into separate skill instead of updating.

### Phase 2d: Value Justification

Estimate whether creating/updating a skill improves outcomes by >= 20%:
- Assessment difficulty >= 3/5 OR knowledge gaps identified → justified
- All difficulty <= 2/5 AND no gaps → flag as low value in proposal

### Phase 2e: Context Budget Impact

Estimate Tier 1 + Tier 2 token cost of proposed skill based on similar skills. Warn if >2000 tokens in proposal.

### Phase 3: Tool Type Determination

See [references/tool-type-detection.md](references/tool-type-detection.md) for full detection matrix.

### Phase 4: Conflict Resolution

See [references/conflict-handling.md](references/conflict-handling.md) for merging strategies.

### Phase 5: OpenSpec Proposal Generation

Generate proposal including:
- What to build + why (from report + assessment)
- Suggested Triggers section (from Phase 2b)
- Value Justification section (from Phase 2d)
- Collision warnings (from Phase 2a)
- Context budget impact (from Phase 2e)

The proposal instructs the AI agent to invoke skill-creator during `/opsx-apply`.

### Phase 6: Archive Processed Reports

```bash
mkdir -p ./openspec/reports/archives
mv ./openspec/reports/<name> ./openspec/reports/archives/
```

### Phase 7: Display Summary

Report count, proposal count, archive count, next steps.

## Gotchas

- **Collision detection prevents dilution**: Two skills with similar descriptions reduce routing confidence for both.
- **Trigger metadata saves Discovery time**: Pre-filling triggers from assessment data gives skill-creator a head start.
- **Low-value skills waste context**: If difficulty <= 2/5 and no gaps, don't create a skill — the agent handles it fine already.
- **Context budget matters**: Every skill costs tokens on every activation. Estimate before creating.
- **Single-responsibility**: If improvement adds new domain to existing skill, split instead of updating.

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
