import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getToken } from '@/lib/token';

export async function POST(req: NextRequest) {
  try {
    const token = await getToken();
    if (!token) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { peso_kg, fecha } = await req.json();

    if (!peso_kg || typeof peso_kg !== 'number' || peso_kg < 25 || peso_kg > 350) {
      return NextResponse.json({ error: 'Peso inválido (25 a 350 kg)' }, { status: 400 });
    }

    const { error } = await supabase.rpc('nutri_paciente_registrar_peso', {
      p_token: token,
      p_peso_kg: peso_kg,
      p_fecha: fecha || new Date().toISOString().slice(0, 10),
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
