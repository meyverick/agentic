---
name: okf-docs
description: Generate OKF v0.2 compliant documentation for projects, ADRs, and knowledge bundles. Use when creating documentation with proper frontmatter, index files, or OKF validation.
version: "1.0.0"
license: MIT
metadata:
  author: agentic
---

# OKF Docs

Generate OKF v0.2 compliant documentation.

## Quick Start

When you need to create OKF-compliant documentation:

1. Determine the concept type (ADR, Skill, Metric, Playbook, etc.)
2. Generate frontmatter with required fields
3. Write body content
4. Validate OKF compliance

## Workflow

### Step 1: Determine Concept Type

Choose the appropriate type for your documentation:

| Type | Use Case |
|------|----------|
| Architecture Decision Record | Architectural decisions |
| Skill | Agent capabilities |
| Metric | Measurements and KPIs |
| Playbook | Procedures and workflows |
| Reference | Technical documentation |
| BigQuery Table | Data tables |
| API Endpoint | API documentation |

### Step 2: Generate Frontmatter

Minimum required fields:

```yaml
---
type: <Type name>
title: <display name>
description: <one-line summary>
generated: { by: <producer>/<version>, at: <ISO 8601> }
status: stable
---
```

Full frontmatter with all fields:

```yaml
---
type: <Type name>
title: <display name>
description: <one-line summary>
resource: <optional URI>
tags: [<tag>, <tag>]
generated: { by: <producer>/<version>, at: <ISO 8601> }
verified: { by: human:<id>, at: <ISO 8601> }
sources:
  - { id: <source-id>, resource: <url|path> }
status: stable
stale_after: <YYYY-MM-DD>
---
```

### Step 3: Write Body Content

Use structural markdown:
- `# Schema` for structured descriptions
- `# Examples` for concrete usage
- `# Computation` for attested computations

Per-claim attribution via footnotes:

```markdown
The events table is sharded daily.[^ga4-schema]

[^ga4-schema]: GA4 BigQuery Export schema
```

### Step 4: Generate index.md

For directories with multiple concepts:

```markdown
# Section / Group Heading

* [Title 1](relative-url-1) - short description
* [Title 2](relative-url-2) - short description
```

### Step 5: Validate OKF Compliance

Check:
- [ ] `type` field present and non-empty
- [ ] `generated.by` uses actor convention
- [ ] `generated.at` is ISO 8601
- [ ] `sources[].resource` present if sources exist
- [ ] `status` is draft|stable|deprecated
- [ ] `stale_after` is YYYY-MM-DD format

## Actor Convention

| Actor Type | Format | Example |
|------------|--------|---------|
| Agent | `<producer>/<version>` | `skill-creator/1.0` |
| Person | `human:<id>` | `human:developer` |
| Process | `process:<id>` | `process:ci-pipeline` |

## Gotchas

- `type` is REQUIRED — concept without type is invalid
- `generated.by` MUST use actor convention (not free text)
- `sources[].resource` is REQUIRED within sources entries
- `verified[]` is independent of `generated.at`
- `status` defaults to `stable` if omitted
- Footnotes use `[^source-id]` format, not `[#ref]`

## Reference Files

- `references/okf-specification.md` — Full OKF v0.2 spec
- `references/actor-convention.md` — Actor format examples
- `references/concept-types.md` — Type field values
