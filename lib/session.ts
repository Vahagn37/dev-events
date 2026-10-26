import { createHmac, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import { findUser } from '@/lib/users';
import type { PublicUser } from '@/database';

const COOKIE = 'session';

function secret() {
  return process.env.SESSION_SECRET || 'dev-event-local-secret';
}

function sign(userId: string) {
  const signature = createHmac('sha256', secret()).update(userId).digest('hex');
  return `${userId}.${signature}`;
}

function userIdFromToken(token: string) {
  const splitAt = token.lastIndexOf('.');
  if (splitAt <= 0) return null;
  const userId = token.slice(0, splitAt);
  const signature = token.slice(splitAt + 1);
  const expected = createHmac('sha256', secret()).update(userId).digest('hex');
  const actual = Buffer.from(signature);
  const wanted = Buffer.from(expected);
  if (actual.length !== wanted.length || !timingSafeEqual(actual, wanted)) return null;
  return userId;
}

export function safeNext(value: string | null | undefined) {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return '/';
  return value;
}

export async function currentUser(): Promise<PublicUser | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  const userId = userIdFromToken(token);
  if (!userId) return null;
  return findUser(userId);
}

export async function setSession(userId: string) {
  const jar = await cookies();
  jar.set(COOKIE, sign(userId), {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 14,
  });
}

export async function clearSession() {
  const jar = await cookies();
  jar.delete(COOKIE);
}
