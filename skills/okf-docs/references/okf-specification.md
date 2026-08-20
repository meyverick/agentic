# OKF v0.2 Specification (Condensed)

## Frontmatter Fields

| Field | Required | Description |
|-------|----------|-------------|
| type | Yes | Concept type (ADR, Skill, Metric, etc.) |
| title | No | Human-readable display name |
| description | No | One-line summary |
| resource | No | Canonical URI for underlying asset |
| tags | No | Categorization labels |
| generated | No | How content was produced |
| verified | No | Who confirmed content |
| sources | No | Materials concept derives from |
| status | No | draft, stable, or deprecated |
| stale_after | No | Date when content becomes stale |

## Actor Convention

- `<producer>/<version>` for agents
- `human:<id>` for people
- `process:<id>` for automation

## Trust Tiers

- No verified → unverified
- verified by non-human → machine-confirmed
- verified by human → human-reviewed

## Reserved Filenames

- `index.md` — Directory listing
- `log.md` — Update history

## Links

- Absolute: `[/path/to/concept.md]`
- Relative: `./other.md`

## Computation Fields

For Attested Computation type:
- runtime: REQUIRED
- parameters: List of typed holes
- computation: Path to computation file
- executor: How to run
- attester: Deterministic check
