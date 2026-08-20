---
name: qmd-index
description: Index new content into QMD for semantic search. Use when adding documentation, creating collections, or updating the knowledge base.
version: "1.0.0"
license: MIT
metadata:
  author: agentic
---

# QMD Index

Index new content into QMD for semantic search.

## Quick Start

When you need to index new content:

1. Create QMD collection for directory
2. Add contextual metadata
3. Run embedding
4. Verify search works

## Workflow

### Step 1: Create Collection

```bash
# Create collection from directory
qmd collection add <path> --name <collection-name>

# List existing collections
qmd collection list
```

### Step 2: Add Contextual Metadata

```bash
# Add context for better reranking
qmd context add qmd://<collection-name> "<description of collection content>"

# Add context to specific files
qmd context add qmd://<collection-name>/<file> "<specific context>"
```

### Step 3: Run Embedding

```bash
# Embed with auto chunk strategy
qmd embed --chunk-strategy auto

# Embed specific collection
qmd embed --collection <collection-name>

# Force re-embed
qmd embed --force
```

### Step 4: Verify Index

```bash
# Check collection status
qmd collection list --json

# Test search
qmd query "<search query>" --json -n 5

# Check embedding status
qmd status
```

### Step 5: Incremental Updates

```bash
# After file changes, update index
qmd update

# Update specific collection
qmd update --collection <collection-name>

# Re-embed changed files only
qmd embed --incremental
```

## Gotchas

- **Run `qmd update` after file changes** — index goes stale
- **Use `qmd embed --chunk-strategy auto`** — handles most content types
- **Add context for better reranking** — generic descriptions hurt search quality
- **Collections are path-based** — moving files breaks the collection

## Search Queries

### Basic Search

```bash
# Hybrid search (recommended)
qmd query "<intent>" --json -n 10

# BM25 keyword search
qmd search "<keywords>" --json
```

### Batch Extraction

```bash
# Get all matching documents
qmd query "<intent>" --all --files --min-score 0.4

# Get specific documents
qmd multi-get "<docid1>,<docid2>" --json
```

### Advanced Queries

```bash
# With filters
qmd query "<intent>" --collection <name> --json

# With score threshold
qmd query "<intent>" --min-score 0.7 --json

# Get document by ID
qmd get <docid> --json
```

## Maintenance

### After File Changes

```bash
# Update index after modifying files
qmd update
qmd embed --chunk-strategy auto
```

### Periodic Maintenance

```bash
# Full re-index (if search quality degrades)
qmd embed --force --chunk-strategy auto

# Clean up orphaned entries
qmd collection prune
```

## Reference Files

- `references/qmd-commands.md` — Full QMD CLI reference
- `references/qmd-metadata.md` — Contextualization guide
