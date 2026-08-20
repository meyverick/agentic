#!/usr/bin/env bash
# compute-benchmark.sh — Aggregate eval results into benchmark.json
# Usage: compute-benchmark.sh <eval-dir>
# Output: JSON with pass rates, timing stats, comparison

set -euo pipefail

EVAL_DIR="${1:?Usage: compute-benchmark.sh <eval-dir>}"

if [[ ! -d "$EVAL_DIR" ]]; then
  echo '{"error": "Eval directory not found", "path": "'"$EVAL_DIR"'"}' >&2
  exit 1
fi

# Collect grading files
GRADING_FILES=$(find "$EVAL_DIR" -name "grading.json" -type f 2>/dev/null || true)
TIMING_FILES=$(find "$EVAL_DIR" -name "timing.json" -type f 2>/dev/null || true)

if [[ -z "$GRADING_FILES" ]]; then
  echo '{"error": "No grading.json files found in eval directory", "path": "'"$EVAL_DIR"'"}' >&2
  exit 1
fi

# Aggregate pass rates
TOTAL_PASS=0
TOTAL_ASSERTIONS=0
EVAL_COUNT=0

while IFS= read -r file; do
  if [[ -n "$file" ]]; then
    PASS=$(jq -r '.summary.pass // 0' "$file" 2>/dev/null || echo 0)
    TOTAL=$(jq -r '.summary.total // 0' "$file" 2>/dev/null || echo 0)
    TOTAL_PASS=$((TOTAL_PASS + PASS))
    TOTAL_ASSERTIONS=$((TOTAL_ASSERTIONS + TOTAL))
    EVAL_COUNT=$((EVAL_COUNT + 1))
  fi
done <<< "$GRADING_FILES"

# Aggregate timing
TOTAL_TOKENS=0
TOTAL_DURATION_MS=0
TIMING_COUNT=0

while IFS= read -r file; do
  if [[ -n "$file" ]]; then
    TOKENS=$(jq -r '.total_tokens // 0' "$file" 2>/dev/null || echo 0)
    DURATION=$(jq -r '.duration_ms // 0' "$file" 2>/dev/null || echo 0)
    TOTAL_TOKENS=$((TOTAL_TOKENS + TOKENS))
    TOTAL_DURATION_MS=$((TOTAL_DURATION_MS + DURATION))
    TIMING_COUNT=$((TIMING_COUNT + 1))
  fi
done <<< "$TIMING_FILES"

# Compute averages
if [[ $EVAL_COUNT -gt 0 ]]; then
  PASS_RATE=$(echo "scale=4; $TOTAL_PASS / $TOTAL_ASSERTIONS" | bc 2>/dev/null || echo "0")
else
  PASS_RATE="0"
fi

if [[ $TIMING_COUNT -gt 0 ]]; then
  AVG_TOKENS=$((TOTAL_TOKENS / TIMING_COUNT))
  AVG_DURATION_MS=$((TOTAL_DURATION_MS / TIMING_COUNT))
else
  AVG_TOKENS=0
  AVG_DURATION_MS=0
fi

cat << EOF
{
  "evals": {
    "count": $EVAL_COUNT,
    "total_assertions": $TOTAL_ASSERTIONS,
    "total_pass": $TOTAL_PASS,
    "pass_rate": $PASS_RATE
  },
  "timing": {
    "count": $TIMING_COUNT,
    "total_tokens": $TOTAL_TOKENS,
    "total_duration_ms": $TOTAL_DURATION_MS,
    "avg_tokens": $AVG_TOKENS,
    "avg_duration_ms": $AVG_DURATION_MS
  },
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
EOF
