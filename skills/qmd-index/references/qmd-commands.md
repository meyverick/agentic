# QMD CLI Commands

## Collection Management

```bash
# Create collection from directory
qmd collection add <path> --name <name>

# List collections
qmd collection list
qmd collection list --json

# Remove collection
qmd collection remove <name>

# Prune orphaned entries
qmd collection prune
```

## Indexing

```bash
# Embed all content
qmd embed --chunk-strategy auto

# Embed specific collection
qmd embed --collection <name>

# Force re-embed
qmd embed --force

# Incremental embed (changed files only)
qmd embed --incremental

# Update index after file changes
qmd update
```

## Search

```bash
# Hybrid search (recommended)
qmd query "<intent>" --json -n 10

# BM25 keyword search
qmd search "<keywords>" --json

# Get document by ID
qmd get <docid> --json

# Batch get
qmd multi-get "<docid1>,<docid2>" --json
```

## Context

```bash
# Add context to collection
qmd context add qmd://<name> "<description>"

# Add context to specific file
qmd context add qmd://<name>/<file> "<context>"

# List contexts
qmd context list
```

## Status

```bash
# Check QMD status
qmd status

# Check embedding status
qmd embed --status

# Check collection status
qmd collection list --json
```

## Common Options

| Option | Description |
|--------|-------------|
| `--json` | Output as JSON |
| `--collection <name>` | Target specific collection |
| `--chunk-strategy <type>` | Chunking strategy (auto, fixed, semantic) |
| `--force` | Force operation |
| `--incremental` | Only process changes |
| `-n <count>` | Limit results |
| `--min-score <float>` | Minimum relevance score |
