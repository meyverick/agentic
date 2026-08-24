---
okf_version: "0.2"
type: Reference
title: OKF v0.2 Contract
description: Distilled Open Knowledge Format v0.2 requirements — frontmatter schema, actor convention, trust lifecycle, separation rules, syntax conventions.
generated: { by: ox-alpha/1.0, at: 2026-08-23T12:00:00Z }
sources:
  - { id: mini, resource: prototype/documentation-okf/AGENTS.md }
  - { id: spec, resource: references/okf/SPEC.md }
status: stable
---

# OKF v0.2 Contract

## Frontmatter Schema

| Field | Required | Constraint |
|---|---|---|
| `okf_version` | yes | `"0.2"` |
| `type` | yes | Document kind (ADR · Module Documentation · SystemDirective · Skill · Report · Assessment) |
| `title` | yes | Short name |
| `description` | yes | One-line summary |
| `generated` | yes | `{ by: <actor>, at: <ISO 8601> }` — replaces deprecated `timestamp` |
| `sources` | recommended | List of `{ id, resource: <url\|path> }` — body claims cite via `[^source-id]` footnotes; replaces deprecated `# Citations` heading |
| `verified` | optional | `{ by: human:<id>, at }` — human-reviewed tier |
| `status` | recommended | `draft` \| `stable` \| `deprecated` |
| `stale_after` | optional | `YYYY-MM-DD` — re-verify date for time-sensitive content |

## Actor Convention

`generated.by` / `verified.by` values:
- `<producer>/<version>` — agents (e.g. `ox-alpha/1.0`, `opsx-report/1.0`)
- `human:<id>` — people (only prefix granting human-reviewed tier)
- `process:<id>` — automation

## Trust & Lifecycle

Created as `draft`. Human review flips to `stable` and records `verified`. Superseded content → `deprecated` (state successor). Time-sensitive docs carry `stale_after`; past that date, re-verify before trusting.

## Separation Rules

- **README**: promotional showcase for everyday users. Zero technical detail. Zero terminal blocks.
- **Wiki** (`<module>/wiki/`): technical documentation per module. Synced remotely only if public.
- **AGENTS.md**: agent operational directives — never duplicated into human docs.

## Syntax Conventions

Codebase patterns via `[✅ GOOD]` vs `[❌ BAD]` code blocks. No verbose prose explanations.

## Progressive Disclosure

`index.md` at directory roots synthesizes catalogs. Absolute markdown links (`[/backend/schema.md]`). Heavy reference data offloaded to `references/`, loaded on demand.

## Reference Ingestion [CRITICAL]

`./references/` present → scan + index via QMD → treat as READ-ONLY. Maintenance after doc mutations: `qmd update && qmd embed --chunk-strategy auto`.
