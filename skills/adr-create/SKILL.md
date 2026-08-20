---
name: adr-create
description: Create Architecture Decision Records (ADRs) following OKF v0.2 format. Use when recording architectural decisions, creating decision logs, or documenting design choices.
version: "1.0.0"
license: MIT
metadata:
  author: agentic
---

# ADR Create

Create Architecture Decision Records following OKF v0.2.

## Quick Start

When you need to record an architectural decision:

1. Determine ADR number (sequential)
2. Generate OKF frontmatter
3. Write standard ADR sections
4. Save as `ADR-<number>-<title>.md`

## Workflow

### Step 1: Determine ADR Number

Scan existing ADRs to find next number:

```bash
ls ADR-*.md 2>/dev/null | sort | tail -1
```

Next number = last number + 1 (or 001 if none exist).

### Step 2: Generate Frontmatter

```yaml
---
type: Architecture Decision Record
title: <short title>
description: <one-line summary>
generated: { by: <producer>/<version>, at: <ISO 8601> }
verified: { by: human:<id>, at: <ISO 8601> }
sources:
  - { id: <source-id>, resource: <url|path> }
status: proposed
---
```

### Step 3: Write ADR Sections

```markdown
# ADR-<number>: <title>

## Context

What is the issue that we're seeing that is motivating this decision?

## Decision

What is the change that we're proposing and/or doing?

## Consequences

What becomes easier or more difficult because of this change?

## Alternatives Considered

What other options were evaluated?
```

### Step 4: Save ADR

Filename: `ADR-<number>-<title-slug>.md`

Example: `ADR-001-use-sveltekit.md`

### Step 5: Update Related ADRs

If this ADR supersedes or relates to others:
- Add `supersedes: ADR-XXX` to frontmatter
- Update related ADRs status to `superseded`

## Status Transitions

```
proposed → accepted → superseded → deprecated
    ↓          ↓
 rejected   deprecated
```

| Status | Meaning |
|--------|---------|
| proposed | Under discussion |
| accepted | Approved and active |
| superseded | Replaced by newer ADR |
| deprecated | No longer relevant |
| rejected | Not approved |

## Gotchas

- ADR number is in filename, not frontmatter
- `status: proposed` is initial state
- `sources[]` should reference related documents
- `verified[]` tracks who approved the decision
- Use `supersedes` field to link to replaced ADRs

## Example

```markdown
---
type: Architecture Decision Record
title: Use SvelteKit for web tier
description: Choose SvelteKit as the web framework for developer velocity
generated: { by: skill-creator/1.0, at: 2026-08-20T00:00:00Z }
verified: { by: human:developer, at: 2026-08-20T12:00:00Z }
status: accepted
---

# ADR-001: Use SvelteKit for web tier

## Context

Need a web framework for full-stack applications with good DX and performance.

## Decision

Use SvelteKit with svelte-adapter-bun for the web tier.

## Consequences

- Full-stack type safety
- Good developer experience
- Bun runtime for performance
- Smaller ecosystem than Next.js

## Alternatives Considered

- Next.js: Larger ecosystem but heavier
- Remix: Good DX but less mature
```

## Reference Files

- `references/adr-template.md` — Full ADR template
- `references/adr-status-transitions.md` — Status flow details
