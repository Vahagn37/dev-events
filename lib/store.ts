import { randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { IBooking } from '@/database/booking.model';
import type { EventStatus, IEvent } from '@/database/event.model';

const dataDir = path.join(process.cwd(), 'data');
const eventsPath = path.join(dataDir, 'events.json');
const bookingsPath = path.join(dataDir, 'bookings.json');

type Box = {
  events?: IEvent[];
  bookings?: IBooking[];
  ready?: Promise<void>;
};

const registry = globalThis as typeof globalThis & { __devEvents?: Box };

const modes = new Set(['online', 'offline', 'hybrid']);
const emailPattern =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

let writeChain = Promise.resolve();

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

function box(): Box {
  registry.__devEvents ??= {};
  return registry.__devEvents;
}

async function load(current: Box) {
  await mkdir(dataDir, { recursive: true });
  current.events = await readJson<IEvent[]>(eventsPath, []);
  current.bookings = await readJson<IBooking[]>(bookingsPath, []);
}

async function readJson<T>(filePath: string, fallback: T): Promise<T> {
  try {
    const text = await readFile(filePath, 'utf8');
    return JSON.parse(text) as T;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return fallback;
    throw error;
  }
}

async function ready() {
  const current = box();
  if (current.events && current.bookings) return current;
  current.ready ??= load(current).finally(() => {
    current.ready = undefined;
  });
  await current.ready;
  return current;
}

function persist(current: Box) {
  writeChain = writeChain
    .then(async () => {
      await mkdir(dataDir, { recursive: true });
      await writeFile(eventsPath, JSON.stringify(current.events, null, 2));
      await writeFile(bookingsPath, JSON.stringify(current.bookings, null, 2));
    })
    .catch((error) => {
      console.error('failed to write event store', error);
    });
  return writeChain;
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
  const current = await ready();
  return [...(current.events ?? [])].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  );
}

export async function listPublicEvents(): Promise<IEvent[]> {
  const events = await listEvents();
  return events.filter((event) => eventStatus(event) === 'confirmed');
}

export async function listEventsByUser(userId: string): Promise<IEvent[]> {
  const events = await listEvents();
  return events.filter((event) => event.userId === userId);
}

export async function countBookings(eventId: string): Promise<number> {
  const current = await ready();
  return (current.bookings ?? []).filter((booking) => booking.eventId === eventId).length;
}

export async function listBookingEmails(eventId: string): Promise<string[]> {
  const current = await ready();
  return (current.bookings ?? [])
    .filter((booking) => booking.eventId === eventId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .map((booking) => booking.email);
}

export async function getEventBySlug(slug: string): Promise<IEvent | null> {
  const current = await ready();
  return (
    current.events?.find((event) => event.slug === slug.trim().toLowerCase()) ??
    null
  );
}

export async function similarEvents(slug: string): Promise<IEvent[]> {
  const current = await ready();
  const event = current.events?.find((item) => item.slug === slug);
  if (!event) return [];
  return (current.events ?? []).filter(
    (item) =>
      item._id !== event._id &&
      eventStatus(item) === 'confirmed' &&
      item.tags.some((tag) => event.tags.includes(tag)),
  );
}

export async function setEventStatus(id: string, status: EventStatus): Promise<IEvent | null> {
  const current = await ready();
  const event = current.events?.find((item) => item._id === id);
  if (!event) return null;
  event.status = status;
  event.updatedAt = new Date().toISOString();
  await persist(current);
  return event;
}

export async function createEvent(
  input: EventInput,
): Promise<{ event: IEvent } | StoreFailure> {
  const current = await ready();
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
  if (current.events?.some((event) => event.slug === slug)) {
    return { error: 'An event with this title already exists', status: 400 };
  }

  const now = new Date().toISOString();
  const event: IEvent = {
    _id: randomUUID(),
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
  };
  current.events?.unshift(event);
  await persist(current);
  return { event };
}

export async function createBooking(input: {
  eventId: string;
  slug: string;
  email: string;
}): Promise<{ success: true } | StoreFailure> {
  const current = await ready();
  const email = input.email.trim().toLowerCase();
  const event = current.events?.find(
    (item) => item._id === input.eventId || item.slug === input.slug,
  );
  if (!event) return { error: 'Event not found', status: 404 };
  if (!emailPattern.test(email)) {
    return { error: 'Please provide a valid email address', status: 400 };
  }
  const duplicate = current.bookings?.some(
    (booking) => booking.eventId === event._id && booking.email === email,
  );
  if (duplicate) {
    return { error: 'This email is already booked for the event', status: 409 };
  }

  const now = new Date().toISOString();
  current.bookings?.unshift({
    _id: randomUUID(),
    eventId: event._id,
    slug: event.slug,
    email,
    createdAt: now,
    updatedAt: now,
  });
  await persist(current);
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
