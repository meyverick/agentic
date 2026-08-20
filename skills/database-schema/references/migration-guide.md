# Drizzle Migration Guide

## Setup

```bash
bun add drizzle-orm postgres
bun add -D drizzle-kit
```

## Configuration

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

## Commands

| Command | Purpose |
|---------|---------|
| `bun run db:generate` | Generate migration files |
| `bun run db:migrate` | Apply pending migrations |
| `bun run db:push` | Push schema directly (dev) |
| `bun run db:studio` | Open Drizzle Studio |

## Workflow

### Development

```bash
# 1. Modify schema.ts
# 2. Generate migration
bun run db:generate

# 3. Apply migration
bun run db:migrate

# Or push directly (skips migration files)
bun run db:push
```

### Production

```bash
# 1. Generate migration
bun run db:generate

# 2. Commit migration files

# 3. In production
bun run db:migrate
```

## Migration Files

Generated in `./drizzle/`:

```
drizzle/
├── 0000_initial.sql
├── 0001_add_posts.sql
├── meta/
│   └── _journal.json
└── ...
```

## Best Practices

- **Never edit migration files manually** — regenerate from schema
- **Use `db:push` only in development** — production should use migrations
- **Test migrations locally** before deploying
- **Keep migration files in version control**

## Common Patterns

### Adding a Column

```typescript
// 1. Add to schema
export const users = pgTable('users', {
  // ... existing columns
  phone: text('phone')
});

// 2. Generate migration
bun run db:generate

// 3. Apply
bun run db:migrate
```

### Adding an Index

```typescript
// 1. Add index to table
export const users = pgTable('users', {
  // ...
}, (table) => ({
  emailIdx: index('email_idx').on(table.email)
}));

// 2. Generate and apply
bun run db:generate && bun run db:migrate
```

### Renaming a Column

```typescript
// 1. Add new column
// 2. Migrate data
// 3. Remove old column
// (Multiple migrations needed)
```

## Troubleshooting

### "Relation does not exist"

- Check table name in schema matches database
- Ensure migrations have been applied

### "Column already exists"

- Migration already applied
- Skip or manually fix database state

### "Type mismatch"

- Check column types in schema
- Regenerate migration if schema changed
