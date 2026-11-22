import 'server-only';

import { cookies } from 'next/headers';

// Solo servidor. No usar 'use server': convertiría estas funciones en acciones que el navegador puede llamar.
const COOKIE = 'nutri_pac_token';
const OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/',
  maxAge: 60 * 60 * 24 * 90,
} as const;

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
