'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import type { EventStatus } from '@/database';
import { currentUser } from '@/lib/session';
import { setEventStatus } from '@/lib/store';

export async function reviewEvent(eventId: string, status: Extract<EventStatus, 'confirmed' | 'rejected'>) {
  const user = await currentUser();
  if (user?.role !== 'admin') return;
  const event = await setEventStatus(eventId, status);
  if (!event) return;
  revalidateTag('events', 'max');
  revalidatePath('/');
  revalidatePath('/admin');
  revalidatePath('/profile');
  revalidatePath(`/events/${event.slug}`);
}
