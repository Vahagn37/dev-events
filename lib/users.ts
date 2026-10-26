import { randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { IUser, PublicUser } from '@/database';
import { hashPassword, verifyPassword } from '@/lib/passwords';

const usersPath = path.join(process.cwd(), 'data', 'users.json');
const emailPattern =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

type Box = { users?: IUser[]; ready?: Promise<void> };
const registry = globalThis as typeof globalThis & { __devUsers?: Box };
let writeChain = Promise.resolve();

function box() {
  registry.__devUsers ??= {};
  return registry.__devUsers;
}

async function ready() {
  const current = box();
  if (current.users) return current;
  current.ready ??= load(current).finally(() => {
    current.ready = undefined;
  });
  await current.ready;
  return current;
}

async function load(current: Box) {
  await mkdir(path.dirname(usersPath), { recursive: true });
  try {
    current.users = JSON.parse(await readFile(usersPath, 'utf8')) as IUser[];
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') current.users = [];
    else throw error;
  }
}

function persist(current: Box) {
  writeChain = writeChain
    .then(async () => {
      await mkdir(path.dirname(usersPath), { recursive: true });
      await writeFile(usersPath, JSON.stringify(current.users, null, 2));
    })
    .catch((error) => {
      console.error('failed to write users', error);
    });
  return writeChain;
}

function publish(user: IUser): PublicUser {
  return {
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role === 'admin' ? 'admin' : 'user',
  };
}

export async function listUsers(): Promise<PublicUser[]> {
  const current = await ready();
  return (current.users ?? []).map(publish);
}

export async function findUser(id: string) {
  const current = await ready();
  const user = current.users?.find((item) => item._id === id);
  return user ? publish(user) : null;
}

export async function registerUser(input: {
  name: string;
  email: string;
  password: string;
}): Promise<{ user: PublicUser } | { error: string }> {
  const current = await ready();
  const name = input.name.trim();
  const email = input.email.trim().toLowerCase();
  const password = input.password;

  if (!name || name.length > 80) return { error: 'Name is required' };
  if (!emailPattern.test(email)) return { error: 'Enter a valid email address' };
  if (password.length < 8) return { error: 'Password must be at least 8 characters' };
  if (current.users?.some((user) => user.email === email)) {
    return { error: 'An account with this email already exists' };
  }

  const user: IUser = {
    _id: randomUUID(),
    name,
    email,
    passwordHash: await hashPassword(password),
    role: 'user',
    createdAt: new Date().toISOString(),
  };
  current.users?.push(user);
  await persist(current);
  return { user: publish(user) };
}

export async function authenticate(email: string, password: string) {
  const current = await ready();
  const user = current.users?.find((item) => item.email === email.trim().toLowerCase());
  if (!user || !(await verifyPassword(password, user.passwordHash))) return null;
  return publish(user);
}
