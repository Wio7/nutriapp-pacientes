import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { clearToken, getToken } from '@/lib/token';

export async function POST(req: NextRequest) {
  try {
    const token = await getToken();
    if (token) {
      try {
        await supabase.rpc('nutri_paciente_salir', { p_token: token });
      } catch {
        // Ignorar si falla la llamada remota para no trabar el logout
      }
    }
    await clearToken();

    const url = new URL('/entrar', req.url);
    return NextResponse.redirect(url, { status: 303 });
  } catch {
    await clearToken();
    const url = new URL('/entrar', req.url);
    return NextResponse.redirect(url, { status: 303 });
  }
}
