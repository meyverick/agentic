#!/usr/bin/env bash
# release.sh — Create a new release following SemVer
# Usage: release.sh <bump-type> [version]
# bump-type: major, minor, patch, or explicit version
# Output: JSON with release info

set -euo pipefail

BUMP_TYPE="${1:?Usage: release.sh <major|minor|patch|version> [version]}"
EXPLICIT_VERSION="${2:-}"

echo "=== Semver Release ==="
echo ""

# Get current version
if [ -f "package.json" ]; then
  CURRENT_VERSION=$(cat package.json | jq -r '.version')
elif [ -f "Cargo.toml" ]; then
  CURRENT_VERSION=$(grep '^version' Cargo.toml | sed 's/version = "\(.*\)"/\1/')
else
  echo "Error: No package.json or Cargo.toml found"
  exit 1
fi

echo "Current version: $CURRENT_VERSION"

# Calculate new version
if [ -n "$EXPLICIT_VERSION" ]; then
  NEW_VERSION="$EXPLICIT_VERSION"
else
  IFS='.' read -r MAJOR MINOR PATCH <<< "$CURRENT_VERSION"
  
  case "$BUMP_TYPE" in
    major)
      MAJOR=$((MAJOR + 1))
      MINOR=0
      PATCH=0
      ;;
    minor)
      MINOR=$((MINOR + 1))
      PATCH=0
      ;;
    patch)
      PATCH=$((PATCH + 1))
      ;;
    *)
      echo "Error: Invalid bump type: $BUMP_TYPE"
      exit 1
      ;;
  esac
  
  NEW_VERSION="$MAJOR.$MINOR.$PATCH"
fi

echo "New version: $NEW_VERSION"
echo ""

# Update version files
echo "[1/5] Updating version files..."
if [ -f "package.json" ]; then
  cat package.json | jq ".version = \"$NEW_VERSION\"" > package.json.tmp
  mv package.json.tmp package.json
  echo "  Updated package.json"
fi

if [ -f "Cargo.toml" ]; then
  sed -i "s/^version = \".*\"/version = \"$NEW_VERSION\"/" Cargo.toml
  echo "  Updated Cargo.toml"
fi

# Generate changelog entry
echo "[2/5] Generating changelog entry..."
LAST_TAG=$(git describe --tags --abbrev=0 2>/dev/null || echo "")
DATE=$(date +%Y-%m-%d)

# Get commits since last tag
if [ -n "$LAST_TAG" ]; then
  COMMITS=$(git log $LAST_TAG..HEAD --oneline --no-merges 2>/dev/null || echo "")
else
  COMMITS=$(git log --oneline --no-merges 2>/dev/null || echo "")
fi

# Create changelog entry
CHANGELOG_ENTRY="## [$NEW_VERSION] - $DATE

### Changed
- Version bump to $NEW_VERSION

"

# Prepend to CHANGELOG.md
if [ -f "CHANGELOG.md" ]; then
  echo "$CHANGELOG_ENTRY$(cat CHANGELOG.md)" > CHANGELOG.md.tmp
  mv CHANGELOG.md.tmp CHANGELOG.md
else
  echo "# Changelog

$CHANGELOG_ENTRY" > CHANGELOG.md
fi
echo "  Updated CHANGELOG.md"

# Commit changes
echo "[3/5] Committing changes..."
git add .
git commit -m "chore: release v$NEW_VERSION"

# Create tag
echo "[4/5] Creating git tag..."
git tag -a "v$NEW_VERSION" -m "Release v$NEW_VERSION"

# Push
echo "[5/5] Pushing to remote..."
git push origin main --tags 2>/dev/null || echo "  Warning: Could not push to remote"

# Output JSON
cat << EOF
{
  "status": "released",
  "version": "$NEW_VERSION",
  "previous_version": "$CURRENT_VERSION",
  "tag": "v$NEW_VERSION",
  "date": "$DATE",
  "commit": "$(git rev-parse HEAD)"
}
EOF
