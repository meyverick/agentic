# Skill Quality Criteria

Quality metrics and thresholds for skill evaluation.

## Quality Dimensions

### 1. Structural Quality

- **SKILL.md exists**: Required
- **Frontmatter valid**: name, description present
- **Name format**: lowercase, hyphens, 1-64 chars
- **Description format**: 1-1024 chars, imperative
- **Directory structure**: scripts/, references/, assets/ present
- **File references resolve**: All markdown links valid

### 2. Content Quality

- **Description specificity**: Imperative, intent-driven, not vague
- **Instruction clarity**: Actionable, not ambiguous
- **Progressive disclosure**: SKILL.md < 500 lines
- **Gotchas present**: Environment-specific facts documented
- **Examples provided**: BAD/GOOD pairs where helpful

### 3. Fragility Matching

- **Mutation tasks**: Strict preconditions, gating
- **Read-only tasks**: Loose triggers, latitude
- **Creative tasks**: Low specificity, examples

### 4. Antipattern Compliance

No violations of:
- A1: Phantom tool references
- A2: Duplicated invariants
- A3: Passive-voice triggers
- A4: Copy-pasted cheat-sheets
- A5: Prose bloat in triggers
- A14: Single file omnibus
- A15: Vague success bars

### 5. Trigger Accuracy

- **Description triggers on relevant prompts**: >80% pass rate
- **Description doesn't trigger on irrelevant prompts**: >90% pass rate
- **Near-miss negatives pass**: 100% for mutation tools

## Quality Score

Calculate quality score (0-100):

```
Structural: 30 points
- Valid frontmatter: 10
- Valid name: 5
- Valid description: 5
- Directory structure: 5
- File references: 5

Content: 30 points
- Description specificity: 10
- Instruction clarity: 10
- Progressive disclosure: 5
- Gotchas present: 5

Fragility: 15 points
- Correct classification: 10
- Appropriate specificity: 5

Antipatterns: 15 points
- No violations: 15
- Minor violations: 10
- Major violations: 0

Trigger: 10 points
- Positive trigger rate: 5
- Negative trigger rate: 5
```

## Thresholds

| Score | Quality Level | Action |
|-------|---------------|--------|
| 90-100 | Excellent | No improvements needed |
| 70-89 | Good | Minor improvements |
| 50-69 | Fair | Significant improvements |
| 0-49 | Poor | Major improvements or rebuild |

## Measurement

Before improvement:
1. Run validate-structure.sh → structural score
2. Run audit-antipatterns.sh → antipattern score
3. Review content → content score
4. Calculate total quality score

After improvement:
1. Re-run all checks
2. Calculate new quality score
3. Calculate delta (improvement percentage)

If delta < 0 (quality degraded) → rollback
If delta = 0 → plateau reached
If delta > 0 → improvement successful
