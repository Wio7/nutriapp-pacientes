import { getToken } from '@/lib/token';
import { DEMO_MODE, DEMO_PESOS } from '@/lib/demo';
import { ProgresoCliente } from './progreso-cliente';
import { Encabezado } from '@/components/visual';

async function getProgreso(token: string) {
  try {
    const { supabase } = await import('@/lib/supabase');
    const { data } = await supabase.rpc('nutri_paciente_progreso', { p_token: token });
    return data;
  } catch {
    return null;
  }
}

export default async function ProgresoPage() {
  const token = await getToken();
  let datos = null;

  if (DEMO_MODE) {
    datos = {
      pesos: DEMO_PESOS.map(p => ({ fecha: p.fecha, peso_kg: p.pesoKg })),
      cumplimiento_semanal: [
        { semana_inicio: '2026-11-01', total: 35, cumplidas: 30, pct: 86 },
        { semana_inicio: '2026-11-08', total: 35, cumplidas: 28, pct: 80 },
        { semana_inicio: '2026-11-15', total: 35, cumplidas: 32, pct: 91 },
      ],
      dias_rutina: 11,
      fotos_subidas: 8,
    };
  } else if (token) {
    datos = await getProgreso(token);
  }

  return (
    <div className="space-y-5 md:space-y-6">
      <Encabezado emoji="📈" titulo="Tu progreso" subtitulo="Tu peso y cuánto vas cumpliendo, semana a semana" tono="azul" />

      <ProgresoCliente datos={datos} />
    </div>
  );
}
