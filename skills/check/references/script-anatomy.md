# Canonical Check Script Anatomy

This reference document defines the standard 6-slot architecture for local pre-push gate scripts (`scripts/check.sh`) across workspace orchestrators and submodules.

---

## 1. The Two-Tier Gate Model

In monorepos and submodule workspaces, gates are divided into two complementary tiers:
1. **The Orchestrator Gate (`./scripts/check.sh`)**: Enforces workspace-level invariants (pointer synchronization and credential leaks across the entire tree) and dispatches to each module's gate.
2. **The Submodule Gate (`./<module>/scripts/check.sh`)**: Enforces language-native compilation, linting, tests, asset tracking, and clean-clone hermeticity for that specific module.

---

## 2. Workspace Orchestrator Skeleton (`./scripts/check.sh`)

The root gate coordinates all submodules and blocks credential leaks before any packet touches the network.

```bash
#!/usr/bin/env bash
# Workspace Orchestrator Push Gate
# Usage: scripts/check.sh [--quick]
set -euo pipefail

cd "$(dirname "$0")/.."
QUICK="${1:-}"

echo "== 1/3 submodule pointers =="
status="$(git submodule status || true)"
if [ -z "$status" ]; then
    echo "  (no submodules registered)"
else
    echo "$status" | sed 's/^/  /'
    if echo "$status" | grep -qE '^[+-]'; then
        echo "FAIL: submodule pointer is stale (+) or uninitialized (-)"
        echo "      commit updated pointer in orchestrator: git add <path> && git commit"
        exit 1
    fi
fi

echo "== 2/3 tracked credential scan =="
leaks="$(git ls-files | grep -iE '(^|/)(\.env|\.env\..*|.*\.pem|.*\.key|.*\.p12|id_rsa.*|.*credentials?.*)$' || true)"
if [ -n "$leaks" ]; then
    echo "$leaks" | sed 's/^/  X tracked: /'
    echo "FAIL: credential-shaped file is tracked by git"
    exit 1
fi
echo "  no credential-shaped paths tracked"

echo "== 3/3 submodule gates =="
while read -r _sha path _rest; do
    [ -n "$path" ] || continue
    if [ -x "$path/scripts/check.sh" ]; then
        echo "-- $path --"
        (cd "$path" && ./scripts/check.sh $QUICK)
    else
        echo "-- $path: no scripts/check.sh, skipping --"
    fi
done < <(git submodule status | awk '{print $1, $2}')

echo "workspace gate: OK"
```

---

## 3. Submodule Gate Skeleton (`./<module>/scripts/check.sh`)

The module gate implements the standard 6-slot pipeline with the `--quick` exit boundary.

```bash
#!/usr/bin/env bash
# Submodule Pre-Push Gate
# Usage: scripts/check.sh [--quick]
set -euo pipefail

cd "$(dirname "$0")/.."
QUICK="${1:-}"

# Slot 1: Format verification
echo "== 1/6 format =="
# Language native: cargo fmt --check | bun run format:check | gofmt -l .
cargo fmt --check

# Slot 2: Strict linting
echo "== 2/6 linter =="
# Language native: cargo clippy --all-targets -- -D warnings | eslint | ruff check .
cargo clippy --all-targets -- -D warnings

# Slot 3: Unit and integration tests
echo "== 3/6 unit tests =="
# Language native: cargo test | bun test | go test ./... | pytest
cargo test

# Slot 4: Compile-time asset tracking check
echo "== 4/6 compile-time inputs are tracked =="
# Scans source files for include_str!, include_bytes!, or //go:embed
missing=0
while IFS= read -r hit; do
    file="${hit%%:*}"
    literal="${hit#*:}"
    literal="${literal#*\"}"
    literal="${literal%%\"*}"
    case "$literal" in
    *'$'* | *'{'*) continue ;; # skip computed paths
    esac
    path="$(dirname "$file")/$literal"
    if ! git ls-files --error-unmatch -- "$path" >/dev/null 2>&1; then
        echo "  X $file needs '$path' but git does not track it"
        missing=1
    else
        echo "  ok $path"
    fi
done < <(grep -rEn 'include_(bytes|str)!\("' src/ 2>/dev/null || true)
[ "$missing" -eq 0 ] || {
    echo "FAIL: untracked compile-time build input (clean clone would fail)"
    exit 1
}

# --- Fast Loop Exit Boundary ---
if [ "$QUICK" = "--quick" ]; then
    echo "fast checks passed; clean-clone and smoke tests skipped (--quick)"
    exit 0
fi

# Slot 5: Hermetic clean-clone test
echo "== 5/6 clean-clone sandbox =="
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
git clone -q . "$tmp/clone"
(
    cd "$tmp/clone"
    # Prove that the committed tree builds and passes tests without local dirty state
    cargo build --release
    cargo test
)
echo "clean clone builds and tests: OK"

# Slot 6: Smoke / browser test
echo "== 6/6 smoke / runtime test =="
# Run binary smoke test or headless browser check if applicable
echo "smoke test: OK"

echo "lane: OK"
```

---

## 4. Invariant Rules for Check Scripts

1. **Executable bit**: Every check script must have `chmod +x` set and tracked in Git.
2. **Safe shell options**: Always start with `#!/usr/bin/env bash` and `set -euo pipefail`.
3. **Idempotent cleanup**: Always use `trap 'rm -rf "$tmp"' EXIT` when creating temporary sandbox clones.
4. **Relativity**: Always resolve paths relative to the script location: `cd "$(dirname "$0")/.."`.
5. **Universal `--quick` parameter**: Every check script must accept `--quick` as its first argument and forward it to nested submodule invocations.
