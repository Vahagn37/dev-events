'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function CreateEventForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);

    const form = event.currentTarget;
    const data = new FormData(form);
    const tags = String(data.get('tags') ?? '')
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean);
    const agenda = String(data.get('agenda') ?? '')
      .split('\n')
      .map((item) => item.trim())
      .filter(Boolean);
    data.set('tags', JSON.stringify(tags));
    data.set('agenda', JSON.stringify(agenda));

    try {
      const response = await fetch('/api/events', { method: 'POST', body: data });
      const payload = (await response.json()) as {
        message?: string;
        event?: { slug: string };
      };
      if (!response.ok || !payload.event) {
        setError(payload.message ?? 'Could not create the event');
        return;
      }
      router.push(`/events/${payload.event.slug}`);
      router.refresh();
    } catch {
      setError('Could not create the event');
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit}>
      <label>
        Title
        <input name="title" required maxLength={100} />
      </label>
      <label>
        Description
        <textarea name="description" required maxLength={1000} />
      </label>
      <label>
        Overview
        <textarea name="overview" required maxLength={500} />
      </label>
      <label>
        Image
        <input name="image" type="file" accept="image/png,image/jpeg,image/webp,image/gif" required />
      </label>
      <label>
        Venue
        <input name="venue" required />
      </label>
      <label>
        Location
        <input name="location" required />
      </label>
      <div className="pair">
        <label>
          Date
          <input name="date" type="date" required />
        </label>
        <label>
          Time
          <input name="time" type="time" required />
        </label>
      </div>
      <fieldset className="modes">
        <legend>Mode</legend>
        <div>
          <label>
            <input type="radio" name="mode" value="offline" defaultChecked required />
            Offline
          </label>
          <label>
            <input type="radio" name="mode" value="online" />
            Online
          </label>
          <label>
            <input type="radio" name="mode" value="hybrid" />
            Hybrid
          </label>
        </div>
      </fieldset>
      <label>
        Audience
        <input name="audience" required placeholder="Frontend engineers" />
      </label>
      <label>
        Organizer
        <input name="organizer" required />
      </label>
      <label>
        Tags
        <input name="tags" required placeholder="react, javascript" />
      </label>
      <label>
        Agenda
        <textarea name="agenda" required placeholder={'Keynote\nWorkshops'} />
      </label>
      {error ? <p className="error">{error}</p> : null}
      <button type="submit" disabled={pending}>
        {pending ? 'Creating…' : 'Create event'}
      </button>
    </form>
  );
}
