#!/usr/bin/env bash
# scaffold.sh — Create Drizzle ORM schema for a new project
# Usage: scaffold.sh <project-dir>
# Output: JSON with created files

set -euo pipefail

PROJECT_DIR="${1:?Usage: scaffold.sh <project-dir>}"

echo "=== Database Schema Setup ==="
echo "Project: $PROJECT_DIR"
echo ""

# Check if project exists
if [ ! -d "$PROJECT_DIR" ]; then
  echo "Error: Project directory not found: $PROJECT_DIR"
  exit 1
fi

cd "$PROJECT_DIR"

# Step 1: Install dependencies
echo "[1/4] Installing Drizzle ORM..."
bun add drizzle-orm postgres
bun add -D drizzle-kit

# Step 2: Create schema directory
echo "[2/4] Creating schema directory..."
mkdir -p src/lib/server/db

# Step 3: Create schema.ts
echo "[3/4] Creating schema.ts..."
cat > src/lib/server/db/schema.ts << 'EOF'
import { sql } from 'drizzle-orm';
import { pgTable, serial, text, timestamp, integer, uuid, check } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Users table
export const users = pgTable('users', {
  id: uuid().defaultRandom().primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  createdAt: timestamp('created_at').defaultNow()
}, (table) => [
  // Check constraint example
  check('name_not_empty', sql`length(${table.name}) > 0`)
]);

export const usersRelations = relations(users, ({ many }) => ({
  // Add relations here
}));
EOF

# Step 4: Create drizzle.config.ts
echo "[4/4] Creating drizzle.config.ts..."
cat > drizzle.config.ts << 'EOF'
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/lib/server/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!
  }
});
EOF

# Add scripts to package.json if it exists
if [ -f "package.json" ]; then
  echo "Adding db scripts to package.json..."
  cat package.json | jq '.scripts += {"db:generate": "drizzle-kit generate", "db:migrate": "drizzle-kit migrate", "db:push": "drizzle-kit push", "db:studio": "drizzle-kit studio"}' > package.json.tmp
  mv package.json.tmp package.json
fi

# Output JSON
cat << EOF
{
  "status": "created",
  "files": [
    "src/lib/server/db/schema.ts",
    "drizzle.config.ts"
  ],
  "dependencies": {
    "drizzle-orm": "latest",
    "drizzle-kit": "latest"
  },
  "next_steps": [
    "Configure DATABASE_URL in .env",
    "Define your tables in schema.ts",
    "Run 'bun run db:generate' to generate migrations",
    "Run 'bun run db:migrate' to apply migrations"
  ]
}
EOF
