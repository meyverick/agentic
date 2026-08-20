# Keep a Changelog Format

## Overview

A changelog is a file which contains a curated, chronologically ordered list of notable changes for each version of a project.

## Format

```markdown
# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added
- New feature 1
- New feature 2

### Changed
- Change 1
- Change 2

### Deprecated
- Deprecated feature 1

### Removed
- Removed feature 1

### Fixed
- Bug fix 1
- Bug fix 2

### Security
- Security fix 1

## [1.0.0] - 2026-01-15

### Added
- Initial release
```

## Categories

### Added
New features that were not present before.

### Changed
Changes to existing functionality.

### Deprecated
Features that will be removed in future versions.

### Removed
Features that have been removed.

### Fixed
Bug fixes.

### Security
Vulnerability fixes.

## Rules

1. **One entry per change** — each change gets its own line
2. **User-facing language** — describe what changed for the user
3. **Link to issues/PRs** — reference related work
4. **Date format** — YYYY-MM-DD
5. **Version format** — [X.Y.Z] - YYYY-MM-DD

## Examples

```markdown
## [2.1.0] - 2026-03-15

### Added
- User profile customization
- Dark mode support

### Changed
- Improved search performance by 50%

### Fixed
- Fixed login timeout issue (#123)
- Resolved memory leak in worker

## [2.0.0] - 2026-01-01

### Changed
- **BREAKING**: Replaced REST API with GraphQL
- Updated authentication to OAuth 2.0

### Removed
- Removed legacy v1 API endpoints
```

## Links

```markdown
[Unreleased]: https://github.com/org/repo/compare/v2.1.0...HEAD
[2.1.0]: https://github.com/org/repo/compare/v2.0.0...v2.1.0
[2.0.0]: https://github.com/org/repo/releases/tag/v2.0.0
```
