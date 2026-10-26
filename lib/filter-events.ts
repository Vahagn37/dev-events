import type { IEvent } from '@/database';

export const modes = ['offline', 'online', 'hybrid'] as const;
export const whens = ['upcoming', 'past'] as const;

export type Mode = (typeof modes)[number];
export type When = (typeof whens)[number] | 'all';

export type EventFilters = {
  needle: string;
  when: When;
  mode: Mode | 'all';
  today: string;
  datePending: boolean;
};

export function readWhen(value: string | null): When {
  return whens.find((item) => item === value) ?? 'all';
}

export function readMode(value: string | null): Mode | 'all' {
  return modes.find((item) => item === value) ?? 'all';
}

export function matchesQuery(event: IEvent, needle: string) {
  if (!needle) return true;
  const haystack = [event.title, event.location, ...(event.tags ?? [])].join(' ').toLowerCase();
  return haystack.includes(needle);
}

export function filterEvents(events: IEvent[], filters: EventFilters) {
  return events.filter((event) => {
    if (!matchesQuery(event, filters.needle)) return false;
    if (filters.mode !== 'all' && event.mode !== filters.mode) return false;
    if (!filters.datePending && filters.when === 'upcoming' && event.date < filters.today) return false;
    if (!filters.datePending && filters.when === 'past' && event.date >= filters.today) return false;
    return true;
  });
}
