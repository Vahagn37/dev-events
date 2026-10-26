'use client';

import { useActionState } from 'react';
import { useSignedIn } from '@/components/AccountProvider';
import { login, type AuthState } from '@/lib/actions/auth.actions';

export default function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(login, null as AuthState);
  useSignedIn(state);

  return (
    <form action={action}>
      <input type="hidden" name="next" value={next} />
      <label>
        Email
        <input name="email" type="email" required autoComplete="email" />
      </label>
      <label>
        Password
        <input name="password" type="password" required autoComplete="current-password" />
      </label>
      {state && 'message' in state ? <p className="error">{state.message}</p> : null}
      <button type="submit" disabled={pending}>
        {pending ? 'Logging in…' : 'Log in'}
      </button>
    </form>
  );
}
