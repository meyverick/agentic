---
name: git-submodule-add
description: Add new git submodules to the workspace. Use when creating new modules, setting up project structure, or adding independent repositories.
version: "1.0.0"
license: MIT
metadata:
  author: agentic
---

# Git Submodule Add

Add new git submodules to the workspace.

## Quick Start

When you need to add a new module:

1. Create directory for module
2. Initialize git repository
3. Create remote repository
4. Add as git submodule to parent
5. Configure .gitignore

## Workflow

### Step 1: Create Module Directory

```bash
mkdir -p <project_name>-<module_name>
cd <project_name>-<module_name>
```

### Step 2: Initialize Git Repository

```bash
git init
git add .
git commit -m "Initial commit"
```

### Step 3: Create Remote Repository

```bash
# GitHub example
gh repo create <org>/<repo-name> --private --source=. --push

# Or manually create on GitHub/GitLab and add remote
git remote add origin git@github.com:<org>/<repo-name>.git
git push -u origin main
```

### Step 4: Add as Submodule to Parent

```bash
cd ..
git submodule add git@github.com:<org>/<repo-name>.git <project_name>-<module_name>
```

### Step 5: Configure .gitignore

Create `.gitignore` in module:

```gitignore
# Dependencies
node_modules/
target/

# Build outputs
dist/
build/
*.log

# Environment
.env
.env.local

# IDE
.vscode/
.idea/

# OS
.DS_Store
Thumbs.db
```

### Step 6: Commit Submodule Reference

```bash
git add .gitmodules <project_name>-<module_name>
git commit -m "Add <module_name> submodule"
```

## Naming Convention

```
<project_name>-<module_name>
├── warera-project/          # Parent orchestrator
├── warera-bot/              # Module: Telegram bot
├── warera-telemetry/        # Module: Telemetry
└── warera-web/              # Module: Web interface
```

## Gotchas

- **Module MUST be independently deployable**
- **No `../` traversal** between modules — network/API only
- **Communication via HTTP/gRPC/WebSocket**, not filesystem
- **Each module has own CI/CD** pipeline
- **Independent git history** preserved in submodule

## Submodule Commands

| Command | Purpose |
|---------|---------|
| `git submodule add <url> <path>` | Add new submodule |
| `git submodule update --init` | Initialize submodules |
| `git submodule update --remote` | Pull latest changes |
| `git submodule foreach <cmd>` | Run command in each submodule |
| `git submodule status` | Check submodule status |

## Updating Submodules

```bash
# Pull latest changes in all submodules
git submodule update --remote --merge

# Commit the update
git add <submodule-path>
git commit -m "Update submodule to latest"
```

## Reference Files

- `references/submodule-workflow.md` — Step-by-step workflow
- `references/gitignore-template.md` — .gitignore templates
