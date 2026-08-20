# ADR Template

## Frontmatter

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
stale_after: <YYYY-MM-DD>
---
```

## Body Structure

```markdown
# ADR-<number>: <title>

## Context

What is the issue that we're seeing that is motivating this decision or change?
What is the force that is pressing us to consider a change?

## Decision

What is the change that we're proposing and/or doing?
Be specific and actionable.

## Consequences

What becomes easier or more difficult because of this change?

### Positive
- [benefit 1]
- [benefit 2]

### Negative
- [tradeoff 1]
- [tradeoff 2]

## Alternatives Considered

### Option 1: [name]
- Description
- Pros
- Cons

### Option 2: [name]
- Description
- Pros
- Cons

## References

- [link to related documentation]
- [link to related ADRs]
```

## Numbering

- Sequential: ADR-001, ADR-002, ADR-003
- Zero-padded to 3 digits
- Never reuse numbers
- Filename: `ADR-<number>-<title-slug>.md`

## Related ADRs

- `supersedes: ADR-XXX` — This ADR replaces another
- `superseded-by: ADR-XXX` — This ADR is replaced by another
- `related-to: [ADR-XXX, ADR-YYY]` — Related but not replacing
