# Conflict Handling

When multiple reports affect same tool:

1. **Collect all improvements** from each report
2. **Merge into single proposal** with combined requirements
3. **Deduplicate** redundant improvements
4. **Prioritize** by assessment difficulty ratings
5. **Note provenance** which report contributed which improvement

## Example

```
Report A: "Improved csv-analyzer with better parsing"
Report B: "Fixed csv-analyzer edge cases"

System detects: Both affect csv-analyzer
System action: Merges into single proposal
Result: One proposal with combined improvements
```
