# Actor Convention

Fields that record identity (`generated.by`, `verified[].by`) use actor convention.

## Format

| Type | Format | Example |
|------|--------|---------|
| Agent/Tool | `<producer>/<version>` | `skill-creator/1.0` |
| Person | `human:<id>` | `human:developer` |
| Process | `process:<id>` | `process:ci-pipeline` |

## Examples

```yaml
# Agent-generated
generated: { by: skill-creator/1.0, at: 2026-08-20T00:00:00Z }

# Human-verified
verified: { by: human:developer, at: 2026-08-20T12:00:00Z }

# Process-verified
verified: { by: process:nightly-build, at: 2026-08-20T02:00:00Z }

# Multiple verifiers
verified:
  - { by: human:developer, at: 2026-08-20T12:00:00Z }
  - { by: process:security-scan, at: 2026-08-20T12:05:00Z }
```

## Rules

- `human:` prefix required for hand-authored or human-confirmed content
- Consumers classify trust based on `human:` prefix
- Multiple verifiers capture independent checks
