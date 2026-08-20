# Evaluation Methodology

Full eval framework for skill quality assurance.

## Two Eval Halves

```
┌─ TRIGGER evals ─────────────────────────────┐
│  Does the right skill fire at the right time?│
│  Positive cases + near-miss negatives        │
└──────────────────────────────────────────────┘
┌─ OUTPUT evals ───────────────────────────────┐
│  Does the output satisfy quality rules?      │
│  Deterministic + semantic judgment           │
└──────────────────────────────────────────────┘
```

## Test Case Design

### Positive Cases

Prompts that SHOULD trigger the skill:
- Varied phrasing (formal, casual, terse)
- Different levels of detail
- Realistic context (file paths, names, specifics)

### Near-Miss Negatives (Critical)

Prompts that should NOT trigger the skill:
- Share keywords but need different handling
- Similar domain but different task
- Without these, over-firing passes silently

Example for CSV analysis skill:
- ✅ "Analyze my sales CSV and make a chart" (should trigger)
- ❌ "Write a Python script that reads a CSV and uploads to Postgres" (near-miss: involves CSV but different task)

### Assertion Writing

Good assertions:
- `"The output file is valid JSON"` — programmatically verifiable
- `"The chart has labeled axes"` — specific and observable
- `"The report includes at least 3 recommendations"` — countable

Bad assertions:
- `"The output is good"` — too vague
- `"Uses exactly the phrase 'Total Revenue: $X'"` — too brittle

## Grading Principles

- **Require concrete evidence for PASS**: Don't give benefit of the doubt
- **Review assertions themselves**: Are they too easy, too hard, or unverifiable?
- **Blind comparison**: Compare outputs without revealing which version

## Benchmark Computation

```json
{
  "run_summary": {
    "with_skill": {
      "pass_rate": { "mean": 0.83, "stddev": 0.06 },
      "time_seconds": { "mean": 45.0, "stddev": 12.0 },
      "tokens": { "mean": 3800, "stddev": 400 }
    },
    "without_skill": {
      "pass_rate": { "mean": 0.33, "stddev": 0.10 },
      "time_seconds": { "mean": 32.0, "stddev": 8.0 },
      "tokens": { "mean": 2100, "stddev": 300 }
    },
    "delta": {
      "pass_rate": 0.50,
      "time_seconds": 13.0,
      "tokens": 1700
    }
  }
}
```

## Calibration Loop

```
write prompt → run evals → analyze failures → edit prompt → re-run
    ▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔
stop when pass-rate ≥ target AND near-miss rate = 0
```

## Analysis Patterns

- **Remove assertions that always pass**: They don't test anything
- **Investigate assertions that always fail**: Are they broken?
- **Study assertions that pass with skill but fail without**: This is where skill adds value
- **Check outliers**: If one eval takes 3x longer, find why

## Tiered Enforcement

| Tier | Action | When |
|------|--------|------|
| deny | Block outright | Zero expected false positives |
| warn | Flag, allow | Minor issues |
| ask | Pause for confirmation | Ambiguous cases |
