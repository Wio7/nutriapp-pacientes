import { getToken } from '@/lib/token';
import { DEMO_MODE, DEMO_PACIENTE } from '@/lib/demo';
import { MiMesCliente } from './mi-mes-cliente';

async function getMiMes(token: string) {
  try {
    const { supabase } = await import('@/lib/supabase');
    const { data } = await supabase.rpc('nutri_paciente_mi_mes', { p_token: token });
    return data;
  } catch {
    return null;
  }
}

export default async function MiMesPage() {
  const token = await getToken();
  let datos = null;

  if (DEMO_MODE) {
    datos = {
      nombre: DEMO_PACIENTE.nombre,
      ciclo: {
        id: 'demo-ciclo-001',
        status: 'por_renovar',
        starts_at: '2026-10-23',
        ends_at: '2026-11-22',
        summary_numbers: {
          pctCumplimiento: 86,
          comidasCumplidas: 129,
          comidasSaltadas: 8,
          cambioPesoKg: -1.5,
          diasRutinaCumplidos: 16,
          pctFotosCoinciden: 92,
        },
      },
      resumen_texto:
        '¡Felicitaciones, María! En estos 30 días demostraste una gran constancia alcanzando el 86% de cumplimiento en tus comidas y completando tus 16 días de rutina física. Lograste una reducción de 1.5 kg de forma saludable. En algunas cenas hubo comidas saltadas, pero tu adherencia general fue excelente. ¡Sigamos con esa misma fuerza en tu próximo mes junto a Camilo!',
      ciclo_nuevo_bloqueado: true,
      whatsapp_camilo: '51952686162',
    };
  } else if (token) {
    datos = await getMiMes(token);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Mi mes
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Cierre de ciclo de 30 días, balance y renovación de tu plan.
        </p>
      </div>

      <MiMesCliente datos={datos} />
    </div>
  );
}
