import { getToken } from '@/lib/token';
import { DEMO_MODE, DEMO_PACIENTE } from '@/lib/demo';
import { Anillo, Dato, Encabezado } from '@/components/visual';

async function getMetas(token: string) {
  try {
    const { supabase } = await import('@/lib/supabase');
    const { data } = await supabase.rpc('nutri_paciente_mis_metas', { p_token: token });
    return data;
  } catch {
    return null;
  }
}

const NIVELES: Record<string, string> = {
  nivel_cero: '🌱 Nivel cero',
  principiante: '🚶 Principiante',
  con_experiencia: '🏃 Con experiencia',
  avanzado: '🔥 Avanzado',
};

export default async function MetasPage() {
  const token = await getToken();
  let datos = null;

  if (DEMO_MODE) {
    datos = {
      nombre: DEMO_PACIENTE.nombre,
      peso_actual_kg: DEMO_PACIENTE.pesoKg,
      peso_objetivo_kg: DEMO_PACIENTE.pesoObjetivoKg,
      calorias_objetivo: DEMO_PACIENTE.caloriasObjetivo,
      meta_agua_ml: DEMO_PACIENTE.pesoKg * 35,
      dias_que_faltan: 22,
      dias_totales_ciclo: 30,
      nivel_ejercicio: DEMO_PACIENTE.nivelEjercicio,
    };
  } else if (token) {
    datos = await getMetas(token);
  }

  const pesoActual = datos?.peso_actual_kg ?? null;
  const pesoObjetivo = datos?.peso_objetivo_kg ?? null;
  const calorias = datos?.calorias_objetivo ?? null;
  const metaAguaL = datos?.meta_agua_ml ? (datos.meta_agua_ml / 1000).toFixed(1) : null;
  const diasTotales = datos?.dias_totales_ciclo ?? 30;
  const diasFaltan = datos?.dias_que_faltan ?? 0;
  const diasHechos = Math.max(0, diasTotales - diasFaltan);
  const pctCiclo = Math.round((diasHechos / diasTotales) * 100);
  const nivel = datos?.nivel_ejercicio ? NIVELES[datos.nivel_ejercicio] || datos.nivel_ejercicio : '🚶 Principiante';
  const faltaPeso = pesoActual != null && pesoObjetivo != null ? Math.abs(Math.round((pesoActual - pesoObjetivo) * 10) / 10) : null;

  return (
    <div className="space-y-5 md:space-y-6">
      <Encabezado
        emoji="🎯"
        titulo="Mis metas"
        subtitulo={datos?.nombre ? `Tu plan con Camilo, ${datos.nombre.split(' ')[0]}` : 'Tu plan con Camilo'}
        tono="morado"
      >
        <div className="flex items-center gap-4 rounded-2xl bg-white/15 p-3 backdrop-blur-sm">
          <Anillo pct={pctCiclo} tam={84} grosor={9} color="#ffffff">
            <span className="text-xl font-extrabold leading-none">{diasFaltan}</span>
            <span className="text-[10px] font-semibold uppercase">días</span>
          </Anillo>
          <div>
            <p className="text-lg font-extrabold leading-tight">Te quedan {diasFaltan} días de tu mes</p>
            <p className="text-sm text-white/90">Llevas {diasHechos} de {diasTotales} días 💪</p>
          </div>
        </div>
      </Encabezado>

      <div className="grid gap-3 sm:grid-cols-2">
        <Dato
          emoji="⚖️"
          etiqueta="Peso"
          valor={<>{pesoActual ?? '—'} kg{pesoObjetivo ? <span className="ml-1 text-sm font-bold text-emerald-700">→ {pesoObjetivo} kg</span> : null}</>}
          detalle={faltaPeso ? `Te faltan ${faltaPeso} kg para tu meta` : 'Pésate una vez por semana'}
          color="bg-emerald-100"
        />
        <Dato emoji="🔥" etiqueta="Calorías al día" valor={<>{calorias ?? '—'} <span className="text-sm font-bold text-slate-500">kcal</span></>} detalle="Repartidas en tus 5 comidas" color="bg-orange-100" />
        <Dato emoji="💧" etiqueta="Agua al día" valor={<>{metaAguaL ?? '—'} <span className="text-sm font-bold text-slate-500">litros</span></>} detalle="35 ml por cada kg de tu peso" color="bg-sky-100" />
        <Dato emoji="🏅" etiqueta="Nivel de ejercicio" valor={nivel} detalle="Camilo lo sube cuando renuevas" color="bg-violet-100" />
      </div>
    </div>
  );
}
