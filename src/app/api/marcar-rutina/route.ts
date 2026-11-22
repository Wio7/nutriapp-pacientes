import { hoyLima } from '@/lib/fecha';
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getToken } from '@/lib/token';

export async function POST(req: NextRequest) {
  try {
    const token = await getToken();
    if (!token) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { fecha, hecho } = await req.json();

    const { error } = await supabase.rpc('nutri_paciente_marcar_rutina', {
      p_token: token,
      p_fecha: fecha || hoyLima(),
      p_hecho: Boolean(hecho),
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const mensaje = err instanceof Error ? err.message : 'Error interno';
    return NextResponse.json({ error: mensaje }, { status: 500 });
  }
}
