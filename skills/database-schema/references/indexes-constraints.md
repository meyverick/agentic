# Drizzle ORM - Indexes & Constraints

## Constraints

### Default

```typescript
import { sql } from "drizzle-orm";
import { integer, uuid, pgTable } from "drizzle-orm/pg-core";

export const table = pgTable('table', {
  integer1: integer().default(42),
  integer2: integer().default(sql`24`),
  uuid1: uuid().defaultRandom(),
  uuid2: uuid().default(sql`gen_random_uuid()`),
});
```

### Not Null

```typescript
import { integer, pgTable } from "drizzle-orm/pg-core";

export const table = pgTable('table', {
  integer: integer().notNull(),
});
```

### Unique

```typescript
import { integer, text, unique, pgTable } from "drizzle-orm/pg-core";

// Single column unique
export const user = pgTable('user', {
  id: integer().unique(),
});

// Named unique
export const table = pgTable('table', {
  id: integer().unique('custom_name'),
});

// Composite unique
export const composite = pgTable('composite_example', {
  id: integer(),
  name: text(),
}, (t) => [
  unique().on(t.id, t.name),
  unique('custom_name').on(t.id, t.name)
]);
```

### Primary Key

```typescript
import { serial, pgTable } from "drizzle-orm/pg-core";

export const table = pgTable('table', {
  id: serial('id').primaryKey(),
});
```

### Foreign Key

```typescript
import { integer, pgTable, foreignKey } from "drizzle-orm/pg-core";

export const orders = pgTable('orders', {
  id: integer('id').primaryKey(),
  userId: integer('user_id'),
}, (t) => [
  foreignKey({
    columns: [t.userId],
    foreignColumns: [users.id]
  })
]);
```

### Check (IMPORTANT - uses sql template literal)

```typescript
import { sql } from "drizzle-orm";
import { check, integer, pgTable, text, uuid } from "drizzle-orm/pg-core";

export const users = pgTable(
  "users",
  {
    id: uuid().defaultRandom().primaryKey(),
    username: text().notNull(),
    age: integer(),
  },
  (table) => [
    check("age_check1", sql`${table.age} > 21`),
    check("age_check2", sql`${table.age} > 0 AND ${table.age} < 150`),
  ]
);
```

**IMPORTANT**: Check constraints use `sql` template literal, NOT `(name, column, options)`.

## Indexes

```typescript
import { index, uniqueIndex, pgTable, integer, text } from "drizzle-orm/pg-core";

export const table = pgTable('table', {
  id: integer('id').primaryKey(),
  name: text('name'),
  email: text('email'),
}, (t) => ({
  // Single column index
  nameIdx: index('name_idx').on(t.name),
  
  // Unique index
  emailIdx: uniqueIndex('email_idx').on(t.email),
  
  // Composite index
  compositeIdx: index('composite_idx').on(t.name, t.email),
}));
```

## Connection Pool (postgres-js)

```typescript
import postgres from 'postgres';

const client = postgres(connectionString, {
  max: 10,              // Maximum pool size (use `max`, not `min`)
  idle_timeout: 30,     // Idle timeout in seconds (not milliseconds)
  connect_timeout: 10,  // Connection timeout in seconds
});
```

**IMPORTANT**: 
- Use `max` for pool size, not `min`
- `idle_timeout` is in seconds, not milliseconds
