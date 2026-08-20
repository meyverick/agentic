# skill-creator Technical Documentation

## Overview

skill-creator creates new Agent Skills from problem descriptions or instruction files.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    skill-creator ARCHITECTURE                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  INPUT: Problem description OR instruction file                 │
│  ═══════════════════════════════════════════════                │
│  ├── From user: "Create skill for X"                           │
│  └── From file: ./skills-todo/<name>.md                         │
│                                                                 │
│  WORKFLOW:                                                      │
│  ═════════                                                      │
│  Phase 0: Read instructions (if provided)                       │
│  Phase 1: Discovery (if no instructions)                        │
│  Phase 2: Design (scope, fragility, components)                 │
│  Phase 3: Authoring (SKILL.md, scripts, references)             │
│  Phase 4: Validation (structure, content, antipatterns)         │
│  Phase 5: Evaluation (test cases, near-misses)                  │
│  Phase 6: Optimization (description triggering)                 │
│  Phase 7: Ship (save to ./project/skills/)                      │
│                                                                 │
│  OUTPUT: ./project/skills/<skill-name>/                         │
│  ═══════════════════════════════════════                        │
│  ├── SKILL.md                                                   │
│  ├── scripts/                                                   │
│  ├── references/                                                │
│  ├── evals/                                                     │
│  └── assets/                                                    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Key Concepts

### Skill Structure

```
skill-name/
├── SKILL.md              # Core instructions (<500 lines)
├── scripts/              # Reusable logic (.mjs, cold/isolated)
├── references/           # Detailed docs (loaded on-demand)
├── evals/                # Test cases
└── assets/               # Templates, resources
```

### Frontmatter

```yaml
---
name: skill-name
description: What the skill does and when to use it
allowed-tools: Bash(*)
license: MIT
compatibility: Requires bun.
metadata:
  author: agentic
  version: "1.0"
---
```

### Tiers

| Tier | What's Included | When to Use |
|------|-----------------|-------------|
| Minimal | Structural validation + content review | Quick prototyping |
| Standard | + 2-3 test cases + manual eval | Most production skills |
| Rigorous | + full eval + description optimization | High-stakes workflows |

### Validation Pipeline

1. **Structural validation**: `validate-structure.sh`
2. **Content review**: Agent assesses quality
3. **Antipattern audit**: `audit-antipatterns.sh`
4. **Evaluation**: Test cases + near-misses
5. **Optimization**: Description triggering

## API Reference

### Commands

| Command | Description |
|---------|-------------|
| `/skill-create <name>` | Create skill from instruction file |
| `/skill-create` | Create skill (interactive discovery) |

### Output

Skills are created at `./project/skills/<skill-name>/` with:
- `SKILL.md`: Core instructions
- `scripts/`: Reusable logic
- `references/`: Detailed docs
- `evals/`: Test cases
- `assets/`: Templates, resources
