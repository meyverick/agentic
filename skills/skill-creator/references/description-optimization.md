# Description Optimization

How to improve skill triggering through description tuning.

## How Triggering Works

1. **Discovery**: Agent loads `name` and `description` of all skills
2. **Activation**: When task matches description, agent loads full SKILL.md
3. **Execution**: Agent follows instructions

Description carries the entire burden of triggering.

## Writing Effective Descriptions

### Principles

- **Imperative phrasing**: "Use this skill when..." not "This skill does..."
- **Focus on user intent**: What the user is trying to achieve
- **Err on pushy**: Explicitly list contexts where skill applies
- **Concise**: A few sentences to short paragraph

### Good vs Bad

Good:
```yaml
description: >
  Analyze CSV and tabular data files — compute summary statistics,
  add derived columns, generate charts, and clean messy data. Use this
  skill when the user has a CSV, TSV, or Excel file and wants to
  explore, transform, or visualize the data, even if they don't
  explicitly mention "CSV" or "analysis."
```

Bad:
```yaml
description: Process CSV files.
```

## Trigger Test Queries

Create 10-20 queries: mix of should-trigger and shouldn't-trigger.

### Should-Trigger Queries

- Vary phrasing (formal, casual, terse)
- Vary explicitness (direct naming vs describing need)
- Vary detail (terse vs context-heavy)
- Include cases where skill helps but connection isn't obvious

### Should-Not-Trigger Queries (Near-Misses)

Strong negative examples share keywords but need different handling:
- "Write a Python script that reads a CSV and uploads to Postgres" (involves CSV, but task is database ETL, not analysis)
- "Update the formulas in my Excel budget spreadsheet" (shares spreadsheet concept, but needs Excel editing, not CSV analysis)

Weak negatives (don't test anything):
- "Write a fibonacci function" (obviously irrelevant)
- "What's the weather today?" (no keyword overlap)

## Optimization Loop

1. **Evaluate** current description on train + validation sets
2. **Identify failures** in train set only
3. **Revise description**:
   - Should-trigger failing → broaden scope
   - Should-not-trigger failing → add specificity
   - Avoid keyword overfitting → find general category
4. **Repeat** until train set passes or plateau
5. **Select best** by validation pass rate

## Train/Validation Split

- **Train set (~60%)**: Guides changes
- **Validation set (~40%)**: Checks generalization

Keep split fixed across iterations. Both sets need proportional mix of positive/negative queries.

## Avoiding Overfitting

- Don't add specific keywords from failed queries
- Find the general category those queries represent
- Try structurally different approaches when stuck
- Stay under 1024 chars

## Applying the Result

1. Update `description` field in SKILL.md
2. Verify under 1024-char limit
3. Manual sanity check with a few prompts
4. Optional: 5-10 fresh queries for rigorous verification
