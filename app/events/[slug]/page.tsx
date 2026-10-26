import { Suspense } from 'react';
import EventDetails from '@/components/EventDetails';
import { currentUser } from '@/lib/session';

async function EventAccess({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const user = await currentUser();
  return <EventDetails slug={slug} viewerId={user?._id ?? ''} viewerRole={user?.role ?? 'user'} />;
}

const EventDetailsPage = ({ params }: { params: Promise<{ slug: string }> }) => {
  return (
    <main>
      <Suspense fallback={<div>Loading...</div>}>
        <EventAccess params={params} />
      </Suspense>
    </main>
  );
};

export default EventDetailsPage;
