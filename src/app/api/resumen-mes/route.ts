import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getToken } from '@/lib/token';
import { calcularMetricasMes, redactarResumenMesConDeepSeek } from '@/lib/ia/deepseek';
import type { EstadoFoodLog } from '@/lib/nutricion/types';

interface DatosResumen {
  ok: boolean;
  error?: string;
  ciclo_id: string;
  resumen_texto: string | null;
  resumen_numeros: unknown;
  nombre: string;
  dias_ciclo: number;
  comidas_por_dia: number;
  dias_rutina_semana: number;
  registros: { status: EstadoFoodLog | null; coincide: 'si' | 'parcial' | 'no' | null }[];
  pesos: { fecha: string; peso_kg: number }[];
  dias_rutina_hechos: number;
}

export async function POST() {
  try {
    const token = await getToken();
    if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const { data, error } = await supabase.rpc('nutri_paciente_resumen_datos', { p_token: token });
    if (error) throw error;
    const datos = data as DatosResumen;
    if (!datos?.ok) {
      const terminado = datos?.error !== 'SIN_CICLO_TERMINADO';
      return NextResponse.json(
        { error: terminado ? 'Tu sesión venció. Vuelve a entrar.' : 'Tu ciclo todavía no termina.' },
        { status: terminado ? 401 : 400 }
      );
    }

    // Una sola llamada a la IA por ciclo: si ya existe, se devuelve el guardado
    if (datos.resumen_texto) {
      return NextResponse.json({ resumen_texto: datos.resumen_texto, resumen_numeros: datos.resumen_numeros });
    }

    const metricas = calcularMetricasMes({
      foodLogs: datos.registros.map(r => ({
        status: r.status,
        revisionIA: r.coincide ? { que_se_ve: '', coincide: r.coincide, kcal_aprox: 0, comentario: '' } : undefined,
      })),
      totalEsperadoComidas: datos.dias_ciclo * datos.comidas_por_dia,
      pesos: datos.pesos.map(p => ({ fecha: p.fecha, pesoKg: Number(p.peso_kg) })),
      diasRutinaHechos: datos.dias_rutina_hechos,
      diasRutinaMeta: Math.round((datos.dias_rutina_semana * datos.dias_ciclo) / 7),
    });

    const texto = await redactarResumenMesConDeepSeek(metricas, datos.nombre?.split(' ')[0] || 'Hola');

    const { error: errGuardar } = await supabase.rpc('nutri_paciente_resumen_guardar', {
      p_token: token,
      p_ciclo_id: datos.ciclo_id,
      p_numeros: metricas,
      p_texto: texto,
    });
    if (errGuardar) throw errGuardar;

    return NextResponse.json({ resumen_texto: texto, resumen_numeros: metricas });
  } catch (err) {
    console.error('Error en /api/resumen-mes:', err);
    return NextResponse.json({ error: 'No se pudo armar tu resumen. Inténtalo de nuevo.' }, { status: 500 });
  }
}
