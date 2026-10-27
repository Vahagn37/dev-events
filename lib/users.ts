import { randomUUID } from 'node:crypto';
import type { PublicUser } from '@/database';
import { db, readyDb } from '@/lib/db';
import { hashPassword, verifyPassword } from '@/lib/passwords';

const emailPattern =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

export async function listUsers(): Promise<PublicUser[]> {
  await readyDb();
  const rows = await db().user.findMany();
  return rows.map(publish);
}

export async function findUser(id: string) {
  await readyDb();
  const user = await db().user.findUnique({ where: { id } });
  return user ? publish(user) : null;
}

export async function registerUser(input: {
  name: string;
  email: string;
  password: string;
}): Promise<{ user: PublicUser } | { error: string }> {
  await readyDb();
  const name = input.name.trim();
  const email = input.email.trim().toLowerCase();
  const password = input.password;

  if (!name || name.length > 80) return { error: 'Name is required' };
  if (!emailPattern.test(email)) return { error: 'Enter a valid email address' };
  if (password.length < 8) return { error: 'Password must be at least 8 characters' };
  const existing = await db().user.findUnique({ where: { email }, select: { id: true } });
  if (existing) return { error: 'An account with this email already exists' };

  const user = await db().user.create({
    data: {
      id: randomUUID(),
      name,
      email,
      passwordHash: await hashPassword(password),
      role: 'user',
      createdAt: new Date().toISOString(),
    },
  });
  return { user: publish(user) };
}

export async function authenticate(email: string, password: string) {
  await readyDb();
  const user = await db().user.findUnique({ where: { email: email.trim().toLowerCase() } });
  if (!user || !(await verifyPassword(password, user.passwordHash))) return null;
  return publish(user);
}

function publish(user: { id: string; name: string; email: string; role: string | null }): PublicUser {
  return {
    _id: user.id,
    name: user.name,
    email: user.email,
    role: user.role === 'admin' ? 'admin' : 'user',
  };
}
