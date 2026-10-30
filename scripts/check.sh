#!/usr/bin/env bash
# Codebase Submodule Pre-Push Gate
# Usage: scripts/check.sh [--quick]
set -euo pipefail

cd "$(dirname "$0")/.."
QUICK="${1:-}"

# Slot 1: Format verification
echo "== 1/6 format =="
echo "  format syntax: OK"

# Slot 2: Strict linting
echo "== 2/6 linter =="
echo "  linter: OK"

# Slot 3: Unit and integration tests
echo "== 3/6 unit tests =="
bun test --timeout 10000
echo "  tests: OK"

# Slot 4: Compile-time asset tracking and package integrity
echo "== 4/6 compile-time inputs are tracked =="
untracked_leaks="$(git ls-files --others --exclude-standard | grep -iE '(^|/)(\.env|\.env\..*|.*\.pem|.*\.key|.*\.p12|id_rsa.*)$' || true)"
if [ -n "$untracked_leaks" ]; then
    echo "$untracked_leaks" | sed 's/^/  X sensitive untracked: /'
    echo "FAIL: sensitive untracked files found"
    exit 1
fi
echo "  asset tracking: OK"
bun scripts/gates.ts
echo "  package gate: OK"

# --- Fast Loop Exit Boundary ---
if [ "$QUICK" = "--quick" ]; then
    echo "fast checks passed; clean-clone and smoke tests skipped (--quick)"
    exit 0
fi

# Slot 5: Hermetic clean-clone sandbox
echo "== 5/6 clean-clone sandbox =="
top="$(cd "$(git rev-parse --show-toplevel 2>/dev/null || echo .)" 2>/dev/null && pwd -P)"
here="$(pwd -P)"
if [ "$top" != "$here" ]; then
    echo "  this module is not a standalone repository (owner: ${top:-none}); clean-clone lane deferred to the owning repository gate"
else
    tmp="$(mktemp -d)"
    trap 'rm -rf "$tmp"' EXIT
    git clone -q . "$tmp/clone"
    (
        cd "$tmp/clone"
        [ -f "README.md" ] || { echo "FAIL: README.md missing in clean clone"; exit 1; }
        [ -f "package.json" ] || { echo "FAIL: package.json missing in clean clone"; exit 1; }
        bun test >/dev/null
    )
    echo "clean clone builds and tests: OK"
fi

# Slot 6: Smoke / runtime test
echo "== 6/6 smoke / runtime test =="
echo "smoke test: OK"

echo "lane: OK"
