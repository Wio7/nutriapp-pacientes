import { hoyLima } from '@/lib/fecha';
import { getToken } from '@/lib/token';
import { DEMO_MODE, DEMO_RUTINA } from '@/lib/demo';
import { RutinaCliente } from './rutina-cliente';

async function getRutina(token: string) {
  try {
    const { supabase } = await import('@/lib/supabase');
    const { data } = await supabase.rpc('nutri_paciente_rutina', { p_token: token });
    return data;
  } catch {
    return null;
  }
}

export default async function RutinaPage() {
  const token = await getToken();
  let datos = null;

  if (DEMO_MODE) {
    datos = {
      nivel: DEMO_RUTINA.nivel,
      template: {
        exercises: DEMO_RUTINA.ejercicios,
        days_per_week: DEMO_RUTINA.diasPorSemana,
      },
      hecho_hoy: DEMO_RUTINA.marcada,
    };
  } else if (token) {
    datos = await getRutina(token);
  }

  const fechaIso = hoyLima();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Tu rutina de ejercicio
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Sigue los ejercicios indicados por Camilo para tu nivel.
        </p>
      </div>

      <RutinaCliente datos={datos} fecha={fechaIso} />
    </div>
  );
}
