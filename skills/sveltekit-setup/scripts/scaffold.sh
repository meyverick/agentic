#!/usr/bin/env bash
# scaffold.sh — Scaffold a new SvelteKit project with standard tech stack
# Usage: scaffold.sh <project-name> [directory]
# Output: JSON with created path

set -euo pipefail

PROJECT_NAME="${1:?Usage: scaffold.sh <project-name> [directory]}"
DIRECTORY="${2:-.}"

echo "=== SvelteKit Setup ==="
echo "Project: $PROJECT_NAME"
echo "Directory: $DIRECTORY"
echo ""

# Step 1: Scaffold project
echo "[1/5] Scaffolding SvelteKit project..."
npx sv create "$DIRECTORY/$PROJECT_NAME" --template minimal --types typescript
cd "$DIRECTORY/$PROJECT_NAME"

# Step 2: Configure adapter-bun
echo "[2/5] Configuring svelte-adapter-bun..."
bun add -D @sveltejs/adapter-bun

# Step 3: Set up Tailwind CSS v4
echo "[3/5] Setting up Tailwind CSS v4..."
bun add -D tailwindcss @tailwindcss/vite

# Step 4: Configure Drizzle ORM
echo "[4/5] Configuring Drizzle ORM..."
bun add drizzle-orm postgres
bun add -D drizzle-kit

# Step 5: Create Dockerfile
echo "[5/5] Creating Dockerfile..."
cat > Dockerfile << 'EOF'
# Build stage
FROM oven/bun:latest AS builder
WORKDIR /app
COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile
COPY . .
RUN bun run build

# Production stage
FROM oven/bun:distroless
WORKDIR /app
COPY --from=builder /app/build ./build
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
EXPOSE 3000
CMD ["bun", "run", "build"]
EOF

# Output JSON
cat << EOF
{
  "status": "created",
  "path": "$DIRECTORY/$PROJECT_NAME",
  "tech_stack": {
    "framework": "SvelteKit",
    "runtime": "Bun",
    "styling": "Tailwind CSS v4",
    "database": "PostgreSQL + Drizzle ORM",
    "container": "oven/bun:distroless"
  },
  "next_steps": [
    "Configure database connection in .env",
    "Run 'bun run db:generate' to generate migrations",
    "Run 'bun run dev' to start development server"
  ]
}
EOF
