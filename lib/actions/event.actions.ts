'use server';

import { similarEvents } from '@/lib/store';

export const getSimilarEventsBySlug = async (slug: string) => {
  try {
    return await similarEvents(slug);
  } catch {
    return [];
  }
};
