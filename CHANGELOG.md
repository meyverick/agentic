# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [2.1.0] - 2026-08-22

### Added

- Eval suites for `opsx-report` (3 evals: trigger routing, anti-trigger vs opsx-learn boundary, archive-reference behavior) and `source-fetcher` (3 evals: recursive scan, cleanup idempotence, sources.json override precedence)
- skill-creator validator hard gate: Phase 7 Ship blocks approval unless validate-structure.mjs AND validate-routing.mjs pass with recorded evidence
- Evidence-recording requirement in skill-creator Phase 4 (validator output captured in session artifacts)
- Author Self-Check section in SKILL.md.template — gate awareness survives into generated skills
- Gate-compliance eval (id 4): cold-agent creation must execute both validators and record passes before completion claim
- Main specs seeded: `skill-quality-enforcement`, `skill-creation`

### Fixed

- opsx-report false runtime contract removed (`output_format: json` claimed but skill emits markdown; instruction-only skill needs no runtime block)

## [2.0.0] - 2026-08-20

### Added

- **BREAKING**: Integrated workflow — reports now generated at `./openspec/reports/` instead of external `./reports/`
- `opsx-report` skill: self-reflection (meditation) on archived changes with assessment
- `source-fetcher` skill: project-agnostic dependency source download to `./references/src/` with sources.json cache and cleanup mode
- `validate-routing.mjs`: semantic routing validation (positive_triggers, anti_triggers, description-body alignment, single-responsibility)
- Research-informed quality standards: positive_triggers (min 3), anti_triggers (min 2), activation boundaries, runtime contracts, output contracts, portability checks, context budget validation, quality score (d × m)
- Thin prompt architecture: prompts reduced to ~8-line entry points that invoke skills
- Atomic skill replacement in install script (replace entire skill if ANY file differs)
- Recursive dependency scanning in source-fetcher (depth limit 5, skips node_modules/target/dist)
- Antipatterns A17-A20 added to audit script

### Changed

- `opsx-learn` renamed from `skill-auditor`, relocated to `project/skills/`
- `skill-creator` relocated from `.pi/skills/` to `project/skills/`, upgraded to v2.0 with research-informed standards
- All scripts converted from `.sh` to `.mjs` (ES modules, self-contained, JSON output)
- Prompts use integrated argument syntax (e.g., `${@:-latest}`) instead of separate "Provided arguments" line
- Reports are self-reflection (meditation), not copies of archives — they reference archive paths instead

### Removed

- `./reports/` workflow (replaced by `./openspec/reports/`)
- `changelogs/` directory (replaced by per-module CHANGELOG.md)
- `.pi/prompts/skill-create.md` and `.pi/prompts/skill-improve.md` (replaced by opsx-learn combo)
- Wiki directories from individual skills

### Fixed

- Multi-line YAML description parsing in validate-structure.mjs
- Bun lockfile detection (`bun.lock` in addition to `bun.lockb`)
- Recursive dependency scanning in source-fetcher scan-deps.mjs
- Actual source download via git clone (was placeholder README)

## [1.0.0] - 2026-08-19

### Added

- Initial release of agentic skills for pi.dev
- skill-creator and skill-auditor skills
- opsx-report prompt
- install.ts via bunx
