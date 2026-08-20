# opsx-learn Technical Documentation

## Overview

opsx-learn analyzes reports from `opsx-report` and generates OpenSpec proposals for skill/prompt improvements.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    opsx-learn ARCHITECTURE                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  INPUT: ./openspec/reports/<name>/                              │
│  ═══════════════════════════════════                            │
│  ├── report.md (self-reflection)                                │
│  └── assessment.md (meditation)                                 │
│                                                                 │
│  PROCESS:                                                       │
│  ════════                                                       │
│  1. Analyze report content                                      │
│  2. Determine tool type (skill/prompt/combo)                    │
│  3. Check for conflicts (multiple reports, same tool)           │
│  4. Generate OpenSpec proposal                                  │
│                                                                 │
│  OUTPUT: ./openspec/changes/<proposal-name>/                    │
│  ════════════════════════════════════════════                    │
│  ├── proposal.md                                                │
│  ├── specs/                                                     │
│  ├── design.md                                                  │
│  └── tasks.md                                                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Key Concepts

### Report Analysis

The skill reads:
- **report.md**: What happened, what was learned, what would be done differently
- **assessment.md**: How it felt, what was lacking, what would help next time

### Tool Type Detection

| Report Content | Tool Type | Action |
|----------------|-----------|--------|
| New skill files | New skill | Create proposal |
| Existing skill improvement | Skill update | Create proposal |
| New prompt files | New prompt | Create proposal |
| Both skill and prompt | Combo | Create proposal |
| Knowledge gaps | Reference docs | Create proposal |

### Conflict Resolution

When multiple reports affect the same tool:
1. Merge improvements
2. Deduplicate
3. Prioritize by impact
4. Generate single proposal

## API Reference

### Commands

| Command | Description |
|---------|-------------|
| `/opsx-learn` | Process all reports |
| `/opsx-learn <name>` | Process single report |

### Output

Proposals are generated at `./openspec/changes/<proposal-name>/` with:
- `proposal.md`: What to build and why
- `specs/`: Requirements and scenarios
- `design.md`: Technical approach and decisions
- `tasks.md`: Implementation steps
