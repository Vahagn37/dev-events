import { Suspense } from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import LoginForm from './form';
import { currentUser, safeNext } from '@/lib/session';

async function LoginSection({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const dest = safeNext(next);
  const user = await currentUser();
  if (user) redirect(dest);

  return (
    <section id="account">
      <h1>Log in</h1>
      <LoginForm next={dest} />
      <p className="switch">
        No account yet? <Link href={`/register?next=${encodeURIComponent(dest)}`}>Register</Link>
      </p>
    </section>
  );
}

export default function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  return (
    <Suspense fallback={<p className="text-sm text-light-200">Loading...</p>}>
      <LoginSection searchParams={searchParams} />
    </Suspense>
  );
}
