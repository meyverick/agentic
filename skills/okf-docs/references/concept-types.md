# OKF Concept Types

The `type` field identifies the kind of concept. Values are not registered centrally — producers pick descriptive values, consumers tolerate unknown types.

## Common Types

| Type | Description | Use Case |
|------|-------------|----------|
| Architecture Decision Record | Architectural decisions | ADR-001, ADR-002 |
| Skill | Agent capabilities | Agent skills |
| Metric | Measurements and KPIs | Business metrics |
| Playbook | Procedures and workflows | Incident response |
| Reference | Technical documentation | API docs, guides |
| Attested Computation | Sanctioned computation | Revenue calculation |

## Data Types

| Type | Description |
|------|-------------|
| BigQuery Table | BigQuery tables |
| BigQuery Dataset | BigQuery datasets |
| API Endpoint | API endpoints |
| Database Table | Database tables |

## Custom Types

Producers may define custom types:

```yaml
---
type: Custom Type Name
---
```

Consumers MUST tolerate unknown types gracefully.

## Type Selection Guide

1. Is it a decision? → Architecture Decision Record
2. Is it a capability? → Skill
3. Is it a measurement? → Metric
4. Is it a procedure? → Playbook
5. Is it documentation? → Reference
6. Is it a computation? → Attested Computation
7. Is it data? → Use specific data type
8. None of the above? → Custom type
