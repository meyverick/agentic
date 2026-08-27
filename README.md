# Agentic

Self-improving AI agent skills and prompts for [pi.dev](https://pi.dev). A closed-loop factory: analyze reports → generate proposals → apply improvements → reflect.

## Install

```bash
bunx github:meyverick/agentic
```

Installs 5 skills + 3 prompts into your project's `.pi/skills/` and `.pi/prompts/`, writes a provenance manifest, and creates `openspec/reports/`.

## Skills

| Skill | Description |
|-------|-------------|
| openspec-learn | Analyze reports in `./openspec/reports/` and generate OpenSpec proposals for skill/prompt improvements |
| openspec-report | Generate self-reflection (meditation) reports from archived OpenSpec changes |
| skill-creator | Create new agent skills end-to-end: discovery, design, authoring, validation gates, evals, shipping |
| source-fetcher | Recursively scan project dependencies and download their source code to `./references/src/` for AI reference |
| okf-docs | Author OKF v0.2-compliant documents — ADRs, module docs, decision records — with mandatory provenance frontmatter and mechanical validation |

## Prompts

| Prompt | Skill invoked |
|--------|---------------|
| `/opsx-learn [report]` | openspec-learn |
| `/opsx-report [change]` | openspec-report |
| `/fetch-sources` | source-fetcher |

## The Loop

```
archived change → /opsx-report → report + assessment
                                      ↓
                              /opsx-learn → proposal
                                      ↓
                              /opsx-apply → skill-creator builds it
                                      ↓
                              /opsx-archive → main specs updated
```

Each cycle makes the skill set better at improving itself.

## Requirements

- [Bun](https://bun.sh) >= 1.0
- [OpenSpec CLI](https://github.com/fmeum/openspec) (for the opsx-* loop)
- pi.dev-compatible agent harness (skills install to `.pi/skills/`)
