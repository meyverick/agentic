# Sem CLI Commands

## Impact Analysis

```bash
# Basic impact analysis
sem impact <entity> --json

# With depth limit
sem impact <entity> --json --depth 3

# Specific file
sem impact ./src/lib/utils.ts --json

# All entities
sem impact --all --json
```

## Dependency Graph

```bash
# Full graph
sem graph --entity <entity> --format json

# Specific format
sem graph --entity <entity> --format dot  # Graphviz
sem graph --entity <entity> --format mermaid  # Mermaid
```

## Semantic Diff

```bash
# Full diff
sem diff --format json

# Specific files
sem diff --files src/lib/utils.ts --format json

# Ignore formatting
sem diff --ignore-formatting --format json
```

## Entity Blame

```bash
# Who modified this entity
sem blame <file> --json

# With time range
sem blame <file> --after 2026-01-01 --json
```

## Entity Info

```bash
# Get entity details
sem info <entity> --json

# List all entities
sem list --json

# Search entities
sem search "<query>" --json
```

## Common Options

| Option | Description |
|--------|-------------|
| `--json` | Output as JSON |
| `--format <type>` | Output format (json, dot, mermaid) |
| `--depth <n>` | Limit traversal depth |
| `--ignore-formatting` | Ignore whitespace/formatting changes |
| `--after <date>` | Filter by date |
