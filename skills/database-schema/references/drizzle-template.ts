// Drizzle ORM Schema Template

import { sql } from 'drizzle-orm';
import {
  pgTable,
  serial,
  text,
  timestamp,
  integer,
  boolean,
  numeric,
  uuid,
  index,
  uniqueIndex,
  check,
  unique,
  foreignKey
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ============================================
// Users
// ============================================

export const users = pgTable('users', {
  id: uuid().defaultRandom().primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  emailVerified: boolean('email_verified').default(false),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

export const usersRelations = relations(users, ({ many }) => ({
  posts: many(posts),
  comments: many(comments)
}));

// ============================================
// Posts
// ============================================

export const posts = pgTable('posts', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  slug: text('slug').notNull().unique(),
  content: text('content'),
  published: boolean('published').default(false),
  authorId: uuid('author_id').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
}, (table) => ({
  authorIdx: index('posts_author_idx').on(table.authorId),
  slugIdx: uniqueIndex('posts_slug_idx').on(table.slug)
}));

export const postsRelations = relations(posts, ({ one, many }) => ({
  author: one(users, {
    fields: [posts.authorId],
    references: [users.id]
  }),
  comments: many(comments)
}));

// ============================================
// Comments
// ============================================

export const comments = pgTable('comments', {
  id: serial('id').primaryKey(),
  content: text('content').notNull(),
  authorId: uuid('author_id').references(() => users.id),
  postId: integer('post_id').references(() => posts.id),
  createdAt: timestamp('created_at').defaultNow()
}, (table) => ({
  authorIdx: index('comments_author_idx').on(table.authorId),
  postIdx: index('comments_post_idx').on(table.postId)
}));

export const commentsRelations = relations(comments, ({ one }) => ({
  author: one(users, {
    fields: [comments.authorId],
    references: [users.id]
  }),
  post: one(posts, {
    fields: [comments.postId],
    references: [posts.id]
  })
}));

// ============================================
// Check Constraints Example
// ============================================

import { pgEnum } from 'drizzle-orm/pg-core';

export const statusEnum = pgEnum('status', ['active', 'inactive', 'pending']);

export const orders = pgTable('orders', {
  id: serial('id').primaryKey(),
  total: numeric('total', { precision: 10, scale: 2 }).notNull(),
  status: statusEnum('status').default('pending'),
  userId: uuid('user_id').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow()
}, (table) => [
  // Check constraint using sql template literal
  check('total_positive', sql`${table.total} > 0`)
]);
