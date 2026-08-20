# Component Decomposition

Gem-factory pattern for skill structure.

## The Problem

Single omnibus files (4000+ lines) mix persona, instructions, templates, and data. This creates:
- High churn surface (everything changes together)
- Copy-paste drift (same rule in multiple places)
- Context bloat (agent loads everything, uses little)

## The Solution

Decompose into discrete components:

| Component | Holds | File Shape | Churn Rate |
|-----------|-------|------------|------------|
| **Persona** | Identity, guiding principles | Short, stable | Low |
| **Instructions** | Workflows, decision trees | Markdown | Medium |
| **Templates** | Output shapes | Markdown with placeholders | High |
| **Data** | Factual reference, config | CSV/structured | High |

## Component Types

### Persona (Identity)

Who the skill is. Stable, rarely changes.

```markdown
# persona.md

You are a data analyst specializing in CSV processing.
Your goal is to help users understand their tabular data.
You prefer clarity over cleverness.
```

### Instructions (Workflows)

How the skill works. Changes when process changes.

```markdown
# instructions.md

## Workflow

1. Load data file
2. Validate schema
3. Compute statistics
4. Generate output
```

### Templates (Output Shapes)

What the skill produces. Changes when format changes.

```markdown
# templates/report.md

# Analysis Report

## Summary
{{summary}}

## Key Findings
{{findings}}

## Recommendations
{{recommendations}}
```

### Data (Reference Material)

Factual reference. Changes when facts change.

```csv
# data/schema.csv
column,type,required
id,integer,yes
name,string,yes
email,string,no
created_at,timestamp,yes
```

## File Structure

```
skill-name/
├── SKILL.md              # Entry point, links to components
├── persona.md            # Identity (optional, can be in SKILL.md)
├── instructions/         # Workflows
│   ├── workflow.md
│   └── decision-tree.md
├── templates/            # Output shapes
│   ├── report.md
│   └── email.md
├── data/                 # Reference material
│   ├── schema.csv
│   └── examples.json
├── scripts/              # Executable logic
│   └── process.mjs
└── references/           # Detailed docs
    └── api-reference.md
```

## Single Source Per Invariant

**Rule**: Define each rule ONCE, reference it everywhere else.

Bad:
- `workflow.md`: "User IDs are 24-char hex"
- `validation.md`: "User IDs are 24-char hex"
- `api-rules.md`: "User IDs are 24-char hex"

Good:
- `api-rules.md`: "User IDs are 24-char hex"
- `workflow.md`: "See api-rules.md for ID format"
- `validation.md`: "See api-rules.md for ID format"

## When to Decompose

Decompose when:
- File exceeds 500 lines
- Multiple concerns in one file
- Same content appears in multiple places
- Different parts change at different rates

Don't decompose when:
- Skill is simple (<100 lines total)
- All content changes together
- Decomposition adds more overhead than it saves
