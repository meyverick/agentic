---
name: database-schema
description: Design Drizzle ORM schemas for PostgreSQL. Use when creating database tables, defining relationships, setting up migrations, or managing PostgreSQL schemas with TypeScript type safety.
version: "1.0.0"
license: MIT
metadata:
  author: agentic
---

# Database Schema

Design Drizzle ORM schemas for PostgreSQL with type safety and automated migrations.

## Quick Start

When you need to design a database schema:

1. Define tables with `pgTable`
2. Set up relationships with `relations()`
3. Add constraints (check, unique, foreign key)
4. Generate migrations with `drizzle-kit`
5. Validate with `drizzle-kit check`

## Workflow

### Step 1: Set Up Drizzle

```bash
bun add drizzle-orm postgres
bun add -D drizzle-kit
```

### Step 2: Create Schema

Create `src/lib/server/db/schema.ts`:

```typescript
import { sql } from 'drizzle-orm';
import { pgTable, serial, text, timestamp, integer, uuid, check } from 'drizzle-orm/pg-core';

// Users table
export const users = pgTable('users', {
  id: uuid().defaultRandom().primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  age: integer('age'),
  createdAt: timestamp('created_at').defaultNow()
}, (table) => [
  // Check constraint using sql template literal
  check('age_check', sql`${table.age} > 0 AND ${table.age} < 150`)
]);
```

### Step 3: Add Constraints

```typescript
import { sql } from 'drizzle-orm';
import { check, unique, foreignKey } from 'drizzle-orm/pg-core';

// Check constraint (uses sql template literal)
check('age_check', sql`${table.age} > 21`)

// Unique constraint
unique('custom_name').on(table.id, table.name)

// Foreign key
foreignKey({
  columns: [table.userId],
  foreignColumns: [users.id]
})
```

### Step 4: Define Relationships

```typescript
import { relations } from 'drizzle-orm';

export const usersRelations = relations(users, ({ many }) => ({
  posts: many(posts)
}));

export const postsRelations = relations(posts, ({ one }) => ({
  author: one(users, {
    fields: [posts.authorId],
    references: [users.id]
  })
}));
```

### Step 5: Add Indexes

```typescript
import { index } from 'drizzle-orm/pg-core';

export const posts = pgTable('posts', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  authorId: integer('author_id').references(() => users.id)
}, (table) => ({
  authorIdx: index('author_idx').on(table.authorId)
}));
```

### Step 6: Configure Drizzle Kit

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

### Step 7: Generate Migrations

```bash
# Generate migration files
bun run db:generate

# Apply migrations
bun run db:migrate

# Push schema directly (development)
bun run db:push
```

### Step 8: Validate

```bash
# Always run after generate
npx drizzle-kit check

# TypeScript compilation
npx tsc --noEmit
```

### Step 9: Connection Pool

```typescript
// src/lib/server/db/pool.ts
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

const connectionString = process.env.DATABASE_URL!;
const poolMax = parseInt(process.env.DB_POOL_MAX || '10');
const idleTimeout = parseInt(process.env.DB_IDLE_TIMEOUT || '30');

const client = postgres(connectionString, {
  max: poolMax,           // Use `max` not `min`
  idle_timeout: idleTimeout  // In seconds, not milliseconds
});

export const db = drizzle(client);

export async function closeDb() {
  await client.end();
}
```

## Gotchas

- **check() constraint API**: Uses `sql` template literal, not `(name, column, options)`
  ```typescript
  // ✗ Wrong
  check('age_check', table.age, { min: 0 })
  
  // ✓ Correct
  check('age_check', sql`${table.age} > 0`)
  ```

- **postgres-js pool options**: Use `max` not `min`, `idle_timeout` in seconds
  ```typescript
  // ✗ Wrong
  postgres(url, { min: 1, idle_timeout: 30000 })
  
  // ✓ Correct
  postgres(url, { max: 10, idle_timeout: 30 })
  ```

- **sql import**: Import from `drizzle-orm`, not `drizzle-orm/pg-core`
  ```typescript
  // ✗ Wrong
  import { sql } from 'drizzle-orm/pg-core';
  
  // ✓ Correct
  import { sql } from 'drizzle-orm';
  ```

- **Version compatibility**: Check drizzle-orm and drizzle-kit versions before writing schema
- **Migration validation**: Always run `drizzle-kit check` after `drizzle-kit generate`

## Common Patterns

### Soft Delete

```typescript
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  deletedAt: timestamp('deleted_at')
});
```

### Timestamps

```typescript
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});
```

### Enums

```typescript
import { pgEnum } from 'drizzle-orm/pg-core';

export const statusEnum = pgEnum('status', ['active', 'inactive', 'pending']);

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  status: statusEnum('status').default('active')
});
```

## Reference Files

- `references/drizzle-template.ts` — Full schema template
- `references/migration-guide.md` — Migration workflow
- `references/indexes-constraints.md` — Check constraint syntax, pool config
- `references/drizzle-orm/` — Drizzle ORM source with changelogs
