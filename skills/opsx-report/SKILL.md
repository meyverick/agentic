---
name: opsx-report
description: >
  Generate self-reflection (meditation) on an archived OpenSpec change.
  Use when the user wants to create a report from an archived change,
  document lessons learned, or capture AI agent self-assessment.
  Do NOT use when implementing changes, creating proposals, or analyzing reports for skill improvements.
allowed-tools: Bash(openspec:*), Bash(ls:*), Bash(mkdir:*), Bash(mv:*)
license: MIT
compatibility: Requires openspec CLI.
metadata:
  author: agentic
  version: "1.0.1"
positive_triggers:
  - "generate a report from an archived change"
  - "document what was learned from this change"
  - "create self-reflection on completed work"
anti_triggers:
  - "implement a proposal or apply changes"
  - "analyze reports to improve skills"
---

# Opsx Report

Generate self-reflection (meditation) on archived OpenSpec changes.

## Workflow

### Phase 1: Find Archive

Archives have date prefixes. Search intelligently:

**Exact match first:**
```bash
ls openspec/changes/archive/<name>/ 2>/dev/null
```

**Fuzzy search if not found:**
```bash
ls openspec/changes/archive/ | grep -i "<name>"
```

Handle results:
- One match → use it
- Multiple matches → ask user to select
- No matches → error with available archives

### Phase 2: Read Archive

Read `.openspec.yaml` for metadata, then all planning artifacts: proposal.md, design.md, specs/, tasks.md.

### Phase 3: Create Report Directory

Create `openspec/reports/<name>/` (just report.md and assessment.md — no subdirectories).

### Phase 4: Generate report.md

Use template at `assets/templates/report.md.template`. Fill placeholders with self-reflection content.

**Meditation sections:**
- What Happened
- What I Learned
- What I'd Do Differently
- Key Decisions (table)
- Trade-offs Made (table)
- Follow-ups
- Archive Reference

### Phase 5: Generate assessment.md

Use template at `assets/templates/assessment.md.template`. Fill with experiential reflection.

**Assessment sections:**
- How It Felt (What Went Well / What Went Poorly)
- Difficulty Ratings (5 dimensions)
- What I Was Lacking (knowledge gaps, skills gaps)
- What Would Help Next Time (process, tools, documentation)

### Phase 6: Validate

Check report has all meditation sections and assessment has minimum quality bar.

### Phase 7: Display Summary

Report location, archive reference, files generated.

## Gotchas

- **Archive is source of truth**: Reference it, don't copy content into reports.
- **Reports are meditation**: Self-reflection on experience, not documentation of what happened.
- **Minimum quality bar**: At least 2 items per reflection section, at least 1 knowledge gap identified.
- **Latest version only**: If no name specified, use most recent archive.
