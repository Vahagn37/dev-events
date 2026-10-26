import { Suspense } from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import RegisterForm from './form';
import { currentUser, safeNext } from '@/lib/session';

async function RegisterSection({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const dest = safeNext(next);
  const user = await currentUser();
  if (user) redirect(dest);

  return (
    <section id="account">
      <h1>Register</h1>
      <RegisterForm next={dest} />
      <p className="switch">
        Already have an account? <Link href={`/login?next=${encodeURIComponent(dest)}`}>Log in</Link>
      </p>
    </section>
  );
}

export default function RegisterPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  return (
    <Suspense fallback={<p className="text-sm text-light-200">Loading...</p>}>
      <RegisterSection searchParams={searchParams} />
    </Suspense>
  );
}
