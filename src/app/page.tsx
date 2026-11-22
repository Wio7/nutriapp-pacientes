import { redirect } from 'next/navigation';
import { getToken } from '@/lib/token';

export default async function HomePage() {
  const token = await getToken();
  if (token) redirect('/hoy');
  redirect('/entrar');
}
