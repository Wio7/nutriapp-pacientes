'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Aviso } from '@/components/ui';
import { DEMO_MODE } from '@/lib/demo';

const NIVELES: Record<string, { nombre: string; emoji: string }> = {
  nivel_cero: { nombre: 'Nivel cero', emoji: '🌱' },
  principiante: { nombre: 'Principiante', emoji: '🚶' },
  con_experiencia: { nombre: 'Con experiencia', emoji: '🏃' },
  avanzado: { nombre: 'Avanzado', emoji: '🔥' },
};

interface Ejercicio {
  nombre: string;
  series?: number | null;
  repeticiones?: number | null;
  minutos?: number | null;
  descripcion?: string;
}

interface DatosRutina {
  nivel?: string;
  template?: {
    exercises?: Ejercicio[];
    days_per_week?: number;
    notes?: string;
  };
  hecho_hoy?: boolean;
}

/** Emoji según el nombre del ejercicio, para reconocerlo de un vistazo. */
function emojiEjercicio(nombre: string): string {
  const n = nombre.toLowerCase();
  if (/camin/.test(n)) return '🚶';
  if (/trot|corr/.test(n)) return '🏃';
  if (/bici|cicl/.test(n)) return '🚴';
  if (/sentadill|zancad|pierna/.test(n)) return '🦵';
  if (/flexi|brazo|push/.test(n)) return '💪';
  if (/plancha|abdom|core/.test(n)) return '🧘';
  if (/salt|burpee|jump/.test(n)) return '🤸';
  if (/estir|movilid/.test(n)) return '🙆';
  if (/nad/.test(n)) return '🏊';
  return '🏋️';
}

const COLORES = ['bg-orange-100', 'bg-amber-100', 'bg-rose-100', 'bg-lime-100', 'bg-sky-100', 'bg-violet-100'];

export function RutinaCliente({ datos, fecha }: { datos: DatosRutina | null; fecha: string }) {
  const [hecho, setHecho] = useState(datos?.hecho_hoy ?? false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');

  if (!datos?.template?.exercises?.length) {
    return (
      <Aviso tipo="info">
        Camilo aún no ha cargado la rutina para tu nivel. Vuelve a mirar pronto.
      </Aviso>
    );
  }

  const ejercicios = datos.template.exercises;
  const nivel = NIVELES[datos.nivel || ''] ?? { nombre: datos.nivel || 'Principiante', emoji: '🚶' };
  const dias = datos.template.days_per_week;

  const toggleMarcar = async () => {
    if (DEMO_MODE) {
      setHecho(h => !h);
      return;
    }
    setCargando(true);
    setError('');
    try {
      const nuevoEstado = !hecho;
      const res = await fetch('/api/marcar-rutina', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fecha, hecho: nuevoEstado }),
      });
      if (res.ok) setHecho(nuevoEstado);
      else setError('No se pudo guardar. Revisa tu conexión.');
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Nivel y días */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
          <p className="text-3xl" aria-hidden>{nivel.emoji}</p>
          <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Tu nivel</p>
          <p className="text-lg font-extrabold text-slate-900">{nivel.nombre}</p>
        </div>
        <div className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
          <p className="text-3xl" aria-hidden>📅</p>
          <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Meta</p>
          <p className="text-lg font-extrabold text-slate-900">{dias ? `${dias} días / semana` : 'Cada semana'}</p>
        </div>
      </div>

      {/* Botón grande para marcar el día */}
      <button
        type="button"
        onClick={toggleMarcar}
        disabled={cargando}
        aria-pressed={hecho}
        className={`flex w-full items-center gap-4 rounded-3xl p-5 text-left shadow-md transition-all active:scale-[0.98] ${
          hecho ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white' : 'bg-white text-slate-900 ring-2 ring-dashed ring-orange-300 hover:ring-orange-400'
        }`}
      >
        <span aria-hidden className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-3xl ${hecho ? 'bg-white/25' : 'bg-orange-100'}`}>
          {cargando ? <Loader2 className="h-7 w-7 animate-spin" /> : hecho ? '🏆' : '👟'}
        </span>
        <span>
          <span className="block text-lg font-extrabold">{hecho ? '¡Rutina de hoy hecha!' : 'Toca cuando termines la rutina'}</span>
          <span className={`block text-sm ${hecho ? 'text-white/90' : 'text-slate-500'}`}>
            {hecho ? 'Toca de nuevo si te equivocaste' : 'Así Camilo ve tu avance'}
          </span>
        </span>
      </button>
      {error && <Aviso tipo="error">{error}</Aviso>}

      {/* Ejercicios */}
      <div className="space-y-3">
        <h2 className="text-lg font-extrabold text-slate-900">💪 Ejercicios</h2>
        <ol className="grid gap-3 md:grid-cols-2">
          {ejercicios.map((ej, i) => (
            <li key={i} className="flex items-center gap-3.5 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
              <span aria-hidden className={`relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-3xl ${COLORES[i % COLORES.length]}`}>
                {emojiEjercicio(ej.nombre)}
                <span className="absolute -left-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">{i + 1}</span>
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-bold leading-snug text-slate-900">{ej.nombre}</p>
                {ej.descripcion && <p className="text-sm text-slate-500">{ej.descripcion}</p>}
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {ej.series ? <span className="rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-bold text-violet-800">🔁 {ej.series} series</span> : null}
                  {ej.repeticiones ? <span className="rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-bold text-orange-800">🔥 {ej.repeticiones} veces</span> : null}
                  {ej.minutos ? (
                    <span className="rounded-full bg-sky-100 px-2.5 py-0.5 text-xs font-bold text-sky-800">
                      ⏱️ {ej.minutos < 1 ? `${Math.round(ej.minutos * 60)} seg` : `${ej.minutos} min`}
                    </span>
                  ) : null}
                </div>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
