# Gotchas Patterns

Common pitfalls in skill creation and how to avoid them.

## Name Format

**Pitfall**: Name doesn't match directory, has uppercase, consecutive hyphens, or is too long.

**Fix**: 
- Lowercase letters, numbers, hyphens only
- 1-64 characters
- No leading/trailing hyphens
- No consecutive hyphens
- Match directory name (Pi allows mismatch, but standard requires match)

## Description Too Broad

**Pitfall**: "Helps with files" — triggers on everything, adds noise.

**Fix**: Be specific about what AND when. Include keywords users would say. Focus on intent, not implementation.

## Description Too Narrow

**Pitfall**: "Analyzes CSV files using pandas read_csv with default parameters" — never triggers because users don't say this.

**Fix**: Describe user intent. "Analyze CSV data" not "use pandas read_csv".

## SKILL.md Too Long

**Pitfall**: 1000+ lines in SKILL.md — agent struggles to extract what's relevant.

**Fix**: Keep SKILL.md under 500 lines. Move detailed content to references/. Use progressive disclosure.

## Missing Gotchas

**Pitfall**: Agent makes same mistake repeatedly because non-obvious behavior isn't documented.

**Fix**: Document environment-specific facts, naming inconsistencies, hidden preconditions, non-obvious side effects.

## Over-Specification

**Pitfall**: "Use exactly 3 spaces for indentation" — brittle, breaks on edge cases.

**Fix**: Match specificity to fragility. Creative tasks get latitude. Mutations get strict rules.

## Under-Specification

**Pitfall**: "Handle errors appropriately" — agent guesses, gets it wrong.

**Fix**: Specify exact error handling: what error, what action, what fallback.

## Copy-Paste Drift

**Pitfall**: Same rule in 3 places — one gets updated, others don't.

**Fix**: Single source of truth. Global rules injected once. Role-specific rules in one file.

## Phantom Tool References

**Pitfall**: Prompt mentions tool agent can't call — agent tries non-existent call.

**Fix**: Only name tools agent actually has. Check tool gates.

## Vague Success Bars

**Pitfall**: "Output should be professional" — no way to verify.

**Fix**: Use concrete metrics: pass rate, violation count, specific criteria.

## Missing Examples

**Pitfall**: Agent guesses what output should look like.

**Fix**: Provide one canonical example. Show input → output transformation.

## Ignoring Fragility

**Pitfall**: Same strictness for creative writer and money transfer.

**Fix**: Classify task fragility. Mutation = strict. Read-only = loose. Creative = low specificity.
