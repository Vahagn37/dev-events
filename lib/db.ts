import { readFileSync } from 'node:fs';
import path from 'node:path';
import { PrismaClient } from '@prisma/client';
import type { IBooking } from '@/database/booking.model';
import type { IEvent } from '@/database/event.model';
import type { IUser } from '@/database/user.model';

const globalForPrisma = globalThis as typeof globalThis & {
  __prisma?: PrismaClient;
  __prismaReady?: Promise<void>;
};

export function db() {
  globalForPrisma.__prisma ??= new PrismaClient();
  return globalForPrisma.__prisma;
}

export function readyDb() {
  globalForPrisma.__prismaReady ??= seed().catch((error) => {
    globalForPrisma.__prismaReady = undefined;
    throw error;
  });
  return globalForPrisma.__prismaReady;
}

async function seed() {
  const prisma = db();
  const dataDir = path.join(process.cwd(), 'data');
  const [userCount, eventCount, bookingCount] = await Promise.all([
    prisma.user.count(),
    prisma.event.count(),
    prisma.booking.count(),
  ]);

  const seedUsers = userCount === 0 ? readJson<IUser>(path.join(dataDir, 'users.json')) : [];
  const seedEvents = eventCount === 0 ? readJson<IEvent>(path.join(dataDir, 'events.json')) : [];
  const seedBookings = bookingCount === 0 ? readJson<IBooking>(path.join(dataDir, 'bookings.json')) : [];
  if (seedUsers.length === 0 && seedEvents.length === 0 && seedBookings.length === 0) return;

  await prisma.$transaction(async (tx) => {
    if (seedUsers.length > 0) {
      await tx.user.createMany({
        data: seedUsers.map((user) => ({
          id: user._id,
          name: user.name,
          email: user.email,
          passwordHash: user.passwordHash,
          role: user.role ?? null,
          createdAt: user.createdAt,
        })),
      });
    }
    if (seedEvents.length > 0) {
      await tx.event.createMany({
        data: seedEvents.map((event) => ({
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
      });
    }
    if (seedBookings.length > 0) {
      await tx.booking.createMany({
        data: seedBookings.map((booking) => ({
          id: booking._id,
          eventId: booking.eventId,
          slug: booking.slug,
          email: booking.email,
          createdAt: booking.createdAt,
          updatedAt: booking.updatedAt,
        })),
      });
    }
  });
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
