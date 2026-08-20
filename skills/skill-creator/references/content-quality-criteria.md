# Content Quality Criteria

What makes good skill instructions.

## Clarity

- **One interpretation**: Instructions should have exactly one meaning
- **Concrete, not abstract**: "Run `./scripts/validate.sh`" not "validate the output"
- **Sequential steps**: Number steps when order matters
- **Active voice**: "Check X" not "X should be checked"

## Actionability

- **Agent can follow without guessing**: Every step is executable
- **Tools specified**: Name the exact tool/command to use
- **Inputs/outputs defined**: What goes in, what comes out
- **Error handling**: What to do when things fail

## Edge Cases

- **Document non-obvious behaviors**: Things the agent would get wrong without being told
- **Input validation**: What happens with malformed input
- **Boundary conditions**: Empty inputs, large inputs, special characters
- **Failure modes**: Network errors, permission denied, missing files

## Examples

- **One canonical example**: Show the happy path clearly
- **BAD/GOOD pairs**: Show what to avoid and what to do
- **Real-world context**: Use realistic inputs, not "foo" and "bar"
- **Input → Output**: Show the transformation

## Gotchas

- **Environment-specific facts**: Things that defy reasonable assumptions
- **Naming inconsistencies**: Same concept, different names across systems
- **Hidden preconditions**: What must be true before running
- **Non-obvious side effects**: What happens beyond the obvious

## Progressive Disclosure

- **SKILL.md**: Core instructions, always loaded (<500 lines)
- **references/**: Detailed docs, loaded on-demand
- **scripts/**: Executable logic, invoked when needed
- **assets/**: Templates and static resources

## Fragility Matching

| Task Type | Specificity Level | Example |
|-----------|-------------------|---------|
| Mutation (create/delete/modify) | Strict, step-by-step | "Run exactly this command. Do not add flags." |
| Read-only (query/analyze) | Loose, latitude | "Query the database. Format as you see fit." |
| Creative (prose/design) | Low specificity | "Write a summary. Follow the style guide." |

## Antipatterns to Avoid

- **Vague instructions**: "Handle errors appropriately"
- **Over-specification**: "Use exactly 3 spaces for indentation"
- **Missing context**: "Run the script" (which script?)
- **Assumed knowledge**: "Use the standard approach" (what standard?)
- **Copy-paste**: Same rule in multiple places (drift risk)
