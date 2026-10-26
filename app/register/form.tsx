'use client';

import { useActionState } from 'react';
import { useSignedIn } from '@/components/AccountProvider';
import { register, type AuthState } from '@/lib/actions/auth.actions';

export default function RegisterForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(register, null as AuthState);
  useSignedIn(state);

  return (
    <form action={action}>
      <input type="hidden" name="next" value={next} />
      <label>
        Name
        <input name="name" required autoComplete="name" maxLength={80} />
      </label>
      <label>
        Email
        <input name="email" type="email" required autoComplete="email" />
      </label>
      <label>
        Password
        <input name="password" type="password" required minLength={8} autoComplete="new-password" />
      </label>
      {state && 'message' in state ? <p className="error">{state.message}</p> : null}
      <button type="submit" disabled={pending}>
        {pending ? 'Creating account…' : 'Register'}
      </button>
    </form>
  );
}
