#!/usr/bin/env bash
# Synchronizes ./wiki/ (and ./modules/*/wiki/) to GitHub Wiki ONLY IF the target repository is public.
# Usage: .agents/skills/okf-docs/scripts/sync-wiki.sh [target-repo-dir]
set -euo pipefail

TARGET_DIR="${1:-.}"
cd "$TARGET_DIR"

if [ ! -d "wiki" ]; then
    echo "FAIL: missing tracked ./wiki directory in $(pwd)"
    exit 1
fi

if ! command -v gh >/dev/null 2>&1; then
    echo "SKIP: GitHub CLI (gh) not installed; local ./wiki verified, remote sync skipped"
    exit 0
fi

# Resolve GitHub repository slug (owner/name) from git remote
REMOTE_URL="$(git config --get remote.origin.url || true)"
if [ -z "$REMOTE_URL" ]; then
    echo "SKIP: no remote.origin.url configured in $(pwd)"
    exit 0
fi

REPO_SLUG="$(echo "$REMOTE_URL" | sed -E 's#^.*github\.com[:/]([^/]+/[^/.]+)(\.git)?$#\1#')"
if [ -z "$REPO_SLUG" ] || [ "$REPO_SLUG" = "$REMOTE_URL" ]; then
    echo "SKIP: remote origin is not a GitHub repository ($REMOTE_URL)"
    exit 0
fi

# 1. Strict Public-Only Guardrail Check
IS_PRIVATE="$(gh repo view "$REPO_SLUG" --json isPrivate -q '.isPrivate' 2>/dev/null || echo "unknown")"
if [ "$IS_PRIVATE" != "false" ]; then
    echo "SKIP [$REPO_SLUG]: repository is private or inaccessible (isPrivate=$IS_PRIVATE). GitHub Wiki sync is strictly restricted to public repositories."
    exit 0
fi

echo "== [$REPO_SLUG] Repository is PUBLIC. Ensuring GitHub Wiki is enabled =="
gh repo edit "$REPO_SLUG" --enable-wiki=true >/dev/null 2>&1 || \
    gh api -X PATCH "repos/$REPO_SLUG" -f has_wiki=true >/dev/null 2>&1 || true

# 2. Attempt Automated Provisioning & Clone of <repo>.wiki.git
TMP_WIKI="$(mktemp -d)"
trap 'rm -rf "$TMP_WIKI"' EXIT

WIKI_REMOTE="https://github.com/${REPO_SLUG}.wiki.git"
if git clone -q "$WIKI_REMOTE" "$TMP_WIKI/wiki" 2>/dev/null; then
    echo "  cloned existing wiki repository: $WIKI_REMOTE"
else
    echo "  wiki git backend not yet initialized; attempting automated provisioning..."
    mkdir -p "$TMP_WIKI/wiki"
    (
        cd "$TMP_WIKI/wiki"
        git init -q -b master
        git remote add origin "$WIKI_REMOTE"
    )
    # Attempt automated web-endpoint seed if GH CLI token is available
    GH_TOKEN_VAL="$(gh auth token 2>/dev/null || true)"
    if [ -n "$GH_TOKEN_VAL" ]; then
        # Attempt automated seed via GitHub wiki endpoint or direct push
        curl -fsSL -X POST \
            -H "Authorization: Bearer $GH_TOKEN_VAL" \
            "https://github.com/${REPO_SLUG}/wiki" >/dev/null 2>&1 || true
    fi
fi

# 3. Synchronize ./wiki/ content into flat/navigable GitHub Wiki structure
rsync -a --delete --exclude='.git' wiki/ "$TMP_WIKI/wiki/"

# Ensure Home.md and _Sidebar.md exist for GitHub Wiki landing page and navigation (mirroring index.md if absent)
if [ -f "$TMP_WIKI/wiki/index.md" ]; then
    [ -f "$TMP_WIKI/wiki/Home.md" ] || cp "$TMP_WIKI/wiki/index.md" "$TMP_WIKI/wiki/Home.md"
    [ -f "$TMP_WIKI/wiki/_Sidebar.md" ] || cp "$TMP_WIKI/wiki/index.md" "$TMP_WIKI/wiki/_Sidebar.md"
fi

# Flatten nested subdirectories (e.g., adr/0001-init.md -> adr-0001-init.md) so GitHub Wiki routing resolves every link
find "$TMP_WIKI/wiki" -mindepth 2 -name "*.md" | while read -r subfile; do
    rel="${subfile#$TMP_WIKI/wiki/}"
    flat_name="$(echo "$rel" | tr '/' '-')"
    cp "$subfile" "$TMP_WIKI/wiki/$flat_name"
done

(
    cd "$TMP_WIKI/wiki"
    git add -A
    if git diff --cached --quiet; then
        echo "  [$REPO_SLUG] GitHub Wiki already up to date"
    else
        git commit -q -m "docs(wiki): synchronize OKF v0.2 progressive wiki"
        if git push -q -u origin HEAD:master 2>/dev/null || git push -q -u origin HEAD:main 2>/dev/null; then
            echo "  [$REPO_SLUG] GitHub Wiki synchronized successfully"
        else
            echo "WARN [$REPO_SLUG]: GitHub rejected push to unprovisioned .wiki.git backend."
            echo "     GitHub requires a one-time initial page creation at https://github.com/${REPO_SLUG}/wiki/_new"
            exit 1
        fi
    fi
)
