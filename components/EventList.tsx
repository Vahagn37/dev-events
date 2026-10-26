'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import type { IEvent } from '@/database';
import EventCard from '@/components/EventCard';
import { filterEvents, readMode, readWhen } from '@/lib/filter-events';
import { readSort, sortEvents } from '@/lib/sort-events';

function localToday() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

export default function EventList({ events }: { events: IEvent[] }) {
  const pathname = usePathname();
  const params = useSearchParams();
  const [ready, setReady] = useState(false);
  const [queryText, setQueryText] = useState(params.get('q') ?? '');
  const [when, setWhen] = useState(() => readWhen(params.get('when')));
  const [mode, setMode] = useState(() => readMode(params.get('mode')));
  const [sort, setSort] = useState(() => readSort(params.get('sort')));
  const paramsRef = useRef(new URLSearchParams(params.toString()));
  const replaceTimer = useRef<number | null>(null);
  const needle = queryText.trim().toLowerCase();
  const datePending = !ready && when !== 'all';

  useEffect(() => {
    setReady(true);
  }, []);

  useEffect(() => {
    const onPop = () => {
      const query = new URLSearchParams(window.location.search);
      paramsRef.current = query;
      setQueryText(query.get('q') ?? '');
      setWhen(readWhen(query.get('when')));
      setMode(readMode(query.get('mode')));
      setSort(readSort(query.get('sort')));
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  function update(next: Record<string, string>, delay = 0) {
    const query = new URLSearchParams(paramsRef.current.toString());
    for (const [key, value] of Object.entries(next)) {
      if (!value) query.delete(key);
      else query.set(key, value);
    }
    paramsRef.current = query;
    setQueryText(query.get('q') ?? '');
    setWhen(readWhen(query.get('when')));
    setMode(readMode(query.get('mode')));
    setSort(readSort(query.get('sort')));
    if (replaceTimer.current) window.clearTimeout(replaceTimer.current);
    replaceTimer.current = window.setTimeout(() => {
      const top = window.scrollY;
      const text = paramsRef.current.toString();
      const hash = window.location.hash === '#events' ? '#events' : '';
      const href = `${text ? `${pathname}?${text}` : pathname}${hash}`;
      window.history.replaceState(window.history.state, '', href);
      window.scrollTo(0, top);
    }, delay);
  }

  function onSearch(value: string) {
    setQueryText(value);
    update({ q: value.trim() ? value : '' }, 200);
  }

  const filtered = filterEvents(events, {
    needle,
    when,
    mode,
    today: localToday(),
    datePending,
  });
  const visible = sortEvents(filtered, sort);

  const filtersActive = Boolean(needle || when !== 'all' || mode !== 'all');

  return (
    <>
      <div id="event-filters">
        <div className="search">
          <label>
            Search
            <input
              type="search"
              value={queryText}
              placeholder="Title, location, or tag"
              onChange={(event) => onSearch(event.target.value)}
            />
          </label>
          {filtersActive ? (
            <button
              type="button"
              onClick={() => {
                setQueryText('');
                update({ q: '', when: '', mode: '' });
              }}
            >
              Clear filters
            </button>
          ) : null}
        </div>
        <ChoiceGroup
          label="When"
          value={when}
          options={[
            ['all', 'All'],
            ['upcoming', 'Upcoming'],
            ['past', 'Past'],
          ]}
          onChange={(value) => update({ when: value === 'all' ? '' : value })}
        />
        <ChoiceGroup
          label="Mode"
          value={mode}
          options={[
            ['all', 'All'],
            ['offline', 'Offline'],
            ['online', 'Online'],
            ['hybrid', 'Hybrid'],
          ]}
          onChange={(value) => update({ mode: value === 'all' ? '' : value })}
        />
        <nav id="event-sort" aria-label="Sort events">
          <p className="label">Sort</p>
          <select
            value={sort}
            onChange={(event) => update({ sort: event.target.value === 'soonest' ? '' : event.target.value })}
          >
            <option value="soonest">Soonest</option>
            <option value="latest">Latest</option>
            <option value="recent">Recently added</option>
          </select>
        </nav>
      </div>

      {datePending ? (
        <p className="text-sm text-light-200">Loading events...</p>
      ) : visible.length > 0 ? (
        <ul className="events">
          {visible.map((event) => (
            <li key={event._id} className="list-none">
              <EventCard {...event} />
            </li>
          ))}
        </ul>
      ) : (
        <div className="empty">
          <p>{filtersActive ? 'No events match.' : 'No events yet.'}</p>
        </div>
      )}
    </>
  );
}

function ChoiceGroup({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: [string, string][];
  onChange: (value: string) => void;
}) {
  return (
    <div className="group" role="group" aria-label={label}>
      <p className="label">{label}</p>
      <div className="options">
        {options.map(([option, text]) => (
          <button
            key={option}
            type="button"
            className="option"
            aria-pressed={value === option}
            onClick={() => onChange(option)}
          >
            {text}
          </button>
        ))}
      </div>
    </div>
  );
}
