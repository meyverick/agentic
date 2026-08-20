#!/usr/bin/env bash
# analyze.sh — Analyze impact of modifying an entity
# Usage: analyze.sh <entity> [depth]
# Output: JSON with impact analysis

set -euo pipefail

ENTITY="${1:?Usage: analyze.sh <entity> [depth]}"
DEPTH="${2:-}"

echo "=== Sem Impact Analysis ==="
echo "Entity: $ENTITY"
echo ""

# Build command
CMD="sem impact $ENTITY --json"
if [ -n "$DEPTH" ]; then
  CMD="$CMD --depth $DEPTH"
fi

# Run impact analysis
echo "[1/3] Running impact analysis..."
IMPACT=$($CMD 2>/dev/null || echo '{"error": "sem not available or entity not found"}')

# Parse results
echo "[2/3] Parsing results..."
DIRECT_DEPS=$(echo "$IMPACT" | jq -r '.directDependencies | length // 0')
TRANSITIVE_DEPS=$(echo "$IMPACT" | jq -r '.transitiveDependencies | length // 0')
DEPENDENTS=$(echo "$IMPACT" | jq -r '.dependents | length // 0')
AFFECTED_MODULES=$(echo "$IMPACT" | jq -r '.affectedModules | length // 0')

# Calculate blast radius
BLAST_RADIUS=$((DIRECT_DEPS + TRANSITIVE_DEPS + DEPENDENTS))

# Determine risk level
if [ "$BLAST_RADIUS" -le 3 ]; then
  RISK="low"
  STRATEGY="Direct modification with testing"
elif [ "$BLAST_RADIUS" -le 10 ]; then
  RISK="medium"
  STRATEGY="Feature flag + incremental rollout"
else
  RISK="high"
  STRATEGY="Refactor + deprecation + migration"
fi

# Output JSON
echo "[3/3] Generating report..."
cat << EOF
{
  "entity": "$ENTITY",
  "impact": {
    "direct_dependencies": $DIRECT_DEPS,
    "transitive_dependencies": $TRANSITIVE_DEPS,
    "dependents": $DEPENDENTS,
    "affected_modules": $AFFECTED_MODULES,
    "blast_radius": $BLAST_RADIUS
  },
  "risk_level": "$RISK",
  "recommended_strategy": "$STRATEGY",
  "details": $IMPACT
}
EOF
