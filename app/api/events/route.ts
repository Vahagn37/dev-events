import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { revalidatePath, revalidateTag } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';
import { createEvent, listPublicEvents } from '@/lib/store';
import { currentUser } from '@/lib/session';

export async function POST(req: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ message: 'Log in to create an event' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('image');

    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ message: 'Image file is required' }, { status: 400 });
    }

    let tags: string[];
    let agenda: string[];
    try {
      tags = parseStringList(formData.get('tags'));
      agenda = parseStringList(formData.get('agenda'));
    } catch {
      return NextResponse.json({ message: 'Invalid JSON data format' }, { status: 400 });
    }

    const image = await saveImage(file);
    const result = await createEvent({
      title: field(formData, 'title'),
      description: field(formData, 'description'),
      overview: field(formData, 'overview'),
      image,
      venue: field(formData, 'venue'),
      location: field(formData, 'location'),
      date: field(formData, 'date'),
      time: field(formData, 'time'),
      mode: field(formData, 'mode'),
      audience: field(formData, 'audience'),
      organizer: field(formData, 'organizer'),
      tags,
      agenda,
      userId: user._id,
    });

    if ('error' in result) {
      return NextResponse.json({ message: result.error }, { status: result.status });
    }

    revalidateTag('events', 'max');
    revalidatePath('/');
    revalidatePath('/profile');
    revalidatePath('/admin');
    return NextResponse.json(
      { message: 'Event created successfully', event: result.event },
      { status: 201 },
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { message: 'Event Creation Failed', error: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 },
    );
  }
}

export async function GET() {
  try {
    const events = await listPublicEvents();
    return NextResponse.json({ message: 'Events fetched successfully', events }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ message: 'Event fetching failed', error }, { status: 500 });
  }
}

function field(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === 'string' ? value : '';
}

function parseStringList(value: FormDataEntryValue | null): string[] {
  if (typeof value !== 'string') throw new Error('invalid list');
  const parsed: unknown = JSON.parse(value);
  if (!Array.isArray(parsed) || parsed.some((item) => typeof item !== 'string')) {
    throw new Error('invalid list');
  }
  return parsed;
}

async function saveImage(file: File) {
  const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
  await mkdir(uploadsDir, { recursive: true });
  const filename = `${randomUUID()}${extensionFor(file)}`;
  await writeFile(path.join(uploadsDir, filename), Buffer.from(await file.arrayBuffer()));
  return `/uploads/${filename}`;
}

function extensionFor(file: File) {
  const fromName = path.extname(file.name).toLowerCase();
  if (['.png', '.jpg', '.jpeg', '.webp', '.gif'].includes(fromName)) return fromName;
  if (file.type === 'image/jpeg') return '.jpg';
  if (file.type === 'image/webp') return '.webp';
  if (file.type === 'image/gif') return '.gif';
  return '.png';
}
