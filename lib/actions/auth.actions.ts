'use server';

import { revalidatePath } from 'next/cache';
import type { PublicUser } from '@/database';
import { clearSession, safeNext, setSession } from '@/lib/session';
import { authenticate, registerUser } from '@/lib/users';

export type AuthState = { message: string } | { user: PublicUser; next: string } | null;

function field(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === 'string' ? value : '';
}

export async function register(_state: AuthState, formData: FormData): Promise<AuthState> {
  const result = await registerUser({
    name: field(formData, 'name'),
    email: field(formData, 'email'),
    password: field(formData, 'password'),
  });
  if ('error' in result) return { message: result.error };
  await setSession(result.user._id);
  revalidatePath('/', 'layout');
  return { user: result.user, next: safeNext(field(formData, 'next')) };
}

export async function login(_state: AuthState, formData: FormData): Promise<AuthState> {
  const user = await authenticate(field(formData, 'email'), field(formData, 'password'));
  if (!user) return { message: 'Email or password is incorrect' };
  await setSession(user._id);
  revalidatePath('/', 'layout');
  return { user, next: safeNext(field(formData, 'next')) };
}

export async function logout() {
  await clearSession();
  revalidatePath('/', 'layout');
}
