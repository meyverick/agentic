# Examples

## Single Report Processing

```bash
/opsx-learn add-central-datastore
```

1. System finds report at `./openspec/reports/add-central-datastore/`
2. Analyzes report.md and assessment.md
3. Determines: database-schema skill needs improvement
4. Generates proposal at `./openspec/changes/add-database-schema-improvements/`
5. Moves report to `./openspec/reports/archives/`
6. User reviews proposal with `/opsx-explore` or implements with `/opsx-apply`

## Batch Processing

```bash
/opsx-learn
```

1. System scans `./openspec/reports/` for all reports (excluding archives)
2. Processes each report sequentially
3. Merges improvements for same tool
4. Generates separate proposals for different tools
5. Moves all processed reports to archives

## Conflict Resolution

```
Report A: "Improved csv-analyzer with better parsing"
Report B: "Fixed csv-analyzer edge cases"

System detects: Both affect csv-analyzer
System action: Merges into single proposal
Result: One proposal with combined improvements
```
