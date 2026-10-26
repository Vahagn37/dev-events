'use server';

import { updateTag } from 'next/cache';
import { createBooking as saveBooking } from '@/lib/store';

export const createBooking = async ({
  eventId,
  slug,
  email,
}: {
  eventId: string;
  slug: string;
  email: string;
}) => {
  try {
    const result = await saveBooking({ eventId, slug, email });
    if ('error' in result) {
      return { success: false, message: result.error };
    }
    updateTag(`bookings:${slug}`);
    return { success: true };
  } catch (error) {
    console.error('create booking failed', error);
    return { success: false, message: 'Could not book this event' };
  }
};
