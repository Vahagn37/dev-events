import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import CreateEventForm from './form';
import { currentUser } from '@/lib/session';

async function CreateEventGate() {
  const user = await currentUser();
  if (!user) redirect('/login?next=/events/new');

  return (
    <section id="create-event">
      <h1>Create Event</h1>
      <CreateEventForm />
    </section>
  );
}

export default function CreateEventPage() {
  return (
    <Suspense fallback={<p className="text-sm text-light-200">Loading...</p>}>
      <CreateEventGate />
    </Suspense>
  );
}
