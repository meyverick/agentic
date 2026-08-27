# Evaluation Methodology

How to measure quality before and after improvements.

## Before/After Measurement

### Step 1: Baseline Measurement

Before applying improvements:

1. **Structural validation**:
   ```bash
   ./.pi/skills/skill-creator/scripts/validate-structure.sh <skill-dir>
   ```
   Extract: pass/fail, errors, warnings

2. **Antipattern audit**:
   ```bash
   ./.pi/skills/skill-creator/scripts/audit-antipatterns.sh <skill-dir>
   ```
   Extract: pass/fail, violation count, violations

3. **Content review** (manual):
   - Description specificity: 0-10
   - Instruction clarity: 0-10
   - Progressive disclosure: 0-5
   - Gotchas present: 0-5

4. **Calculate baseline score**:
   ```
   Structural: 30 points (from validation)
   Content: 30 points (from review)
   Fragility: 15 points (from classification)
   Antipatterns: 15 points (from audit)
   Trigger: 10 points (from tests)
   Total: 0-100
   ```

### Step 2: Apply Improvements

Apply the determined improvements (see improvement-patterns.md).

### Step 3: Post-Improvement Measurement

After applying improvements:

1. Re-run all checks from Step 1
2. Calculate new score
3. Calculate delta:
   ```
   delta = new_score - baseline_score
   percentage = (delta / baseline_score) * 100
   ```

## Quality Delta Interpretation

| Delta | Interpretation | Action |
|-------|----------------|--------|
| > 10% | Significant improvement | Report success |
| 0-10% | Minor improvement | Report success, consider more |
| 0 | Plateau | Stop iterating |
| < 0 | Degradation | Rollback, report failure |

## Rollback Procedure

If quality degraded:

1. **Identify what changed**: Compare before/after file states
2. **Revert changes**: Restore previous version
3. **Update changelog**: Add entry noting rollback
4. **Report failure**: Explain what was tried and why it failed

## Iteration Logic

```
iteration = 0
max_iterations = 3

WHILE iteration < max_iterations:
  baseline = measure_quality()
  apply_improvements()
  post = measure_quality()
  delta = post - baseline
  
  IF delta > 0:
    report_success()
    BREAK
  ELSE IF delta == 0:
    report_plateau()
    BREAK
  ELSE:
    rollback()
    iteration++
    
IF iteration == max_iterations:
  report_max_reached()
```

## Metrics to Track

| Metric | Before | After | Delta |
|--------|--------|-------|-------|
| Structural score | X | Y | Y-X |
| Antipattern count | X | Y | Y-X |
| Description length | X | Y | Y-X |
| SKILL.md lines | X | Y | Y-X |
| Reference count | X | Y | Y-X |
| Script count | X | Y | Y-X |

## Report Template

```markdown
## Quality Evaluation

**Baseline score:** X/100
**Post-improvement score:** Y/100
**Delta:** +Z%

### Changes
- Structural: X → Y
- Content: X → Y
- Antipatterns: X → Y

### Verdict
[Success / Plateau / Failure]
```
