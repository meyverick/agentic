---
name: okf-docs
description: >
  Author, audit, and synchronize OKF v0.2 documentation: non-technical Spotlight README.md files,
  "Easy to Use, Hard to Master" progressive wiki/ directories (orchestrator and per-package submodules),
  ADRs, and public-only GitHub Wiki provisioning and sync. Use before any push, release, or changelog
  update, or whenever creating/modifying README.md, wiki/, or ADR artifacts. Do NOT use for pure internal
  code edits that do not alter behavior, workflows, architecture, or release state.
allowed-tools: Bash(*)
metadata:
  author: agentic
  version: "0.2.0"
---

# okf-docs — OKF v0.2 Documentation, Progressive Wiki & Public GitHub Wiki Governance

## 1. Activation Boundary

- **Triggers on**: Authoring or updating `README.md`, `./wiki/`, or `./modules/<package>/wiki/`; preparing a commit push, release, or `CHANGELOG.md` entry; auditing docs for OKF v0.2 compliance; provisioning or syncing GitHub Wikis on public repositories.
- **Does NOT trigger on**: Read-only codebase exploration; internal implementation fixes with zero user, operational, or architectural surface change (until pre-push/release gate).

## 2. The Three Pillars of OKF v0.2 Documentation

### Pillar 1 — The Spotlight `README.md` (Universal Human Accessibility)
- Written strictly as a clear, inspiring product spotlight that **anyone** (non-technical users, stakeholders, everyday readers) can immediately understand.
- **Hard Prohibition**: Zero fenced code/terminal blocks (` ```bash `, ` ```sh `, ` ```rust `, etc.), zero CLI flags, zero compiler/architecture jargon, and zero environment variable tables. All technical setup belongs exclusively in `./wiki/`.
- **Mandatory Closing Section**: Names the thanks.dev support link, points readers to `CONTRIBUTING.md` for how to help and fund, and to root `DEPENDENCIES.md` (generated with `.github/FUNDING.yml` by the `check` skill's `scripts/funding-gate.py`). `CREDITS.md` is reserved for human contributors — never generate it, never list dependencies there.

### Pillar 2 — The Progressive `wiki/` ("Easy to Use, Hard to Master")
- Maintained at `./wiki/` for the `Tier 1 Root Orchestrator` and `./modules/<package>/wiki/` for each domain package repository.
- Must be tracked in Git (`git add wiki/`) AND structured across 4 progressive mastery tiers so beginners get frictionless onboarding while masters get exhaustive internals:
  - `index.md` (mirrored to `Home.md` on GitHub Wiki): Curriculum map & navigation catalog.
  - **Tier 1 — Beginner (`01-getting-started.md`)**: Plain-language concepts, 5-minute quickstart, first success path.
  - **Tier 2 — Practitioner (`02-guides-and-workflows.md`)**: Everyday usage, configuration recipes, common scenarios.
  - **Tier 3 — Advanced (`03-architecture-and-internals.md`)**: System topology, data contracts, state machines, performance invariants.
  - **Tier 4 — Master (`04-mastery-and-extension.md` & `adr/`)**: Edge cases, custom extensions, troubleshooting matrices, and Architecture Decision Records (`adr/`).

### Pillar 3 — Public-Only GitHub Wiki Provisioning & Sync
- Executed before push/release via `scripts/sync-wiki.sh <repo-dir>`.
- Checks repository visibility (`gh repo view --json isPrivate`).
- **If Private/Internal (`isPrivate == true`)**: Immediately exits `0` without enabling or pushing to GitHub Wiki.
- **If Public (`isPrivate == false`)**: Enables GitHub Wiki (`gh repo edit --enable-wiki=true`), provisions the remote `.wiki.git` repository automatically, copies tracked `wiki/*.md` files (generating `Home.md` and `_Sidebar.md` from `index.md`), and pushes to `<repo>.wiki.git`.

## 3. Progressive Reference & Script Routing

- Full OKF v0.2 frontmatter schema, Spotlight `README.md` template, and 4-Tier `wiki/` templates -> [references/okf.md](references/okf.md)
- Automated public check, wiki enablement, provisioning, and Git sync -> [scripts/sync-wiki.sh](scripts/sync-wiki.sh)

## 4. Hard Rules

- Frontmatter `okf_version: "0.2"` and `type` are REQUIRED on every `wiki/*.md`, ADR, and specification document (`README.md` omits raw YAML frontmatter for clean landing page rendering).
- `README.md` = non-technical spotlight for everyday users — zero technical or terminal code blocks.
- Never enable or push GitHub Wiki on private or internal repositories (`isPrivate != false`).
- Never ingest-write into `./references/` — index or inspect, never modify.
