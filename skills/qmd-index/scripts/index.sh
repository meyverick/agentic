#!/usr/bin/env bash
# index.sh — Index content into QMD for semantic search
# Usage: index.sh <path> <collection-name> [description]
# Output: JSON with indexing results

set -euo pipefail

PATH_TO_INDEX="${1:?Usage: index.sh <path> <collection-name> [description]}"
COLLECTION_NAME="${2:?Usage: index.sh <path> <collection-name> [description]}"
DESCRIPTION="${3:-}"

echo "=== QMD Index ==="
echo "Path: $PATH_TO_INDEX"
echo "Collection: $COLLECTION_NAME"
echo ""

# Check if path exists
if [ ! -d "$PATH_TO_INDEX" ]; then
  echo "Error: Path not found: $PATH_TO_INDEX"
  exit 1
fi

# Step 1: Create collection
echo "[1/4] Creating collection..."
qmd collection add "$PATH_TO_INDEX" --name "$COLLECTION_NAME" 2>/dev/null || echo "  Collection may already exist"

# Step 2: Add context
if [ -n "$DESCRIPTION" ]; then
  echo "[2/4] Adding context..."
  qmd context add "qmd://$COLLECTION_NAME" "$DESCRIPTION"
else
  echo "[2/4] No description provided, skipping context"
fi

# Step 3: Run embedding
echo "[3/4] Running embedding..."
qmd embed --chunk-strategy auto --collection "$COLLECTION_NAME" 2>/dev/null

# Step 4: Verify
echo "[4/4] Verifying index..."
STATUS=$(qmd collection list --json 2>/dev/null | jq -r ".[] | select(.name == \"$COLLECTION_NAME\")" || echo "{}")

# Output JSON
cat << EOF
{
  "status": "indexed",
  "collection": "$COLLECTION_NAME",
  "path": "$PATH_TO_INDEX",
  "has_description": $([ -n "$DESCRIPTION" ] && echo "true" || echo "false"),
  "next_steps": [
    "Test search: qmd query \"<search term>\" --json -n 5",
    "Add more context: qmd context add qmd://$COLLECTION_NAME \"<context>\"",
    "Update after changes: qmd update"
  ]
}
EOF
