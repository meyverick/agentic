---
name: sveltekit-setup
description: Scaffold SvelteKit projects with svelte-adapter-bun, Tailwind CSS v4, and Drizzle ORM. Use when creating new SvelteKit projects for the workspace.
version: "1.0.0"
license: MIT
metadata:
  author: agentic
---

# SvelteKit Setup

Scaffold SvelteKit projects with the standard tech stack.

## Quick Start

When you need to create a new SvelteKit project:

1. Run `npx sv create <project-name>`
2. Configure svelte-adapter-bun
3. Set up Tailwind CSS v4
4. Configure Drizzle ORM
5. Create Dockerfile

## Workflow

### Step 1: Scaffold Project

```bash
npx sv create <project-name>
cd <project-name>
```

**IMPORTANT**: Use `npx sv create`, NOT `bun init`.

### Step 2: Configure svelte-adapter-bun

```bash
bun add -D @sveltejs/adapter-bun
```

Update `svelte.config.js`:

```javascript
import adapter from '@sveltejs/adapter-bun';

export default {
  kit: {
    adapter: adapter()
  }
};
```

### Step 3: Set Up Tailwind CSS v4

```bash
bun add -D tailwindcss @tailwindcss/vite
```

Update `vite.config.ts`:

```typescript
import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [tailwindcss(), sveltekit()]
});
```

Add to `src/app.css`:

```css
@import "tailwindcss";
```

### Step 4: Configure Drizzle ORM

```bash
bun add drizzle-orm postgres
bun add -D drizzle-kit
```

Create `src/lib/server/db/schema.ts`:

```typescript
import { pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  createdAt: timestamp('created_at').defaultNow()
});
```

Create `drizzle.config.ts`:

```typescript
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/lib/server/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!
  }
});
```

### Step 5: Create Dockerfile

```dockerfile
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
```

### Step 6: Configure package.json scripts

```json
{
  "scripts": {
    "dev": "vite dev",
    "build": "vite build",
    "preview": "vite preview",
    "check": "svelte-kit sync && svelte-check --tsconfig ./tsconfig.json",
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate",
    "db:push": "drizzle-kit push"
  }
}
```

## Gotchas

- **Use `npx sv create`**, not `bun init` — `bun init` in workspace copies reference files
- **Tailwind CSS v4** uses `@tailwindcss/vite` plugin, not PostCSS
- **Drizzle schema** goes in `src/lib/server/db/schema.ts`
- **Dockerfile** uses multi-stage build → distroless base
- **Bun runtime** requires `adapter-bun`, not `adapter-node`

## Tech Stack

| Component | Technology |
|-----------|------------|
| Framework | SvelteKit |
| Runtime | Bun |
| Styling | Tailwind CSS v4 |
| Database | PostgreSQL via Drizzle ORM |
| Container | oven/bun:distroless |

## Reference Files

- `references/tech-stack.md` — Full tech stack details
- `references/dockerfile-template.md` — Dockerfile example
