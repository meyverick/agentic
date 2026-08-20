---
name: sem-impact
description: Analyze impact before modifying shared/core entities using sem CLI. Use when checking dependencies, understanding blast radius, or planning refactoring.
version: "1.0.0"
license: MIT
metadata:
  author: agentic
---

# Sem Impact

Analyze impact before modifying shared/core entities.

## Quick Start

When you need to modify a shared entity:

1. Run `sem impact <entity> --json`
2. Parse dependency graph
3. Identify blast radius
4. Review affected files/modules
5. Plan isolation strategy

## Workflow

### Step 1: Run Impact Analysis

```bash
# Basic impact analysis
sem impact <entity> --json

# With depth limit
sem impact <entity> --json --depth 3

# Specific file
sem impact ./src/lib/utils.ts --json
```

### Step 2: Parse JSON Output

```json
{
  "entity": "utils.ts",
  "directDependencies": ["types.ts", "config.ts"],
  "transitiveDependencies": ["constants.ts"],
  "dependents": ["auth.ts", "api.ts", "worker.ts"],
  "affectedModules": ["auth", "api", "worker"]
}
```

### Step 3: Identify Blast Radius

```bash
# Count affected files
sem impact <entity> --json | jq '.dependents | length'

# List all affected modules
sem impact <entity> --json | jq '.affectedModules'

# List specific file types
sem impact <entity> --json | jq '.dependents[] | select(endswith(".ts"))'
```

### Step 4: Analyze Dependencies

```bash
# Direct dependencies only
sem impact <entity> --json | jq '.directDependencies'

# Transitive dependencies
sem impact <entity> --json | jq '.transitiveDependencies'

# Full dependency tree
sem graph --entity <entity> --format json
```

### Step 5: Plan Isolation Strategy

Based on blast radius:

| Blast Radius | Strategy |
|--------------|----------|
| Small (1-3 files) | Direct modification with testing |
| Medium (4-10 files) | Feature flag + incremental rollout |
| Large (10+ files) | Refactor + deprecation + migration |

## Gotchas

- **Always run before modifying shared entities** — prevents unexpected breakage
- **Include transitive dependencies** — direct imports may have their own dependencies
- **Check both direct imports and dynamic references** — `import()` and `require()` count
- **Consider module boundaries** — changes within a module are safer than cross-module

## Common Patterns

### Before Refactoring

```bash
# 1. Check impact
sem impact ./src/lib/shared/utils.ts --json

# 2. If blast radius is large, consider:
#    - Breaking change into smaller pieces
#    - Creating new function alongside old
#    - Deprecating old function with migration path

# 3. After changes, verify no regressions
sem diff --format json
```

### Before Deleting

```bash
# 1. Check who uses this
sem impact <entity> --json | jq '.dependents'

# 2. If dependents exist, cannot delete without:
#    - Migrating all dependents
#    - Or deprecating with warning period
```

### Dependency Graph Exploration

```bash
# Full graph visualization
sem graph --entity <entity> --format json | jq .

# Find circular dependencies
sem graph --entity <entity> --format json | jq 'select(.circular != null)'

# Find most-depended-upon entities
sem impact --all --json | jq 'sort_by(.dependents | length) | reverse | .[0:10]'
```

## Reference Files

- `references/sem-commands.md` — Full sem CLI reference
- `references/dependency-analysis.md` — BFS algorithm details
