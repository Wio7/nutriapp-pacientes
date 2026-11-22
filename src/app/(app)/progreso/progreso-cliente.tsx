'use client';

import { hoyLima } from '@/lib/fecha';
import { useState } from 'react';
import { GraficoPeso } from '@/components/grafico-peso';
import { Boton, Tarjeta, Aviso } from '@/components/ui';
import { Scale, Dumbbell, Camera, TrendingDown, TrendingUp } from 'lucide-react';
import { DEMO_MODE } from '@/lib/demo';

interface SemanaCumplimiento {
  semana_inicio: string;
  total: number;
  cumplidas: number;
  pct: number;
}

interface PuntoPeso {
  fecha: string;
  peso_kg: number;
}

interface Props {
  datos: {
    pesos?: PuntoPeso[];
    cumplimiento_semanal?: SemanaCumplimiento[];
    dias_rutina?: number;
    fotos_subidas?: number;
  } | null;
}

export function ProgresoCliente({ datos }: Props) {
  const [pesos, setPesos] = useState<PuntoPeso[]>(datos?.pesos || []);
  const [nuevoPeso, setNuevoPeso] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [mensajeExito, setMensajeExito] = useState(false);
  const [error, setError] = useState('');

  const registrarPeso = async () => {
    setError('');
    const kg = parseFloat(nuevoPeso.replace(',', '.'));
    if (isNaN(kg) || kg < 25 || kg > 350) {
      setError('Ingresa un peso válido entre 25 y 350 kg.');
      return;
    }

    setGuardando(true);
    try {
      const hoy = hoyLima();
      if (DEMO_MODE) {
        setPesos(prev => [...prev, { fecha: hoy, peso_kg: kg }]);
        setMensajeExito(true);
        setNuevoPeso('');
        setTimeout(() => setMensajeExito(false), 2500);
        return;
      }

      const res = await fetch('/api/registrar-peso', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ peso_kg: kg, fecha: hoy }),
      });

      if (res.ok) {
        setPesos(prev => [...prev, { fecha: hoy, peso_kg: kg }]);
        setMensajeExito(true);
        setNuevoPeso('');
        setTimeout(() => setMensajeExito(false), 2500);
      } else {
        const json = await res.json();
        setError(json.error || 'No se pudo guardar el peso');
      }
    } catch {
      setError('Error de conexión');
    } finally {
      setGuardando(false);
    }
  };

  const semanas = datos?.cumplimiento_semanal || [];
  const diasRutina = datos?.dias_rutina ?? 0;
  const fotosSubidas = datos?.fotos_subidas ?? 0;

  // Cálculo de cambio de peso si hay al menos 2 registros
  let cambioPeso = null;
  if (pesos.length >= 2) {
    const inicial = pesos[0].peso_kg;
    const actual = pesos[pesos.length - 1].peso_kg;
    const diff = Math.round((actual - inicial) * 10) / 10;
    cambioPeso = diff;
  }

  return (
    <div className="space-y-6">
      {/* Formulario de registro de peso */}
      <Tarjeta className="border border-slate-200/60 p-5 space-y-3">
        <div className="flex items-center gap-2">
          <div className="rounded-xl bg-emerald-100 p-2 text-emerald-800">
            <Scale className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-bold text-slate-900 leading-tight">Anotar peso</h2>
            <p className="text-xs text-slate-500">Camilo sugiere pesarse 1 vez por semana en ayunas.</p>
          </div>
        </div>

        {mensajeExito && <Aviso tipo="exito">¡Peso guardado correctamente!</Aviso>}
        {error && <Aviso tipo="error">{error}</Aviso>}

        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              type="number"
              step="0.1"
              min="25"
              max="350"
              placeholder="Ej. 72.5"
              value={nuevoPeso}
              onChange={e => setNuevoPeso(e.target.value)}
              className="w-full min-h-12 rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-base text-slate-900 placeholder:text-slate-400 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/30 font-medium"
            />
            <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-sm text-slate-400 font-semibold pointer-events-none">
              kg
            </span>
          </div>
          <Boton onClick={registrarPeso} cargando={guardando} className="px-6">
            Guardar
          </Boton>
        </div>
      </Tarjeta>

      {/* Gráfico de peso */}
      <Tarjeta className="border border-slate-200/60 p-5 space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-bold text-slate-900">Evolución de peso</h2>
            <p className="text-xs text-slate-500">Historial de tus mediciones</p>
          </div>
          {cambioPeso !== null && (
            <div
              className={`inline-flex items-center gap-1 rounded-xl px-2.5 py-1 text-xs font-bold ${
                cambioPeso < 0
                  ? 'bg-emerald-100 text-emerald-800'
                  : cambioPeso > 0
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-slate-100 text-slate-700'
              }`}
            >
              {cambioPeso < 0 ? (
                <TrendingDown className="h-4 w-4" />
              ) : (
                <TrendingUp className="h-4 w-4" />
              )}
              {cambioPeso > 0 ? `+${cambioPeso}` : cambioPeso} kg
            </div>
          )}
        </div>
        <GraficoPeso datos={pesos} />
      </Tarjeta>

      {/* Resumen de actividad */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <Tarjeta className="border border-slate-200/60 p-4 text-center">
          <div className="mx-auto inline-flex rounded-2xl bg-emerald-100 p-2.5 text-emerald-800 mb-2">
            <Dumbbell className="h-6 w-6" />
          </div>
          <p className="text-3xl font-extrabold text-slate-900">{diasRutina}</p>
          <p className="text-xs font-semibold text-slate-500 mt-0.5">Días de rutina hechos</p>
        </Tarjeta>

        <Tarjeta className="border border-slate-200/60 p-4 text-center">
          <div className="mx-auto inline-flex rounded-2xl bg-sky-100 p-2.5 text-sky-800 mb-2">
            <Camera className="h-6 w-6" />
          </div>
          <p className="text-3xl font-extrabold text-slate-900">{fotosSubidas}</p>
          <p className="text-xs font-semibold text-slate-500 mt-0.5">Fotos de comidas enviadas</p>
        </Tarjeta>
      </div>

      {/* Barras de cumplimiento por semana */}
      <Tarjeta className="border border-slate-200/60 p-5 space-y-4">
        <div>
          <h2 className="font-bold text-slate-900">Cumplimiento por semana</h2>
          <p className="text-xs text-slate-500">Porcentaje de comidas marcadas como cumplidas</p>
        </div>

        {semanas.length === 0 ? (
          <p className="text-sm text-slate-400 py-3 text-center">
            Aún no hay semanas completas registradas en este ciclo.
          </p>
        ) : (
          <div className="space-y-3.5">
            {semanas.map((s, i) => {
              const fechaFormateada = new Date(`${s.semana_inicio}T12:00:00`).toLocaleDateString(
                'es-PE',
                { day: 'numeric', month: 'short' }
              );
              const colorBarra =
                s.pct >= 80
                  ? 'bg-emerald-600'
                  : s.pct >= 50
                  ? 'bg-amber-500'
                  : 'bg-red-500';

              return (
                <div key={i} className="space-y-1.5">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-slate-700">Semana del {fechaFormateada}</span>
                    <span className="text-slate-900">
                      {s.cumplidas}/{s.total} ({s.pct}%)
                    </span>
                  </div>
                  <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${colorBarra}`}
                      style={{ width: `${Math.min(100, Math.max(0, s.pct))}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Tarjeta>
    </div>
  );
}
