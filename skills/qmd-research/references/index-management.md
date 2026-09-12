# QMD Index Management & Maintenance Reference

This reference documents project-local index initialization, collection configuration, context attachment, embedding updates, and troubleshooting.

---

## 1. Project-Local Index Lifecycle

All index operations MUST remain strictly local to the repository root.

```bash
# Initialize project-local index (creates .qmd/index.sqlite, gitignored)
qmd init

# View health, document counts, and active collections
qmd status
```

NEVER create or point to a global index under `~/.qmd`.

---

## 2. Managing Collections

Collections group markdown files for scoped retrieval. All paths must be relative to the repository.

```bash
# Add a collection
qmd collection add ./openspec/ --name openspec

# Add context describing collection purpose
qmd context add qmd://openspec/ "Active specifications, proposals, and change archives"

# List collections and indexed files
qmd collection list
qmd ls openspec
```

---

## 3. Maintenance & Embeddings

When files change or after adding new documents, update the index:

```bash
# Re-index all collections
qmd update

# Generate or refresh vector embeddings with AST chunking
qmd embed --chunk-strategy auto

# Clean up orphaned chunks and vacuum SQLite database
qmd cleanup
```

---

## 4. Troubleshooting & Health

### Missing or Stale Index
If `qmd status` returns an error or reports stale documents:
1. Verify `.qmd/index.sqlite` exists: `ls -la .qmd/`.
2. Run `qmd init` if absent.
3. Re-index and embed: `qmd update && qmd embed --chunk-strategy auto`.

### Missing Daemon or QMD Binary
If `qmd` is not in `$PATH` or fails to run:
- Fall back loudly to `grep` for exact keyword searches.
- State `qmd unavailable, grep fallback` in the proposal or summary.
