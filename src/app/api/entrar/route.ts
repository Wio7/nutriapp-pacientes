import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { setToken } from '@/lib/token';

export async function POST(req: NextRequest) {
  try {
    const { celular, codigo } = await req.json();

    if (!celular || !codigo) {
      return NextResponse.json(
        { error: 'Celular y código son requeridos' },
        { status: 400 }
      );
    }

    const accountId = process.env.NEXT_PUBLIC_WIOCRM_ACCOUNT_ID || '88cf5ef8-5803-461b-b0c3-ed8905977337';

    const { data: token, error } = await supabase.rpc('nutri_paciente_entrar', {
      p_account_id: accountId,
      p_celular: celular,
      p_codigo: codigo,
    });

    if (error) {
      const msg = error.message || '';
      let codigoError = 'ERROR_GENERAL';
      if (msg.includes('CELULAR_NO_REGISTRADO')) codigoError = 'CELULAR_NO_REGISTRADO';
      else if (msg.includes('CODIGO_INVALIDO')) codigoError = 'CODIGO_INVALIDO';
      else if (msg.includes('LIMITE_INTENTOS')) codigoError = 'LIMITE_INTENTOS';

      return NextResponse.json(
        { error: error.message, codigo: codigoError },
        { status: 401 }
      );
    }

    if (!token) {
      return NextResponse.json(
        { error: 'No se generó token de acceso', codigo: 'ERROR_TOKEN' },
        { status: 500 }
      );
    }

    await setToken(token);

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const mensaje = err instanceof Error ? err.message : 'Error inesperado';
    return NextResponse.json({ error: mensaje }, { status: 500 });
  }
}
