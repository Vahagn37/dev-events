import type { IEvent } from '@/database';

export const sorts = ['soonest', 'latest', 'recent'] as const;

export type Sort = (typeof sorts)[number];

export function readSort(value: string | null): Sort {
  if (value === 'latest' || value === 'recent') return value;
  return 'soonest';
}

export function sortEvents(events: IEvent[], sort: Sort) {
  return [...events].sort((a, b) => {
    if (sort === 'recent') return b.createdAt.localeCompare(a.createdAt);
    const byDate = a.date.localeCompare(b.date) || a.time.localeCompare(b.time);
    return sort === 'latest' ? -byDate : byDate;
  });
}
