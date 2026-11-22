import { hoyLima } from '@/lib/fecha';
import { getToken } from '@/lib/token';
import { DEMO_MODE, DEMO_RUTINA } from '@/lib/demo';
import { RutinaCliente } from './rutina-cliente';
import { Encabezado } from '@/components/visual';

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
    <div className="space-y-5 md:space-y-6">
      <Encabezado emoji="🏃" titulo="Tu rutina" subtitulo="Los ejercicios que Camilo eligió para tu nivel" tono="naranja" />

      <RutinaCliente datos={datos} fecha={fechaIso} />
    </div>
  );
}
