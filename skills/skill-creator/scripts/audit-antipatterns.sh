#!/usr/bin/env bash
# audit-antipatterns.sh — Check skill for known antipatterns
# Usage: audit-antipatterns.sh <skill-dir>
# Output: JSON with violations and line numbers

set -euo pipefail

SKILL_DIR="${1:?Usage: audit-antipatterns.sh <skill-dir>}"
VIOLATIONS=()

if [[ ! -f "$SKILL_DIR/SKILL.md" ]]; then
  echo '{"error": "SKILL.md not found", "violations": []}' >&2
  exit 1
fi

SKILL_FILE="$SKILL_DIR/SKILL.md"
LINE_NUM=0

while IFS= read -r line; do
  LINE_NUM=$((LINE_NUM + 1))
  
  # A14: Single file omnibus (check line count)
  # Handled separately after loop
  
  # A15: Vague success bars
  if echo "$line" | grep -qiE '(professional|high.quality|well.written|good.output|proper.format)'; then
    VIOLATIONS+=("{\"line\": $LINE_NUM, \"pattern\": \"A15\", \"description\": \"Vague success bar: '$(echo "$line" | head -c 80)'\"}")
  fi
  
  # A3: Passive-voice triggers (role-job description instead of imperative)
  if echo "$line" | grep -qiE '^(you are|your role|as a|acting as)'; then
    VIOLATIONS+=("{\"line\": $LINE_NUM, \"pattern\": \"A3\", \"description\": \"Passive-voice trigger: '$(echo "$line" | head -c 80)'\"}")
  fi
  
  # A5: Prose bloat in trigger prompts (too many rules in one section)
  # This is a heuristic - if a line has more than 3 semicolons or pipe characters
  if echo "$line" | grep -qE '(;.*;.*;|(\|.*\|.*\|))'; then
    VIOLATIONS+=("{\"line\": $LINE_NUM, \"pattern\": \"A5\", \"description\": \"Possible prose bloat: '$(echo "$line" | head -c 80)'\"}")
  fi
  
  # A1: Phantom tool reference (mentions tool names that might not exist)
  if echo "$line" | grep -qiE '(call|invoke|execute|use)\s+[a-z_]+\.[a-z_]+'; then
    VIOLATIONS+=("{\"line\": $LINE_NUM, \"pattern\": \"A1\", \"description\": \"Possible phantom tool reference: '$(echo "$line" | head -c 80)'\"}")
  fi
  
  # A2: Duplicated invariant (check for repeated exact phrases)
  # This is handled separately after collecting all lines
  
done < "$SKILL_FILE"

# Check for A14: Single file omnibus (>500 lines)
TOTAL_LINES=$(wc -l < "$SKILL_FILE")
if [[ $TOTAL_LINES -gt 500 ]]; then
  VIOLATIONS+=("{\"line\": $TOTAL_LINES, \"pattern\": \"A14\", \"description\": \"Single file omnibus: $TOTAL_LINES lines (max 500)\"}")
fi

# Check for A2: Duplicated invariants (exact duplicate lines, excluding blanks/comments)
DUPLICATES=$(grep -v '^$' "$SKILL_FILE" | grep -v '^#' | grep -v '^---' | sort | uniq -d | head -5)
if [[ -n "$DUPLICATES" ]]; then
  while IFS= read -r dup; do
    VIOLATIONS+=("{\"line\": 0, \"pattern\": \"A2\", \"description\": \"Duplicated invariant: '$(echo "$dup" | head -c 80)'\"}")
  done <<< "$DUPLICATES"
fi

# Check for A4: Copy-pasted cheat-sheet (sections with similar content)
# This is a heuristic - check for repeated heading patterns
HEADINGS=$(grep -n '^##' "$SKILL_FILE" | cut -d: -f2 | sort | uniq -d)
if [[ -n "$HEADINGS" ]]; then
  while IFS= read -r heading; do
    VIOLATIONS+=("{\"line\": 0, \"pattern\": \"A4\", \"description\": \"Possible copy-pasted section: '$heading'\"}")
  done <<< "$HEADINGS"
fi

# Build violations JSON
VIOLATIONS_JSON="[]"
if [[ ${#VIOLATIONS[@]} -gt 0 ]]; then
  VIOLATIONS_JSON=$(printf '%s\n' "${VIOLATIONS[@]}" | jq -s .)
fi

PASS="true"
if [[ ${#VIOLATIONS[@]} -gt 0 ]]; then
  PASS="false"
fi

cat << EOF
{
  "pass": $PASS,
  "total_lines": $TOTAL_LINES,
  "violation_count": ${#VIOLATIONS[@]},
  "violations": $VIOLATIONS_JSON
}
EOF
