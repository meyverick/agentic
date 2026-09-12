# Agentic

Self-improving AI agent skills and prompts for [pi.dev](https://pi.dev). A closed-loop factory: analyze reports → generate proposals → apply improvements → reflect.

## Install

```bash
bunx github:meyverick/agentic
```

Installs 7 skills into your project's `.agents/skills/`, writes a provenance manifest, and creates `openspec/reports/`.

## Skills

| Skill | Description |
|-------|-------------|
| guardrails | Cross-cutting hardening for security, deprecated APIs, and system gotchas — loads first before domain skills |
| okf-docs | Author OKF v0.2-compliant documents — ADRs, module docs, decision records — with mandatory provenance frontmatter and mechanical validation |
| openspec-harden | Harden an existing OpenSpec change for cold application — enrich artifacts with concrete file paths, code blocks, and verify steps |
| openspec-learn | Analyze reports in `./openspec/reports/` and generate OpenSpec proposals for skill/prompt improvements |
| openspec-report | Generate self-reflection (meditation) reports from archived OpenSpec changes |
| qmd-research | Research project markdown and specifications using local QMD hybrid search, and maintain index collections |
| skill-creator | Create new agent skills end-to-end: discovery, design, authoring, validation gates, behavioral proof, evals, shipping |

## The Loop

```
archived change → /openspec-report → report + assessment
                                      ↓
                              /openspec-learn → proposal
                                      ↓
                             /openspec-harden → cold-ready artifacts
                                      ↓
                              /openspec-apply → skill-creator builds it
                                      ↓
                              /openspec-archive → main specs updated
```

Each cycle makes the skill set better at improving itself.

## Requirements

- [Bun](https://bun.sh) >= 1.0
- [OpenSpec CLI](https://github.com/fmeum/openspec) (for the openspec-* loop)
- pi.dev-compatible agent harness (skills install to `.agents/skills/`)
