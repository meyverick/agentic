#!/usr/bin/env bash
# scaffold.sh — Add a new git submodule to the workspace
# Usage: scaffold.sh <module-name> [parent-dir] [remote-url]
# Output: JSON with created path

set -euo pipefail

MODULE_NAME="${1:?Usage: scaffold.sh <module-name> [parent-dir] [remote-url]}"
PARENT_DIR="${2:-.}"
REMOTE_URL="${3:-}"

MODULE_DIR="$PARENT_DIR/$MODULE_NAME"

echo "=== Git Submodule Add ==="
echo "Module: $MODULE_NAME"
echo "Parent: $PARENT_DIR"
echo ""

# Step 1: Create module directory
echo "[1/4] Creating module directory..."
mkdir -p "$MODULE_DIR"
cd "$MODULE_DIR"

# Step 2: Initialize git
echo "[2/4] Initializing git repository..."
git init

# Create initial files
cat > README.md << EOF
# $MODULE_NAME

Module for the workspace.
EOF

cat > .gitignore << 'EOF'
# Dependencies
node_modules/
target/

# Build outputs
build/
dist/
out/

# Environment
.env
.env.local

# IDE
.vscode/
.idea/
*.swp
*~

# OS
.DS_Store
Thumbs.db

# Logs
*.log
EOF

git add .
git commit -m "Initial commit"

# Step 3: Create remote (if URL provided)
if [ -n "$REMOTE_URL" ]; then
    echo "[3/4] Adding remote..."
    git remote add origin "$REMOTE_URL"
    git push -u origin main
else
    echo "[3/4] No remote URL provided, skipping remote setup"
fi

# Step 4: Add as submodule to parent
echo "[4/4] Adding as submodule to parent..."
cd "$PARENT_DIR"
if [ -d ".git" ]; then
    git submodule add "file://$MODULE_DIR" "$MODULE_NAME" 2>/dev/null || true
    echo "Note: Add remote URL manually with 'git submodule add <remote-url> $MODULE_NAME'"
else
    echo "Note: Parent directory is not a git repository. Submodule not added."
fi

# Output JSON
cat << EOF
{
  "status": "created",
  "path": "$MODULE_DIR",
  "module_name": "$MODULE_NAME",
  "has_remote": $([ -n "$REMOTE_URL" ] && echo "true" || echo "false"),
  "next_steps": [
    "Add remote: git remote add origin <url>",
    "Push to remote: git push -u origin main",
    "Add submodule to parent: git submodule add <url> $MODULE_NAME"
  ]
}
EOF
