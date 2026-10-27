import { randomUUID } from 'node:crypto';
import type { Prisma } from '@prisma/client';
import type { IEvent } from '@/database';
import type { EventStatus } from '@/database/event.model';
import { db, readyDb } from '@/lib/db';

const modes = new Set(['online', 'offline', 'hybrid']);
const emailPattern =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

export type EventInput = {
  title: string;
  description: string;
  overview: string;
  image: string;
  venue: string;
  location: string;
  date: string;
  time: string;
  mode: string;
  audience: string;
  organizer: string;
  agenda: string[];
  tags: string[];
  userId: string;
};

export type StoreFailure = { error: string; status: number };

type EventRow = Prisma.EventGetPayload<Record<string, never>>;

function strings(value: Prisma.JsonValue): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function toEvent(row: EventRow): IEvent {
  return {
    _id: row.id,
    title: row.title,
    slug: row.slug,
    description: row.description,
    overview: row.overview,
    image: row.image,
    venue: row.venue,
    location: row.location,
    date: row.date,
    time: row.time,
    mode: row.mode,
    audience: row.audience,
    agenda: strings(row.agenda),
    organizer: row.organizer,
    tags: strings(row.tags),
    userId: row.userId ?? undefined,
    status: (row.status ?? undefined) as EventStatus | undefined,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function eventStatus(event: IEvent): EventStatus {
  return event.status ?? 'confirmed';
}

export function canViewEvent(
  event: IEvent,
  viewer: { _id: string; role?: 'user' | 'admin' } | null,
) {
  if (eventStatus(event) === 'confirmed') return true;
  if (!viewer?._id) return false;
  return viewer.role === 'admin' || viewer._id === event.userId;
}

export function canSeeRegistrations(
  event: IEvent,
  viewer: { _id: string; role?: 'user' | 'admin' } | null,
) {
  if (!viewer?._id) return false;
  return viewer.role === 'admin' || viewer._id === event.userId;
}

export async function listEvents(): Promise<IEvent[]> {
  await readyDb();
  const rows = await db().event.findMany({ orderBy: { createdAt: 'desc' } });
  return rows.map(toEvent);
}

export async function listPublicEvents(): Promise<IEvent[]> {
  const rows = await listEvents();
  return rows.filter((event) => eventStatus(event) === 'confirmed');
}

export async function listEventsByUser(userId: string): Promise<IEvent[]> {
  await readyDb();
  const rows = await db().event.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });
  return rows.map(toEvent);
}

export async function countBookings(eventId: string): Promise<number> {
  await readyDb();
  return db().booking.count({ where: { eventId } });
}

export async function listBookingEmails(eventId: string): Promise<string[]> {
  await readyDb();
  const rows = await db().booking.findMany({
    where: { eventId },
    orderBy: { createdAt: 'asc' },
    select: { email: true },
  });
  return rows.map((booking) => booking.email);
}

export async function getEventBySlug(slug: string): Promise<IEvent | null> {
  await readyDb();
  const row = await db().event.findUnique({ where: { slug: slug.trim().toLowerCase() } });
  return row ? toEvent(row) : null;
}

export async function similarEvents(slug: string): Promise<IEvent[]> {
  const event = await getEventBySlug(slug);
  if (!event) return [];
  const rows = await listEvents();
  return rows.filter(
    (item) =>
      item._id !== event._id &&
      eventStatus(item) === 'confirmed' &&
      item.tags.some((tag) => event.tags.includes(tag)),
  );
}

export async function setEventStatus(id: string, status: EventStatus): Promise<IEvent | null> {
  await readyDb();
  const existing = await db().event.findUnique({ where: { id } });
  if (!existing) return null;
  const row = await db().event.update({
    where: { id },
    data: { status, updatedAt: new Date().toISOString() },
  });
  return toEvent(row);
}

export async function createEvent(
  input: EventInput,
): Promise<{ event: IEvent } | StoreFailure> {
  await readyDb();
  const title = input.title.trim();
  const description = input.description.trim();
  const overview = input.overview.trim();
  const venue = input.venue.trim();
  const location = input.location.trim();
  const audience = input.audience.trim();
  const organizer = input.organizer.trim();
  const mode = input.mode.trim().toLowerCase();
  const tags = input.tags.map((tag) => tag.trim()).filter(Boolean);
  const agenda = input.agenda.map((item) => item.trim()).filter(Boolean);

  if (!title) return { error: 'Title is required', status: 400 };
  if (title.length > 100) return { error: 'Title cannot exceed 100 characters', status: 400 };
  if (!description) return { error: 'Description is required', status: 400 };
  if (description.length > 1000) {
    return { error: 'Description cannot exceed 1000 characters', status: 400 };
  }
  if (!overview) return { error: 'Overview is required', status: 400 };
  if (overview.length > 500) return { error: 'Overview cannot exceed 500 characters', status: 400 };
  if (!input.image.trim()) return { error: 'Image URL is required', status: 400 };
  if (!venue) return { error: 'Venue is required', status: 400 };
  if (!location) return { error: 'Location is required', status: 400 };
  if (!audience) return { error: 'Audience is required', status: 400 };
  if (!organizer) return { error: 'Organizer is required', status: 400 };
  if (!modes.has(mode)) {
    return { error: 'Mode must be either online, offline, or hybrid', status: 400 };
  }
  if (agenda.length === 0) return { error: 'At least one agenda item is required', status: 400 };
  if (tags.length === 0) return { error: 'At least one tag is required', status: 400 };

  let date: string;
  let time: string;
  try {
    date = normalizeDate(input.date);
    time = normalizeTime(input.time);
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Invalid event', status: 400 };
  }

  const slug = generateSlug(title);
  if (!slug) return { error: 'Title is required', status: 400 };
  const duplicate = await db().event.findUnique({ where: { slug }, select: { id: true } });
  if (duplicate) return { error: 'An event with this title already exists', status: 400 };

  const now = new Date().toISOString();
  const row = await db().event.create({
    data: {
      id: randomUUID(),
      title,
      slug,
      description,
      overview,
      image: input.image.trim(),
      venue,
      location,
      date,
      time,
      mode,
      audience,
      agenda,
      organizer,
      tags,
      userId: input.userId,
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    },
  });
  return { event: toEvent(row) };
}

export async function createBooking(input: {
  eventId: string;
  slug: string;
  email: string;
}): Promise<{ success: true } | StoreFailure> {
  await readyDb();
  const email = input.email.trim().toLowerCase();
  const event = await db().event.findFirst({
    where: { OR: [{ id: input.eventId }, { slug: input.slug }] },
  });
  if (!event) return { error: 'Event not found', status: 404 };
  if (!emailPattern.test(email)) {
    return { error: 'Please provide a valid email address', status: 400 };
  }
  const duplicate = await db().booking.findFirst({
    where: { eventId: event.id, email },
    select: { id: true },
  });
  if (duplicate) {
    return { error: 'This email is already booked for the event', status: 409 };
  }

  const now = new Date().toISOString();
  await db().booking.create({
    data: {
      id: randomUUID(),
      eventId: event.id,
      slug: event.slug,
      email,
      createdAt: now,
      updatedAt: now,
    },
  });
  return { success: true };
}

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function normalizeDate(dateString: string): string {
  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    throw new Error('Invalid date format');
  }
  return date.toISOString().split('T')[0];
}

function normalizeTime(timeString: string): string {
  const timeRegex = /^(\d{1,2}):(\d{2})(\s*(AM|PM))?$/i;
  const match = timeString.trim().match(timeRegex);

  if (!match) {
    throw new Error('Invalid time format. Use HH:MM or HH:MM AM/PM');
  }

  let hours = parseInt(match[1], 10);
  const minutes = match[2];
  const period = match[4]?.toUpperCase();

  if (period) {
    if (period === 'PM' && hours !== 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;
  }

  if (hours < 0 || hours > 23 || parseInt(minutes, 10) < 0 || parseInt(minutes, 10) > 59) {
    throw new Error('Invalid time values');
  }

  return `${hours.toString().padStart(2, '0')}:${minutes}`;
}
