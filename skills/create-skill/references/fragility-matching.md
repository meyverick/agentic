# Fragility Matching

Match instruction specificity to task fragility.

## Fragility Classification

| Class | Description | Example | Specificity |
|-------|-------------|---------|-------------|
| **Mutation** | Creates, deletes, or modifies data | Place order, delete account, update record | Strict, step-by-step, precondition gates |
| **Read-only** | Queries or analyzes data | Search database, generate report, analyze CSV | Loose triggers, latitude for formatting |
| **Creative** | Prose, design, creative output | Write summary, design layout, draft email | Low specificity, examples over rules |

## Mutation Tasks (Strict)

When skill involves creating, deleting, or modifying data:

- **Precondition gates**: Check before acting
- **Exact commands**: "Run exactly this command. Do not add flags."
- **Validation loops**: Verify before proceeding
- **Rollback paths**: What to do if something fails
- **Idempotency**: Safe to retry

Example:
```markdown
## Place Order

1. Verify inventory: `./scripts/check-inventory.sh <item-id>`
2. ONLY if in stock: `./scripts/place-order.sh <item-id> <quantity>`
3. Verify order: `./scripts/verify-order.sh <order-id>`
4. NEVER skip step 1. NEVER add flags to step 2.
```

## Read-Only Tasks (Loose)

When skill involves querying or analyzing data:

- **Flexible triggers**: "When user asks about X"
- **Format latitude**: "Format as you see fit"
- **Optional steps**: "Optionally include Y"
- **Error handling**: "If query fails, report error"

Example:
```markdown
## Analyze Data

1. Load the data file
2. Compute summary statistics
3. Generate visualizations as appropriate
4. Present findings in a clear format
```

## Creative Tasks (Low Specificity)

When skill involves prose, design, or creative output:

- **Style guidelines**: "Follow the style guide"
- **Examples**: Show BAD/GOOD pairs
- **Constraints**: "Don't include X"
- **Latitude**: Let agent decide approach

Example:
```markdown
## Write Summary

- One paragraph overview
- Include key findings
- Use clear, concise language
- See references/style-guide.md for tone
```

## Fragility Matrix

```
   mutation (create/delete/modify)  ─▶ strict preconditions, gating, deterrents
   read-only (query/analyze)        ─▶ loose triggers, free text
   creative (prose/design)          ─▶ low specificity, examples

   ⚠️ Same skill should never treat a buy-button with the looseness of a weather check
```

## Decision Guide

Ask:
1. Does this skill change state? → Mutation → Strict
2. Does this skill only read state? → Read-only → Loose
3. Does this skill produce creative output? → Creative → Low specificity

When uncertain, default to stricter. Can always loosen later.
