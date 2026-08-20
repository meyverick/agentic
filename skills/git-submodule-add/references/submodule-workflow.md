# Git Submodule Workflow

## Complete Workflow

### 1. Create Module

```bash
# Create directory
mkdir -p <project_name>-<module_name>

# Initialize git
cd <project_name>-<module_name>
git init

# Create initial files
cat > README.md << EOF
# <module_name>

<description>
EOF

cat > .gitignore << EOF
node_modules/
target/
dist/
build/
.env
.env.local
.vscode/
.idea/
.DS_Store
EOF

# Initial commit
git add .
git commit -m "Initial commit"
```

### 2. Create Remote Repository

```bash
# GitHub CLI
gh repo create <org>/<project_name>-<module_name> --private --source=. --push

# Or manual
git remote add origin git@github.com:<org>/<project_name>-<module_name>.git
git push -u origin main
```

### 3. Add to Parent

```bash
# From parent directory
git submodule add git@github.com:<org>/<project_name>-<module_name>.git <project_name>-<module_name>

# Commit submodule reference
git add .gitmodules <project_name>-<module_name>
git commit -m "Add <module_name> submodule"
```

### 4. Clone with Submodules

```bash
# Clone with submodules
git clone --recurse-submodules <parent-repo>

# Or after clone
git submodule update --init --recursive
```

## Common Operations

### Update All Submodules

```bash
git submodule update --remote --merge
git add .
git commit -m "Update all submodules"
```

### Update Single Submodule

```bash
cd <module-path>
git pull origin main
cd ..
git add <module-path>
git commit -m "Update <module>"
```

### Remove Submodule

```bash
git submodule deinit -f <module-path>
git rm -f <module-path>
rm -rf .git/modules/<module-path>
```

## Best Practices

- Use SSH URLs for private repos
- Keep .gitignore in each module
- Document module purpose in README.md
- Pin submodule to specific commit (don't use --remote in CI)
- Test each module independently before adding
