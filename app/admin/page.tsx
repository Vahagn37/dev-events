import { Suspense } from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import Registrations from '@/components/Registrations';
import { reviewEvent } from '@/lib/actions/admin.actions';
import { currentUser } from '@/lib/session';
import { eventStatus, listBookingEmails, listEvents } from '@/lib/store';
import { listUsers } from '@/lib/users';

async function AdminDashboard() {
  const user = await currentUser();
  if (!user) redirect('/login?next=/admin');
  if (user.role !== 'admin') redirect('/');

  const [events, users] = await Promise.all([listEvents(), listUsers()]);
  const names = new Map(users.map((account) => [account._id, account.name]));
  const registrations = new Map(
    await Promise.all(
      events.map(async (event) => [event._id, await listBookingEmails(event._id)] as const),
    ),
  );

  return (
    <section id="admin">
      <h1>Dashboard</h1>
      <div>
        <h3>Events</h3>
        {events.length > 0 ? (
          <ul className="list-none">
            {events.map((event) => {
              const status = eventStatus(event);
              const emails = registrations.get(event._id) ?? [];
              return (
                <li key={event._id} className="event list-none">
                  <div>
                    <Link href={`/events/${event.slug}`}>{event.title}</Link>
                    <p className="meta">
                      <span className="status">{status}</span>
                      {' · '}
                      {event.date}
                      {' · '}
                      {names.get(event.userId ?? '') ?? 'Unknown'}
                    </p>
                    <Registrations emails={emails} title={event.title} />
                  </div>
                  <div className="actions">
                    <form action={reviewEvent.bind(null, event._id, 'confirmed')}>
                      <button type="submit" disabled={status === 'confirmed'}>
                        Confirm
                      </button>
                    </form>
                    <form action={reviewEvent.bind(null, event._id, 'rejected')}>
                      <button type="submit" className="reject" disabled={status === 'rejected'}>
                        Reject
                      </button>
                    </form>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="meta">No events yet.</p>
        )}
      </div>
    </section>
  );
}

export default function AdminPage() {
  return (
    <Suspense fallback={<p className="text-sm text-light-200">Loading...</p>}>
      <AdminDashboard />
    </Suspense>
  );
}
