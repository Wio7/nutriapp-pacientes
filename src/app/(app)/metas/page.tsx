import { getToken } from '@/lib/token';
import { DEMO_MODE, DEMO_PACIENTE } from '@/lib/demo';
import { Tarjeta } from '@/components/ui';
import { Target, Droplets, Flame, Scale, Calendar, Dumbbell, Award } from 'lucide-react';

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
  nivel_cero: 'Nivel cero',
  principiante: 'Principiante',
  con_experiencia: 'Con experiencia',
  avanzado: 'Avanzado',
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
  const diasFaltan = datos?.dias_que_faltan ?? 0;
  const nivel = datos?.nivel_ejercicio ? NIVELES[datos.nivel_ejercicio] || datos.nivel_ejercicio : 'Principiante';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Mis metas
        </h1>
        {datos?.nombre && (
          <p className="text-slate-500 text-sm mt-1">
            Plan diseñado por Camilo Villafranca para {datos.nombre}.
          </p>
        )}
      </div>

      {/* Tarjeta destacada de ciclo */}
      <Tarjeta className="border-2 border-emerald-600/20 bg-gradient-to-br from-emerald-50/50 to-white p-6 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-emerald-800">
            <Calendar className="h-5 w-5" />
            <span className="font-bold text-sm">Ciclo actual (30 días)</span>
          </div>
          <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-extrabold text-emerald-800">
            Activo
          </span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-4xl font-extrabold text-slate-900">{diasFaltan}</span>
          <span className="text-sm font-semibold text-slate-500">días restantes de tu ciclo</span>
        </div>
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200/70">
          <div
            className="h-full rounded-full bg-emerald-600 transition-all duration-500"
            style={{ width: `${Math.round(((30 - diasFaltan) / 30) * 100)}%` }}
          />
        </div>
      </Tarjeta>

      {/* Grid de objetivos nutricionales */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Peso */}
        <Tarjeta className="border border-slate-200/60 p-5 flex items-start gap-4">
          <div className="rounded-2xl bg-emerald-100 p-3 text-emerald-800">
            <Scale className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Control de peso
            </p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-slate-900">{pesoActual ?? '—'} kg</span>
              {pesoObjetivo && (
                <span className="text-xs font-bold text-emerald-700">
                  (Meta: {pesoObjetivo} kg)
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {pesoObjetivo
                ? `Faltan ${Math.abs(Math.round(((pesoActual ?? 0) - pesoObjetivo) * 10) / 10)} kg para tu meta`
                : 'Mantente constante pesándote semanalmente'}
            </p>
          </div>
        </Tarjeta>

        {/* Calorías */}
        <Tarjeta className="border border-slate-200/60 p-5 flex items-start gap-4">
          <div className="rounded-2xl bg-orange-100 p-3 text-orange-800">
            <Flame className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Calorías diarias
            </p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-slate-900">{calorias ?? '—'}</span>
              <span className="text-xs font-bold text-slate-500">kcal / día</span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Distribuido en tus 5 tiempos de comida
            </p>
          </div>
        </Tarjeta>

        {/* Agua */}
        <Tarjeta className="border border-slate-200/60 p-5 flex items-start gap-4">
          <div className="rounded-2xl bg-sky-100 p-3 text-sky-800">
            <Droplets className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Hidratación
            </p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-slate-900">{metaAguaL ?? '—'}</span>
              <span className="text-xs font-bold text-slate-500">litros de agua / día</span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Equivale a 35 ml por cada kg de tu peso
            </p>
          </div>
        </Tarjeta>

        {/* Nivel Ejercicio */}
        <Tarjeta className="border border-slate-200/60 p-5 flex items-start gap-4">
          <div className="rounded-2xl bg-purple-100 p-3 text-purple-800">
            <Dumbbell className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Nivel de ejercicio
            </p>
            <div className="mt-1">
              <span className="text-lg font-bold text-slate-900">{nivel}</span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Camilo puede subir de nivel tu rutina al renovar tu ciclo
            </p>
          </div>
        </Tarjeta>
      </div>
    </div>
  );
}
