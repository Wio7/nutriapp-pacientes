'use server';

import { cookies } from 'next/headers';

const COOKIE = 'nutri_pac_token';
const OPTS = { httpOnly: true, secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 60 * 60 * 24 * 90 } as const;

export async function getToken(): Promise<string | null> {
  const store = await cookies();
  return store.get(COOKIE)?.value ?? null;
}

export async function setToken(token: string) {
  const store = await cookies();
  store.set(COOKIE, token, OPTS);
}

export async function clearToken() {
  const store = await cookies();
  store.delete(COOKIE);
}
