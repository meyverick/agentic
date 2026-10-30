# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## 0.1.0 - 2026-10-30

### Added
- `agentic` executable: a single command installs or updates the consumer rulebook (`.pi` and `.gemini` hosts) and the skill library owned by this package.
- Ownership marker `.agentic`, stamped at install time and never shipped, as the sole input to the skill deletion rule.
- `agentic status` drift report and `agentic install --dry-run` plan preview.
- Collision policy: unmarked directories at a shipped skill name abort the run; `--force` hands ownership over.
- `modules/package.json` with `bin`, `files`, and no build or lifecycle script, so the published TypeScript runs as installed under bun.
- Package gate validating untracked markers, skill frontmatter names, and packed artifact contents; the unit lane runs `bun test`.
- Initial project structure.
