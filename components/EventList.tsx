'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import type { IEvent } from '@/database';
import EventCard from '@/components/EventCard';
import { filterEvents, readMode, readWhen } from '@/lib/filter-events';
import { readSort, sortEvents } from '@/lib/sort-events';

const filterKeys = ['q', 'when', 'mode', 'sort'] as const;

let homeLeft = false;
let homeInstances = 0;
let historyPatched = false;

function discardHomeFilters() {
  if (window.location.pathname !== '/') return;
  const url = new URL(window.location.href);
  const hadQuery = filterKeys.some((key) => url.searchParams.has(key));
  for (const key of filterKeys) url.searchParams.delete(key);
  const state = window.history.state as {
    __PRIVATE_NEXTJS_INTERNALS_TREE?: { renderedSearch?: string };
  } | null;
  const internals = state?.__PRIVATE_NEXTJS_INTERNALS_TREE;
  const hadRendered = Boolean(internals?.renderedSearch);
  if (!hadQuery && !hadRendered) return;
  if (internals) internals.renderedSearch = '';
  const hash = url.hash === '#events' ? '#events' : '';
  window.history.replaceState(state, '', `${url.pathname}${url.search}${hash}`);
}

function rememberHomeFiltersOnLeave() {
  if (historyPatched) return;
  historyPatched = true;
  const pushState = window.history.pushState.bind(window.history);
  window.history.pushState = function (data, unused, url) {
    if (window.location.pathname === '/') discardHomeFilters();
    return pushState(data, unused, url);
  };
}

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
  const [queryText, setQueryText] = useState(() => (homeLeft ? '' : (params.get('q') ?? '')));
  const [when, setWhen] = useState(() => (homeLeft ? 'all' : readWhen(params.get('when'))));
  const [mode, setMode] = useState(() => (homeLeft ? 'all' : readMode(params.get('mode'))));
  const [sort, setSort] = useState(() => (homeLeft ? 'soonest' : readSort(params.get('sort'))));
  const paramsRef = useRef(homeLeft ? new URLSearchParams() : new URLSearchParams(params.toString()));
  const replaceTimer = useRef<number | null>(null);
  const needle = queryText.trim().toLowerCase();
  const datePending = !ready && when !== 'all';

  useEffect(() => {
    setReady(true);
  }, []);

  useLayoutEffect(() => {
    rememberHomeFiltersOnLeave();
    if (homeLeft) {
      paramsRef.current = new URLSearchParams();
      setQueryText('');
      setWhen('all');
      setMode('all');
      setSort('soonest');
      discardHomeFilters();
      queueMicrotask(() => {
        homeLeft = false;
      });
    }
    homeInstances += 1;
    return () => {
      if (replaceTimer.current) window.clearTimeout(replaceTimer.current);
      homeInstances -= 1;
      const remaining = homeInstances;
      queueMicrotask(() => {
        if (homeInstances === remaining && homeInstances === 0) homeLeft = true;
      });
    };
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
