---
name: database-schema
description: Design Drizzle ORM schemas for PostgreSQL. Use when creating database tables, defining relationships, setting up migrations, or managing PostgreSQL schemas.
version: "1.0.0"
license: MIT
metadata:
  author: agentic
---

# Database Schema

Design Drizzle ORM schemas for PostgreSQL.

## Quick Start

When you need to design a database schema:

1. Define tables with `pgTable`
2. Set up relationships with `relations()`
3. Add indexes for performance
4. Generate migrations with `drizzle-kit`

## Workflow

### Step 1: Set Up Drizzle

```bash
bun add drizzle-orm postgres
bun add -D drizzle-kit
```

### Step 2: Create Schema

Create `src/lib/server/db/schema.ts`:

```typescript
import { pgTable, serial, text, timestamp, integer } from 'drizzle-orm/pg-core';

// Users table
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  createdAt: timestamp('created_at').defaultNow()
});

// Posts table with foreign key
export const posts = pgTable('posts', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  content: text('content'),
  authorId: integer('author_id').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow()
});
```

### Step 3: Define Relationships

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

### Step 4: Add Indexes

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

### Step 5: Configure Drizzle Kit

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

### Step 6: Generate Migrations

```bash
# Generate migration files
bun run db:generate

# Apply migrations
bun run db:migrate

# Push schema directly (development)
bun run db:push
```

### Step 7: Query Database

```typescript
import { db } from './server/db';
import { users, posts } from './server/db/schema';

// Select all users
const allUsers = await db.select().from(users);

// Insert user
await db.insert(users).values({
  name: 'John',
  email: 'john@example.com'
});

// Join users and posts
const postsWithAuthors = await db
  .select()
  .from(posts)
  .innerJoin(users, eq(posts.authorId, users.id));
```

## Gotchas

- **Use `pgTable`** for PostgreSQL tables (not `sqliteTable`)
- **Relations defined with `relations()`** — separate from table definition
- **Migrations via `drizzle-kit generate`** — don't edit migration files manually
- **Indexes for frequently queried columns** — especially foreign keys
- **TypeScript types auto-generated** — don't manually define types

## Common Patterns

### Soft Delete

```typescript
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  deletedAt: timestamp('deleted_at')
});

// Query with soft delete
const activeUsers = await db
  .select()
  .from(users)
  .where(isNull(users.deletedAt));
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
