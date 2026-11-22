import { getToken } from '@/lib/token';
import { DEMO_MODE, DEMO_PESOS } from '@/lib/demo';
import { ProgresoCliente } from './progreso-cliente';

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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Tu progreso
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Línea de tiempo de tus avances, peso y cumplimiento.
        </p>
      </div>

      <ProgresoCliente datos={datos} />
    </div>
  );
}
