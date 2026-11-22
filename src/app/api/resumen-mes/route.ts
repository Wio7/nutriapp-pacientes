import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getToken } from '@/lib/token';
import {
  calcularMetricasMes,
  redactarResumenMesConDeepSeek,
} from '@/lib/ia/deepseek';

export async function POST(req: NextRequest) {
  try {
    const token = await getToken();
    if (!token) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { ciclo_id } = await req.json();

    const { data: pacienteData } = await supabase.rpc('nutri_pac_validar_token', {
      p_token: token,
    });

    if (!pacienteData || pacienteData.length === 0) {
      return NextResponse.json({ error: 'Sesión inválida' }, { status: 401 });
    }

    const { patient_id: patientId } = pacienteData[0];

    // Buscar ciclo
    let query = supabase.from('nutri_cycles').select('*').eq('patient_id', patientId);
    if (ciclo_id) query = query.eq('id', ciclo_id);
    else query = query.order('starts_at', { ascending: false }).limit(1);

    const { data: ciclo } = await query.maybeSingle();

    if (!ciclo) {
      return NextResponse.json({ error: 'Ciclo no encontrado' }, { status: 404 });
    }

    // Si ya tiene resumen redactado, devolverlo
    if (ciclo.summary_text) {
      return NextResponse.json({
        resumen_texto: ciclo.summary_text,
        resumen_numeros: ciclo.summary_numbers,
      });
    }

    // Obtener paciente
    const { data: paciente } = await supabase
      .from('nutri_patients')
      .select('full_name, weight_kg')
      .eq('id', patientId)
      .single();

    const nombre = paciente?.full_name || 'Paciente';

    // Obtener logs de comida del ciclo
    const { data: foodLogs } = await supabase
      .from('nutri_food_logs')
      .select('status, revision_ia')
      .eq('cycle_id', ciclo.id);

    // Obtener pesos
    const { data: mediciones } = await supabase
      .from('nutri_measurements')
      .select('measured_at, weight_kg')
      .eq('patient_id', patientId)
      .gte('measured_at', ciclo.starts_at)
      .lte('measured_at', ciclo.ends_at)
      .order('measured_at', { ascending: true });

    // Días de rutina
    const { count: diasRutinaCount } = await supabase
      .from('nutri_exercise_logs')
      .select('id', { count: 'exact', head: true })
      .eq('cycle_id', ciclo.id)
      .eq('done', true);

    const metricas = calcularMetricasMes({
      foodLogs: (foodLogs || []).map(f => ({
        status: f.status,
        revisionIA: f.revision_ia,
      })),
      totalEsperadoComidas: 30 * 5, // 30 días x 5 comidas = 150
      pesos: (mediciones || []).map(m => ({
        fecha: m.measured_at,
        pesoKg: Number(m.weight_kg),
      })),
      diasRutinaHechos: diasRutinaCount || 0,
      diasRutinaMeta: 16, // promedio 4 días x 4 semanas
    });

    const textoRedactado = await redactarResumenMesConDeepSeek(metricas, nombre);

    // Guardar en nutri_cycles
    await supabase
      .from('nutri_cycles')
      .update({
        summary_numbers: metricas,
        summary_text: textoRedactado,
        summary_generated_at: new Date().toISOString(),
      })
      .eq('id', ciclo.id);

    return NextResponse.json({
      resumen_texto: textoRedactado,
      resumen_numeros: metricas,
    });
  } catch (err: unknown) {
    const mensaje = err instanceof Error ? err.message : 'Error en resumen de mes';
    return NextResponse.json({ error: mensaje }, { status: 500 });
  }
}
