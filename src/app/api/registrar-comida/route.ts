import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getToken } from '@/lib/token';

export async function POST(req: NextRequest) {
  try {
    const token = await getToken();
    if (!token) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { fecha, tiempo_comida, item_plan_id, estado, nota } = await req.json();

    if (!fecha || !tiempo_comida || !estado) {
      return NextResponse.json(
        { error: 'Faltan campos obligatorios' },
        { status: 400 }
      );
    }

    const { error } = await supabase.rpc('nutri_paciente_registrar_comida', {
      p_token: token,
      p_fecha: fecha,
      p_tiempo_comida: tiempo_comida,
      p_item_plan_id: item_plan_id || null,
      p_estado: estado,
      p_nota: nota || null,
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
