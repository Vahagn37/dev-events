import { sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';
import type { EventStatus } from '@/database/event.model';
import type { UserRole } from '@/database/user.model';

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: text('role').$type<UserRole>(),
  createdAt: text('created_at').notNull(),
});

export const events = sqliteTable('events', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  slug: text('slug').notNull().unique(),
  description: text('description').notNull(),
  overview: text('overview').notNull(),
  image: text('image').notNull(),
  venue: text('venue').notNull(),
  location: text('location').notNull(),
  date: text('date').notNull(),
  time: text('time').notNull(),
  mode: text('mode').notNull(),
  audience: text('audience').notNull(),
  agenda: text('agenda', { mode: 'json' }).$type<string[]>().notNull(),
  organizer: text('organizer').notNull(),
  tags: text('tags', { mode: 'json' }).$type<string[]>().notNull(),
  userId: text('user_id'),
  status: text('status').$type<EventStatus>(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const bookings = sqliteTable(
  'bookings',
  {
    id: text('id').primaryKey(),
    eventId: text('event_id').notNull(),
    slug: text('slug').notNull(),
    email: text('email').notNull(),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => [uniqueIndex('bookings_event_email').on(table.eventId, table.email)],
);
