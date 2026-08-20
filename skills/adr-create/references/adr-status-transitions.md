# ADR Status Transitions

## State Machine

```
                    ┌──────────┐
                    │ proposed │
                    └────┬─────┘
                         │
            ┌────────────┼────────────┐
            ▼            ▼            ▼
       ┌─────────┐ ┌──────────┐ ┌──────────┐
       │rejected │ │ accepted │ │deprecated│
       └─────────┘ └────┬─────┘ └──────────┘
                         │
                    ┌────┴─────┐
                    │superseded│
                    └──────────┘
```

## Valid Transitions

| From | To | Trigger |
|------|----|---------|
| proposed | accepted | Decision approved |
| proposed | rejected | Decision not approved |
| proposed | deprecated | No longer relevant |
| accepted | superseded | Replaced by newer ADR |
| accepted | deprecated | No longer relevant |

## Invalid Transitions

| From | To | Why Invalid |
|------|----|-------------|
| rejected | accepted | Cannot un-reject |
| deprecated | accepted | Cannot un-deprecate |
| superseded | accepted | Cannot un-supersede |

## Status Meanings

| Status | Definition |
|--------|------------|
| proposed | Under discussion. Not yet decided. |
| accepted | Approved and active. Current guidance. |
| rejected | Considered but not approved. |
| superseded | Replaced by a newer ADR. Look at replacement. |
| deprecated | No longer relevant. Kept for historical reference. |

## When to Use Each

- **proposed**: Initial state for new ADRs
- **accepted**: After decision is approved by team
- **rejected**: After discussion, decision not to proceed
- **superseded**: When a newer ADR replaces this one
- **deprecated**: When the context changes and ADR no longer applies
