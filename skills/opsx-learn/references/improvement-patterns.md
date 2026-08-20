# Improvement Patterns

Common improvement types and templates.

## Pattern 1: Fix Validation Failures

**Trigger**: Report shows test cases failed

**Template**:
```
1. Identify failed test case
2. Analyze failure reason
3. Update SKILL.md to address failure
4. Re-run validation
5. If passes → update changelog (PATCH)
6. If still fails → try alternative approach
```

**Example**:
- Failed: "Description doesn't trigger on casual prompts"
- Fix: Broaden description scope
- Changelog: `### Fixed - Description trigger accuracy`

## Pattern 2: Address Follow-ups

**Trigger**: Report has follow-up items

**Template**:
```
1. List all follow-up items
2. Prioritize by impact/effort
3. Implement highest priority
4. Update changelog (MINOR for new features)
```

**Example**:
- Follow-up: "Add gotcha for edge case X"
- Fix: Add to gotchas section
- Changelog: `### Added - Gotcha for edge case X`

## Pattern 3: Upgrade Based on Patterns

**Trigger**: Report shows new best practices

**Template**:
```
1. Identify new pattern
2. Check if skill already follows it
3. If not, update skill to follow pattern
4. Update references if needed
5. Update changelog (MINOR)
```

**Example**:
- Pattern: "All skills should include fragility matching"
- Fix: Add fragility section to SKILL.md
- Changelog: `### Added - Fragility matching section`

## Pattern 4: Meta-Improvement

**Trigger**: Pattern is generalizable to all skills

**Template**:
```
1. Identify generalizable pattern
2. Check if skill-creator already covers it
3. If not, update skill-creator:
   - SKILL.md workflow
   - scripts/
   - references/
   - assets/templates/
4. Validate skill-creator
5. Update skill-creator changelog (MINOR)
6. Optionally propagate to existing skills
```

**Example**:
- Pattern: "All skills should validate near-miss negatives"
- Fix: Add to skill-creator evaluation phase
- Changelog: `### Added - Near-miss negative evaluation`

## Pattern 5: Description Optimization

**Trigger**: Report shows description doesn't trigger well

**Template**:
```
1. Analyze trigger test results
2. Identify failing queries
3. Revise description:
   - Broaden scope for should-trigger failures
   - Add specificity for shouldn't-trigger failures
4. Re-test triggers
5. Update changelog (PATCH)
```

**Example**:
- Failing: "Create a skill for X" doesn't trigger
- Fix: Add "create" to description keywords
- Changelog: `### Fixed - Description trigger keywords`

## Pattern 6: Antipattern Fix

**Trigger**: Audit detects antipatterns

**Template**:
```
1. Identify antipattern violation
2. Analyze why it occurred
3. Fix the violation:
   - A1: Remove phantom tool references
   - A2: Consolidate duplicated invariants
   - A3: Convert to imperative triggers
   - A4: Single source for cheat-sheets
   - A5: Reduce prose bloat
   - A14: Decompose omnibus file
   - A15: Add concrete success metrics
4. Re-run audit
5. Update changelog (PATCH)
```

## Pattern 7: Fragility Reclassification

**Trigger**: Report shows wrong fragility classification

**Template**:
```
1. Identify misclassified task
2. Determine correct fragility:
   - Mutation → strict
   - Read-only → loose
   - Creative → low specificity
3. Update instructions accordingly
4. Update changelog (MINOR if significant)
```

## Changelog Entry Templates

### For Fixes
```markdown
### Fixed
- <what was fixed> (from report: <report-name>)
```

### For Additions
```markdown
### Added
- <what was added> (from report: <report-name>)
```

### For Changes
```markdown
### Changed
- <what was changed> (from report: <report-name>)
```
