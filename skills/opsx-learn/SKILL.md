---
name: opsx-learn
description: Analyze reports from `opsx-report` to generate OpenSpec proposals for skill/prompt improvements. Use when analyzing reports to plan skill creation, improvements, or prompt updates.
allowed-tools: Bash(openspec:*)
license: MIT
compatibility: Requires openspec CLI and bun.
version: "1.0.0"
metadata:
  author: agentic
---

# Opsx Learn

Analyze reports and generate OpenSpec proposals for improvements. Batch-capable workflow: analyze → determine tools → generate proposals.

## Quick Start

When invoked from `/opsx-learn`:

- **With argument**: Process single report: `./openspec/reports/<name>/`
- **Without argument**: Process ALL reports: `./openspec/reports/*/` (excluding `archives/`)

## Workflow

### Phase 1: Report Scanning

If no argument provided, scan `./openspec/reports/` for all reports (excluding `archives/`):

```bash
ls ./openspec/reports/ | grep -v archives
```

Process each report sequentially.

### Phase 2: Report Analysis

For each report, read and parse:

**From report.md:**
1. **OKF frontmatter**: Metadata (type, title, tags, generated, sources)
2. **Problem Statement**: Why does the tool exist?
3. **Approach**: How does it work? What decisions were made?
4. **Specs**: What requirements define the tool?
5. **Implementation**: What was built? What files exist?
6. **Validation**: What passed? What failed?
7. **Trade-offs**: What was sacrificed?
8. **Follow-ups**: What was deferred?

**From assessment.md (if exists):**
- **Knowledge gaps**: What was lacking?
- **What could have helped**: Reference materials needed
- **Difficulty ratings**: What was hard?
- **Tool improvements**: What tools need improvement

### Phase 3: Tool Type Determination

Based on analysis, determine what tool to create:

| Report Content | Tool Type | Action |
|----------------|-----------|--------|
| New skill files in artifacts/ | New skill | Create proposal for new skill |
| Existing skill improvement | Skill update | Create proposal for skill update |
| New prompt files in artifacts/ | New prompt | Create proposal for new prompt |
| Both skill and prompt | Combo | Create proposal for both |
| Knowledge gaps in assessment | Reference/docs | Create proposal for reference materials |
| Generic workflow improvement | Prompt | Create proposal for new prompt |

**Detection signals:**
- `tags` in frontmatter → skill/prompt name
- `capability-path` in tags → skill identifier
- `artifacts/` directory contents → skill/prompt files
- Assessment suggestions → improvement type

### Phase 4: Conflict Resolution

If multiple reports affect the same tool:

1. **Merge improvements**: Combine suggestions from all reports
2. **Deduplicate**: Remove redundant improvements
3. **Prioritize**: Order by impact (from assessment difficulty ratings)
4. **Single proposal**: Generate one proposal per tool, not one per report

### Phase 5: OpenSpec Proposal Generation

For each determined tool, generate an OpenSpec proposal:

**Step 1: Create change**
```bash
openspec new change "<proposal-name>"
```

**Note**: This generates a proposal only. User runs `/opsx-apply` to implement. The proposal instructs the AI agent to invoke skill-creator.

**Step 2: Generate proposal.md**
- What to build (from report analysis)
- Why to build it (from report problem statement + assessment gaps)
- Scope and constraints

**Step 3: Generate specs/**
- Requirements from report specs
- Additional requirements from assessment gaps
- Scenarios for each requirement

**Step 4: Generate design.md**
- Technical approach (from report approach + decisions)
- Architecture decisions with rationale
- Trade-offs and risks

**Step 5: Generate tasks.md**
- Implementation steps (from report tasks)
- Additional steps from assessment suggestions
- Estimated complexity

### Phase 6: Archive Processed Reports

After processing, move reports to `./openspec/reports/archives/`:

```bash
mkdir -p ./openspec/reports/archives
mv ./openspec/reports/<name> ./openspec/reports/archives/
```

### Phase 7: Display Summary

After processing all reports:

```markdown
## Reports Processed

**Reports analyzed:** <count>
**Proposals generated:** <count>
**Reports archived:** <count>

**Proposals:**
- <proposal-1>: <tool-type> — <brief-description>
- <proposal-2>: <tool-type> — <brief-description>
- ...

**Next step:** Review proposals with `/opsx-explore <proposal-name>` or implement with `/opsx-apply <proposal-name>`.
```

## Tool Type Detection

### From Report Metadata
- `tags` field → skill/prompt name
- `capability-path` → skill identifier
- `type` field → report category

### From Artifacts
- `skills/` directory → skill
- `prompts/` directory → prompt
- Both → combo
- `references/` → reference materials

### From Assessment
- Knowledge gaps → reference materials needed
- Tool improvements → skill/prompt updates
- Documentation gaps → new documentation

## Conflict Handling

When multiple reports affect same tool:

1. **Collect all improvements** from each report
2. **Merge into single proposal** with combined requirements
3. **Deduplicate** redundant improvements
4. **Prioritize** by assessment difficulty ratings
5. **Note provenance** which report contributed which improvement

## Examples

### Example 1: Single Report Processing

```bash
/opsx-learn add-central-datastore
```

1. System finds report at `./openspec/reports/add-central-datastore/`
2. Analyzes report.md and assessment.md
3. Determines: database-schema skill needs improvement
4. Generates proposal at `./openspec/changes/add-database-schema-improvements/`
5. Moves report to `./openspec/reports/archives/`
6. User reviews proposal with `/opsx-explore` or implements with `/opsx-apply`
```

### Example 2: Batch Processing

```bash
/opsx-learn
```

1. System scans `./openspec/reports/` for all reports (excluding archives)
2. Processes each report sequentially
3. Merges improvements for same tool
4. Generates separate proposals for different tools
5. Moves all processed reports to archives
```

### Example 3: Conflict Resolution

```
Report A: "Improved csv-analyzer with better parsing"
Report B: "Fixed csv-analyzer edge cases"

System detects: Both affect csv-analyzer
System action: Merges into single proposal
Result: One proposal with combined improvements
```

## Error Handling

| Error | Action |
|-------|--------|
| No reports found | Display message, suggest `/opsx-report` |
| Report missing assessment.md | Process report.md only |
| Invalid proposal generation | Log error, continue with next report |
| Archive move fails | Log error, leave report in place |

## Reference Files

- `references/report-analysis.md` — How to parse reports
- `references/skill-quality.md` — Quality criteria
- `references/improvement-patterns.md` — Common improvement types
- `references/evaluation-methodology.md` — Eval framework
