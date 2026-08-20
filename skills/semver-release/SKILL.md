---
name: semver-release
description: Handle version bumps, changelogs, and git tags following SemVer. Use when creating releases, updating versions, or generating changelogs.
version: "1.0.0"
license: MIT
metadata:
  author: agentic
---

# Semver Release

Handle version bumps, changelogs, and git tags.

## Quick Start

When you need to create a release:

1. Determine version bump type (MAJOR/MINOR/PATCH)
2. Update version in project files
3. Generate changelog entry
4. Create git tag
5. Push to remote

## Workflow

### Step 1: Determine Version Bump

Based on changes since last release:

| Change Type | Bump | Example |
|-------------|------|---------|
| Breaking API changes | MAJOR | 1.0.0 → 2.0.0 |
| New features (backward compatible) | MINOR | 1.0.0 → 1.1.0 |
| Bug fixes (backward compatible) | PATCH | 1.0.0 → 1.0.1 |

```bash
# Check last tag
git describe --tags --abbrev=0

# View changes since last tag
git log $(git describe --tags --abbrev=0)..HEAD --oneline
```

### Step 2: Update Version Files

**package.json:**
```bash
# Using npm
npm version <new-version> --no-git-tag-version

# Using bun
cat package.json | jq '.version = "<new-version>"' > package.json.tmp && mv package.json.tmp package.json
```

**Cargo.toml:**
```bash
# Using sed
sed -i 's/^version = ".*"/version = "<new-version>"/' Cargo.toml
```

### Step 3: Generate Changelog

Create `CHANGELOG.md` entry:

```markdown
# Changelog

## [<new-version>] - <YYYY-MM-DD>

### Added
- <new feature 1>
- <new feature 2>

### Changed
- <change 1>
- <change 2>

### Fixed
- <bug fix 1>
- <bug fix 2>

### Removed
- <removed feature 1>
```

### Step 4: Create Git Tag

```bash
# Commit version bump
git add .
git commit -m "chore: release v<new-version>"

# Create annotated tag
git tag -a v<new-version> -m "Release v<new-version>"

# Push commits and tags
git push origin main --tags
```

### Step 5: Verify Release

```bash
# Verify tag exists
git tag -l "v*"

# Verify remote has tag
git ls-remote --tags origin

# Check GitHub release (if using)
gh release view v<new-version>
```

## Changelog Format

Follow [Keep a Changelog](https://keepachangelog.com/) format:

### Added
- New features

### Changed
- Changes to existing functionality

### Deprecated
- Soon-to-be removed features

### Removed
- Removed features

### Fixed
- Bug fixes

### Security
- Vulnerability fixes

## Gotchas

- **MAJOR**: Breaking changes (incompatible API changes)
- **MINOR**: New features (backward compatible)
- **PATCH**: Bug fixes (backward compatible)
- **Changelog sections**: Added/Changed/Deprecated/Removed/Fixed/Security
- **Tags are annotated** (not lightweight)
- **Version in package.json AND/OR Cargo.toml**

## Version Calculation Script

```bash
#!/bin/bash
# Calculate next version based on commit messages

LAST_TAG=$(git describe --tags --abbrev=0 2>/dev/null || echo "v0.0.0")
LAST_VERSION=${LAST_TAG#v}

IFS='.' read -r MAJOR MINOR PATCH <<< "$LAST_VERSION"

# Check for breaking changes
if git log $LAST_TAG..HEAD --oneline | grep -qiE "BREAKING CHANGE|!:"; then
  MAJOR=$((MAJOR + 1))
  MINOR=0
  PATCH=0
# Check for features
elif git log $LAST_TAG..HEAD --oneline | grep -qiE "^feat"; then
  MINOR=$((MINOR + 1))
  PATCH=0
# Check for bug fixes
elif git log $LAST_TAG..HEAD --oneline | grep -qiE "^fix"; then
  PATCH=$((PATCH + 1))
fi

echo "$MAJOR.$MINOR.$PATCH"
```

## Reference Files

- `references/semver-spec.md` — SemVer 2.0.0 specification
- `references/changelog-format.md` — Keep a Changelog format
