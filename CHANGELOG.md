# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [2.3.0] - 2026-08-24

### Added

- **okf-docs skill** (`revive-okf-docs-skill`): revived as 5th distributed skill — author OKF v0.2-compliant documents (ADRs, module docs, decision records) with mandatory provenance frontmatter (`type`, `generated.by/at`, `sources`, `status` lifecycle) and mechanical validation via bundled `validate-frontmatter.mjs` (unified envelope, checks type/generated, actor convention, status enum, stale_after chronology); ships with 3 evals incl. anti-trigger vs opsx-report/opsx-learn
- Canonical stack alignment in `project/AGENTS.md`: verbatim 5-tier high-efficiency architecture (General & UI Tier SvelteKit via svelte-adapter-bun/Drizzle/PostgreSQL, In-Browser Graphics Threlte+Three.js/PixiJS/Phaser, Compute Rust Axum+Rayon/Bevy, Event-Driven PostgreSQL LISTEN/NOTIFY with WSS/SSE, Container Hardening distroless) plus Modular Extensibility bridge — `System components communicate via strict interface contracts and stateless micro-modules, supporting runtime plugin loading and independent horizontal scaling`
- `prototype/AGENTS.md` v2 scalable extensibility core (agnostic) — orchestrator-workers, durable state machine, stateless workers, backpressure, event-driven WSS/SSE, futureproof-by-construction pillar

### Changed

- `project/AGENTS.md` optimized to 215 lines (from 223) — semantic caveman density, hierarchy repaired (Summary + Must-follow flat list), boundaries consolidated; stack opinions preserved, purged legacy Go/Datastar/templ mentions (Mental Model table genericized, `Layer 1 systematic coverage`)
- READMEs now list 5 skills (added okf-docs) and `bunx github:meyverick/agentic` provenance manifest

### Fixed

- Validator JSON envelope unification — `validate-routing.mjs`, `validate-structure.mjs`, `audit-antipatterns.mjs` now share `{target, pass, checks:[{id,status,detail}], summary}` for deterministic branching (previously 3 dialects)
- `project/AGENTS.md` frontmatter cleaned to production (stable, self-contained, portable — removed workshop `draft` metadata referencing `prototype/`)
- `project/AGENTS.md` §8 path alignment: `.agents/skills/` → `.pi/skills/` (matches installer target)
- `.qmd/index.sqlite` now gitignored and untracked (was perpetual `M` noise)

## [2.2.0] - 2026-08-23

### Added

- **Ownership boundary** (`harden-learn-proposal-contract`): opsx-learn Phase 2c classifies skill/prompt targets via precedence chain — provenance manifest (`.agentic-manifest.json`), user adjudications (`.ownership.json`), location and namespace checks; external skills (OpenSpec-owned, agentic-distributed elsewhere, user-global) are never edited in place; unknown → ask user once, record verdict
- Installer writes `.pi/skills/.agentic-manifest.json` (installed_by, version, skills, prompts) and warns before atomic-replace when local modifications are detected; `.ownership.json` never touched by installer
- Canonical trigger field names in proposals (`positive_triggers`/`anti_triggers`) — values transfer verbatim into skill frontmatter
- One-path rule: proposal items and task verify clauses name exactly one concrete target path; either/or prohibited
- Evals-impact statement mandatory when proposals modify existing skills
- Deferred-signals line: unharvested report candidates named with reasons
- Timestamp rule in opsx-report: `date -u` generated, never hand-written
- Two-stage benchmarks: structural `benchmark.json` for all 4 skills (validator + routing + eval metrics); behavioral d×m defined as `pending_cold_agent_run`
- Script reachability: source-fetcher phases invoke their 4 bundled scripts (detect-stack, scan-deps, download-src, cleanup-src)

### Changed

- Root and project READMEs rewritten to reflect the actual 4-skill product and `bunx github:meyverick/agentic` installation

### Removed

- opsx-learn `scripts/` directory (analyze-report.mjs duplicated Phase 2 prose; compare-skills.mjs + measure-quality.mjs duplicated skill-creator's validate pair / compute-benchmark)
- opsx-learn stale `runtime:` frontmatter block (skill emits markdown proposals, not JSON; instruction-only skills carry no runtime contract)

### Fixed

- Duplicate `syncFile` definition in install.ts removed
- False `output_format: json` claim on opsx-report removed (2.1.0 follow-through)

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
