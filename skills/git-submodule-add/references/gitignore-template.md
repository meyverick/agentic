# Gitignore Templates

## Node.js / SvelteKit

```gitignore
# Dependencies
node_modules/
.pnpm-store/

# Build outputs
build/
dist/
.svelte-kit/

# Environment
.env
.env.local
.env.*.local

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Logs
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Testing
coverage/

# Misc
*.local
```

## Rust

```gitignore
# Build outputs
target/
Cargo.lock

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Logs
*.log

# Misc
*.local
```

## Docker

```gitignore
# Docker
docker-compose.override.yml

# Environment
.env
.env.local

# Build context
.git
.gitignore
README.md
LICENSE
```

## Universal

```gitignore
# Dependencies
node_modules/
target/
vendor/

# Build outputs
build/
dist/
out/

# Environment
.env
.env.local
.env.*.local

# IDE
.vscode/
.idea/
*.swp
*.swo
*~

# OS
.DS_Store
Thumbs.db

# Logs
*.log
*.log.*

# Test coverage
coverage/
.nyc_output/

# Misc
*.local
```
