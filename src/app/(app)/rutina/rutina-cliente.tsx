'use client';

import { useState } from 'react';
import { CheckCircle2, Circle, Flame, Timer, RefreshCw } from 'lucide-react';
import { Boton, Tarjeta, Aviso } from '@/components/ui';
import { DEMO_MODE } from '@/lib/demo';

const NOMBRES_NIVEL: Record<string, string> = {
  nivel_cero: 'Nivel cero (adaptación)',
  principiante: 'Principiante',
  con_experiencia: 'Con experiencia',
  avanzado: 'Avanzado',
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

export function RutinaCliente({ datos, fecha }: { datos: DatosRutina | null; fecha: string }) {
  const [hecho, setHecho] = useState(datos?.hecho_hoy ?? false);
  const [cargando, setCargando] = useState(false);

  if (!datos?.template?.exercises?.length) {
    return (
      <Aviso tipo="info">
        Camilo aún no ha cargado la plantilla de rutina para tu nivel. Vuelve a consultar pronto.
      </Aviso>
    );
  }

  const ejercicios = datos.template.exercises;
  const nivelNombre = NOMBRES_NIVEL[datos.nivel || ''] || datos.nivel || 'Principiante';

  const toggleMarcar = async () => {
    if (DEMO_MODE) {
      setHecho(h => !h);
      return;
    }

    setCargando(true);
    try {
      const nuevoEstado = !hecho;
      const res = await fetch('/api/marcar-rutina', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fecha, hecho: nuevoEstado }),
      });
      if (res.ok) {
        setHecho(nuevoEstado);
      }
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Estado y acción */}
      <Tarjeta className="border border-slate-200/60 p-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-500" />
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Tu nivel asignado
              </span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 mt-0.5">{nivelNombre}</h2>
            {datos.template.days_per_week && (
              <p className="text-sm text-slate-500 mt-0.5">
                Objetivo: <strong>{datos.template.days_per_week} días</strong> a la semana
              </p>
            )}
          </div>

          <Boton
            variante={hecho ? 'secundario' : 'primario'}
            onClick={toggleMarcar}
            cargando={cargando}
            className="w-full sm:w-auto"
          >
            {hecho ? (
              <>
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                <span>Rutina de hoy completada ✓</span>
              </>
            ) : (
              <>
                <Circle className="h-5 w-5" />
                <span>Marcar rutina como hecha</span>
              </>
            )}
          </Boton>
        </div>
      </Tarjeta>

      {/* Lista de ejercicios */}
      <div className="space-y-3">
        <h3 className="text-base font-bold text-slate-900">Ejercicios de la rutina</h3>
        {ejercicios.map((ej, i) => (
          <Tarjeta key={i} className="flex items-start gap-3.5 border border-slate-100">
            <div className="flex-shrink-0 w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-sm">
              {i + 1}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-slate-900 leading-snug">{ej.nombre}</p>
              {ej.descripcion && (
                <p className="text-sm text-slate-500 mt-0.5">{ej.descripcion}</p>
              )}

              <div className="flex flex-wrap gap-2 mt-2">
                {ej.series && (
                  <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
                    <RefreshCw className="h-3 w-3 text-slate-500" /> {ej.series} series
                  </span>
                )}
                {ej.repeticiones && (
                  <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                    <Flame className="h-3 w-3 text-emerald-500" /> {ej.repeticiones} reps
                  </span>
                )}
                {ej.minutos && (
                  <span className="inline-flex items-center gap-1 rounded-lg bg-sky-50 px-2 py-0.5 text-xs font-semibold text-sky-700">
                    <Timer className="h-3 w-3 text-sky-500" />
                    {ej.minutos < 1
                      ? `${Math.round(ej.minutos * 60)} seg`
                      : `${ej.minutos} min`}
                  </span>
                )}
              </div>
            </div>
          </Tarjeta>
        ))}
      </div>
    </div>
  );
}
