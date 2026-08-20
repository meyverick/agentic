---
name: source-fetcher
description: Download all source code from project dependencies to ./references/src/ for AI agent reference. Use when agent needs to understand dependencies by reading source code.
allowed-tools: Bash(*)
license: MIT
compatibility: Requires bun.
metadata:
  author: agentic
  version: "1.0.0"
---

# Source Fetcher

Download all source code from project dependencies for AI agent reference.

## Quick Start

When you need to understand project dependencies:

1. Run `/fetch-sources` to download all source code
2. Source is saved to `./references/src/`
3. Agent can read source to understand behavior

## Workflow

### Phase 1: Detect Stack

Scan project for stack indicators:

| Config File | Stack | Indicators |
|-------------|-------|------------|
| package.json | Node/Bun | dependencies, devDependencies |
| Cargo.toml | Rust | [dependencies], [dev-dependencies] |
| requirements.txt | Python | package list |
| go.mod | Go | module requirements |

### Phase 2: Scan Dependencies

Parse configuration files:

**package.json:**
```json
{
  "dependencies": { "drizzle-orm": "^0.39.0" },
  "devDependencies": { "svelte": "^5.0.0" }
}
```

**Cargo.toml:**
```toml
[dependencies]
axum = "0.7"
rayon = "1.8"
```

### Phase 3: Locate Source

For each dependency:
1. Find GitHub repository
2. Or use package registry (npm, crates.io, PyPI)
3. Get latest release source

### Phase 4: Download Source

Download all source code to `./references/src/<name>/`:
- Source files
- README.md
- Package metadata
- Type definitions

### Phase 5: Verify

Check downloaded source:
- Source exists in `./references/src/`
- Directory structure preserved
- Key files present (README, source)

## Cleanup Mode

Remove unused sources:

```bash
/fetch-sources --cleanup
```

This will:
1. Scan current dependencies
2. Scan ./references/src/ for existing packages
3. Find unused packages
4. Ask user to confirm removal
5. Remove unused src/ directories and sources.json entries

## Gotchas

- **Latest version only**: Always downloads latest release
- **Project agnostic**: Works with any stack (Node, Rust, Python, Go)
- **Complete download**: All source files, no filtering
- **Reference only**: For reading, not execution
- **Storage**: Large projects may need significant disk space
- **Cleanup requires confirmation**: User must approve removal

## Commands

```bash
# Fetch sources for current project
/fetch-sources

# Fetch sources for specific project
/fetch-sources /path/to/project

# Cleanup unused sources
/fetch-sources --cleanup
```

## Reference Files

- `references/stack-patterns.md` — Stack detection patterns
- `references/download-strategies.md` — Source download strategies
- `references/sources.json` — Package → URL mappings
