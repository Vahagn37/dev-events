import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import type { PublicUser } from '@/database';
import type { UserRole } from '@/database/user.model';
import { users } from '@/database/schema';
import { db, readyDb } from '@/lib/db';
import { hashPassword, verifyPassword } from '@/lib/passwords';

const emailPattern =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

type UserRow = typeof users.$inferSelect;

function publish(user: UserRow): PublicUser {
  return {
    _id: user.id,
    name: user.name,
    email: user.email,
    role: user.role === 'admin' ? 'admin' : 'user',
  };
}

export async function listUsers(): Promise<PublicUser[]> {
  await readyDb();
  return db().select().from(users).all().map(publish);
}

export async function findUser(id: string) {
  await readyDb();
  const user = db().select().from(users).where(eq(users.id, id)).get();
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
  const existing = db().select({ id: users.id }).from(users).where(eq(users.email, email)).get();
  if (existing) return { error: 'An account with this email already exists' };

  const role: UserRole = 'user';
  const user = {
    id: randomUUID(),
    name,
    email,
    passwordHash: await hashPassword(password),
    role,
    createdAt: new Date().toISOString(),
  };
  db().insert(users).values(user).run();
  return { user: publish(user) };
}

export async function authenticate(email: string, password: string) {
  await readyDb();
  const user = db()
    .select()
    .from(users)
    .where(eq(users.email, email.trim().toLowerCase()))
    .get();
  if (!user || !(await verifyPassword(password, user.passwordHash))) return null;
  return publish(user);
}
