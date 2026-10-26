'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { PublicUser } from '@/database';
import { logout } from '@/lib/actions/auth.actions';
import { useAccount } from '@/components/AccountProvider';

export default function NavAccountView({ user }: { user: PublicUser | null }) {
  const { user: live, setUser } = useAccount();
  const shown = live === undefined ? user : live;
  const router = useRouter();
  const [pending, setPending] = useState(false);

  if (shown === null && live === undefined) return null;

  if (!shown) {
    return (
      <>
        <li>
          <Link href="/login">Log in</Link>
        </li>
        <li>
          <Link href="/register">Register</Link>
        </li>
      </>
    );
  }

  return (
    <>
      {shown.role === 'admin' ? (
        <li>
          <Link href="/admin">Dashboard</Link>
        </li>
      ) : null}
      <li>
        <Link href="/profile">{shown.name}</Link>
      </li>
      <li>
        <button
          type="button"
          disabled={pending}
          onClick={async () => {
            setPending(true);
            await logout();
            setUser(null);
            router.push('/');
            router.refresh();
          }}
        >
          Log out
        </button>
      </li>
    </>
  );
}
