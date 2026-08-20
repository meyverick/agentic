#!/usr/bin/env bash
# validate-structure.sh — Check skill directory structure and SKILL.md compliance
# Usage: validate-structure.sh <skill-dir>
# Output: JSON with pass/fail and specifics

set -euo pipefail

SKILL_DIR="${1:?Usage: validate-structure.sh <skill-dir>}"
ERRORS=()
WARNINGS=()

# Check SKILL.md exists
if [[ ! -f "$SKILL_DIR/SKILL.md" ]]; then
  ERRORS+=("SKILL.md not found")
  echo '{"pass": false, "errors": ["SKILL.md not found"], "warnings": []}' >&2
  exit 1
fi

# Extract frontmatter
FRONTMATTER=$(sed -n '/^---$/,/^---$/p' "$SKILL_DIR/SKILL.md" | sed '1d;$d')

if [[ -z "$FRONTMATTER" ]]; then
  ERRORS+=("No frontmatter found in SKILL.md")
fi

# Check name field
NAME=$(echo "$FRONTMATTER" | grep -E '^name:' | sed 's/^name: *//' | tr -d '"' || true)
if [[ -z "$NAME" ]]; then
  ERRORS+=("Missing required 'name' field in frontmatter")
elif [[ ! "$NAME" =~ ^[a-z0-9]([a-z0-9-]*[a-z0-9])?$ ]]; then
  ERRORS+=("Invalid name format: '$NAME'. Must be lowercase letters, numbers, hyphens only. No leading/trailing hyphens.")
elif [[ ${#NAME} -gt 64 ]]; then
  ERRORS+=("Name too long: ${#NAME} chars. Maximum 64 characters.")
elif [[ "$NAME" == *"--"* ]]; then
  ERRORS+=("Name contains consecutive hyphens: '$NAME'")
fi

# Check name matches directory
DIR_NAME=$(basename "$SKILL_DIR")
if [[ -n "$NAME" && "$NAME" != "$DIR_NAME" ]]; then
  WARNINGS+=("Name '$NAME' does not match directory name '$DIR_NAME'. Pi allows this, but the Agent Skills standard requires matching.")
fi

# Check description field
DESC=$(echo "$FRONTMATTER" | grep -E '^description:' | sed 's/^description: *//' | tr -d '"' || true)
if [[ -z "$DESC" ]]; then
  ERRORS+=("Missing required 'description' field in frontmatter")
elif [[ ${#DESC} -gt 1024 ]]; then
  ERRORS+=("Description too long: ${#DESC} chars. Maximum 1024 characters.")
fi

# Check directory structure
if [[ ! -d "$SKILL_DIR/scripts" ]]; then
  WARNINGS+=("Missing scripts/ directory")
fi

if [[ ! -d "$SKILL_DIR/references" ]]; then
  WARNINGS+=("Missing references/ directory")
fi

if [[ ! -d "$SKILL_DIR/assets" ]]; then
  WARNINGS+=("Missing assets/ directory")
fi

# Check file references in SKILL.md resolve
while IFS= read -r line; do
  # Extract relative paths from markdown links: [text](path)
  if echo "$line" | grep -qE '\]\([^)]+\)'; then
    # Extract path between ]( and )
    REF=$(echo "$line" | grep -oE '\]\([^)]+\)' | sed 's/^\](//' | sed 's/)$//' | head -1)
    # Skip external URLs and anchors
    if [[ -n "$REF" && ! "$REF" =~ ^https?:// && ! "$REF" =~ ^# && ! "$REF" =~ ^mailto: ]]; then
      if [[ ! -e "$SKILL_DIR/$REF" ]]; then
        WARNINGS+=("File reference not found: $REF")
      fi
    fi
  fi
done < "$SKILL_DIR/SKILL.md"

# Build JSON
ERROR_JSON="[]"
if [[ ${#ERRORS[@]} -gt 0 ]]; then
  ERROR_JSON=$(printf '%s\n' "${ERRORS[@]}" | jq -R . | jq -s .)
fi

WARN_JSON="[]"
if [[ ${#WARNINGS[@]} -gt 0 ]]; then
  WARN_JSON=$(printf '%s\n' "${WARNINGS[@]}" | jq -R . | jq -s .)
fi

PASS="true"
if [[ ${#ERRORS[@]} -gt 0 ]]; then
  PASS="false"
fi

cat << EOF
{
  "pass": $PASS,
  "name": "${NAME:-}",
  "description_length": ${#DESC},
  "errors": $ERROR_JSON,
  "warnings": $WARN_JSON
}
EOF
