import { mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { count } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import type { IBooking } from '@/database/booking.model';
import type { IEvent } from '@/database/event.model';
import type { IUser } from '@/database/user.model';
import * as schema from '@/database/schema';
import { bookings, events, users } from '@/database/schema';

const dataDir = path.join(process.cwd(), 'data');
const databasePath = path.join(dataDir, 'dev.db');

const globalForDb = globalThis as typeof globalThis & {
  __sqlite?: Database.Database;
  __drizzle?: BetterSQLite3Database<typeof schema>;
  __sqliteReady?: Promise<void>;
};

const createTables = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  overview TEXT NOT NULL,
  image TEXT NOT NULL,
  venue TEXT NOT NULL,
  location TEXT NOT NULL,
  date TEXT NOT NULL,
  time TEXT NOT NULL,
  mode TEXT NOT NULL,
  audience TEXT NOT NULL,
  agenda TEXT NOT NULL,
  organizer TEXT NOT NULL,
  tags TEXT NOT NULL,
  user_id TEXT,
  status TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS bookings (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL,
  slug TEXT NOT NULL,
  email TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS bookings_event_email ON bookings (event_id, email);
`;

function open() {
  if (globalForDb.__drizzle && globalForDb.__sqlite) return globalForDb.__drizzle;
  mkdirSync(dataDir, { recursive: true });
  const sqlite = new Database(databasePath);
  sqlite.pragma('journal_mode = WAL');
  sqlite.exec(createTables);
  const database = drizzle(sqlite, { schema });
  globalForDb.__sqlite = sqlite;
  globalForDb.__drizzle = database;
  return database;
}

export function db() {
  return open();
}

export function readyDb() {
  globalForDb.__sqliteReady ??= seed().catch((error) => {
    globalForDb.__sqliteReady = undefined;
    throw error;
  });
  return globalForDb.__sqliteReady;
}

async function seed() {
  const database = open();
  const [userCount] = database.select({ value: count() }).from(users).all();
  const [eventCount] = database.select({ value: count() }).from(events).all();
  const [bookingCount] = database.select({ value: count() }).from(bookings).all();

  const seedUsers = userCount.value === 0 ? readJson<IUser>(path.join(dataDir, 'users.json')) : [];
  const seedEvents = eventCount.value === 0 ? readJson<IEvent>(path.join(dataDir, 'events.json')) : [];
  const seedBookings = bookingCount.value === 0 ? readJson<IBooking>(path.join(dataDir, 'bookings.json')) : [];
  if (seedUsers.length === 0 && seedEvents.length === 0 && seedBookings.length === 0) return;

  const sqlite = globalForDb.__sqlite;
  if (!sqlite) throw new Error('database is not open');
  sqlite.transaction(() => {
    if (seedUsers.length > 0) {
      database
        .insert(users)
        .values(
          seedUsers.map((user) => ({
            id: user._id,
            name: user.name,
            email: user.email,
            passwordHash: user.passwordHash,
            role: user.role ?? null,
            createdAt: user.createdAt,
          })),
        )
        .run();
    }
    if (seedEvents.length > 0) {
      database
        .insert(events)
        .values(
          seedEvents.map((event) => ({
            id: event._id,
            title: event.title,
            slug: event.slug,
            description: event.description,
            overview: event.overview,
            image: event.image,
            venue: event.venue,
            location: event.location,
            date: event.date,
            time: event.time,
            mode: event.mode,
            audience: event.audience,
            agenda: event.agenda,
            organizer: event.organizer,
            tags: event.tags,
            userId: event.userId ?? null,
            status: event.status ?? null,
            createdAt: event.createdAt,
            updatedAt: event.updatedAt,
          })),
        )
        .run();
    }
    if (seedBookings.length > 0) {
      database
        .insert(bookings)
        .values(
          seedBookings.map((booking) => ({
            id: booking._id,
            eventId: booking.eventId,
            slug: booking.slug,
            email: booking.email,
            createdAt: booking.createdAt,
            updatedAt: booking.updatedAt,
          })),
        )
        .run();
    }
  })();
}

function readJson<T>(filePath: string): T[] {
  try {
    const parsed: unknown = JSON.parse(readFileSync(filePath, 'utf8'));
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw error;
  }
}
