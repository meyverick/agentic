#!/usr/bin/env bash
# scaffold-skill.sh — Create skill directory structure with SKILL.md skeleton
# Usage: scaffold-skill.sh <skill-name> [output-dir]
# Output: JSON with created path

set -euo pipefail

SKILL_NAME="${1:?Usage: scaffold-skill.sh <skill-name> [output-dir]}"
OUTPUT_DIR="${2:-.}"

# Validate skill name format
if [[ ! "$SKILL_NAME" =~ ^[a-z0-9]([a-z0-9-]*[a-z0-9])?$ ]]; then
  echo '{"error": "Invalid skill name. Must be lowercase letters, numbers, hyphens only. No leading/trailing hyphens.", "name": "'"$SKILL_NAME"'"}' >&2
  exit 1
fi

if [[ ${#SKILL_NAME} -gt 64 ]]; then
  echo '{"error": "Skill name too long. Maximum 64 characters.", "name": "'"$SKILL_NAME"'", "length": '"${#SKILL_NAME}"'}' >&2
  exit 1
fi

if [[ "$SKILL_NAME" == *"--"* ]]; then
  echo '{"error": "Skill name contains consecutive hyphens.", "name": "'"$SKILL_NAME"'"}' >&2
  exit 1
fi

# Create directory structure
SKILL_DIR="$OUTPUT_DIR/$SKILL_NAME"
mkdir -p "$SKILL_DIR"/{scripts,references,assets/templates}

# Create SKILL.md skeleton
cat > "$SKILL_DIR/SKILL.md" << EOF
---
name: $SKILL_NAME
description: TODO: Describe what this skill does and when to use it. Be specific.
---

# ${SKILL_NAME}

## When to Use

TODO: Describe when this skill should be activated.

## Usage

TODO: Describe how to use this skill.

## Gotchas

TODO: List environment-specific facts, common failures, non-obvious behaviors.
EOF

# Output JSON
cat << EOF
{
  "status": "created",
  "path": "$SKILL_DIR",
  "files": [
    "$SKILL_DIR/SKILL.md",
    "$SKILL_DIR/scripts/",
    "$SKILL_DIR/references/",
    "$SKILL_DIR/assets/templates/"
  ]
}
EOF
