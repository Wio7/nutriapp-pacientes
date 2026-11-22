import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { setToken } from '@/lib/token';
import { normalizarCelular } from '@/lib/celular';

const MENSAJES: Record<string, string> = {
  DATOS_INVALIDOS: 'Revisa tu celular (9 dígitos) y tu código (6 dígitos).',
  CODIGO_INVALIDO: 'El celular o el código no coinciden. Revisa el mensaje de Camilo.',
  LIMITE_INTENTOS: 'Demasiados intentos. Espera 15 minutos y vuelve a probar.',
};

export async function POST(req: NextRequest) {
  try {
    const { celular, codigo } = await req.json();
    const accountId = process.env.NEXT_PUBLIC_WIOCRM_ACCOUNT_ID;
    if (!accountId) throw new Error('Falta NEXT_PUBLIC_WIOCRM_ACCOUNT_ID');

    const { data, error } = await supabase.rpc('nutri_paciente_entrar', {
      p_account_id: accountId,
      p_celular: normalizarCelular(String(celular ?? '')),
      p_codigo: String(codigo ?? '').replace(/\D/g, ''),
    });
    if (error) throw error;

    if (!data?.ok || !data.token) {
      const codigoError = String(data?.error ?? 'DATOS_INVALIDOS');
      return NextResponse.json(
        { error: MENSAJES[codigoError] ?? MENSAJES.DATOS_INVALIDOS, codigo: codigoError },
        { status: codigoError === 'LIMITE_INTENTOS' ? 429 : 401 }
      );
    }

    await setToken(data.token);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Error en /api/entrar:', err);
    return NextResponse.json({ error: 'No pudimos conectarnos. Inténtalo de nuevo.' }, { status: 500 });
  }
}
