import { Suspense } from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import EventCard from '@/components/EventCard';
import Registrations from '@/components/Registrations';
import { currentUser } from '@/lib/session';
import { eventStatus, listBookingEmails, listEventsByUser } from '@/lib/store';

async function Profile() {
  const user = await currentUser();
  if (!user) redirect('/login?next=/profile');

  const events = await listEventsByUser(user._id);
  const registrations = new Map(
    await Promise.all(
      events.map(async (event) => [event._id, await listBookingEmails(event._id)] as const),
    ),
  );

  return (
    <section id="profile">
      <h1>{user.name}</h1>
      <p className="email">{user.email}</p>

      <div className="mt-16 space-y-7">
        <h3>Your events</h3>
        {events.length > 0 ? (
          <ul className="events">
            {events.map((event) => {
              const emails = registrations.get(event._id) ?? [];
              return (
                <li key={event._id} className="list-none">
                  <p className="status">{eventStatus(event)}</p>
                  <EventCard {...event} />
                  <Registrations emails={emails} title={event.title} />
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="empty">
            No events yet. <Link href="/events/new">Create one</Link>
          </p>
        )}
      </div>
    </section>
  );
}

export default function ProfilePage() {
  return (
    <Suspense fallback={<p className="text-sm text-light-200">Loading...</p>}>
      <Profile />
    </Suspense>
  );
}
