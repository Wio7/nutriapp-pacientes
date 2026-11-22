'use client';

import { useState } from 'react';
import { Camera, Check, Clock, Loader2, MessageSquarePlus } from 'lucide-react';
import type { EstadoFoodLog } from '@/lib/nutricion/types';
import { estiloTiempo } from './visual';

interface Props {
  itemId: string;
  tiempoClave: string;
  tiempo: string;
  hora: string;
  platoNombre: string;
  medidaCasera?: string;
  calorias?: number;
  fotoPlato?: string | null;
  esSiguiente?: boolean;
  estadoActual: EstadoFoodLog | null;
  onMarcar: (estado: EstadoFoodLog, nota?: string) => Promise<void>;
  onFoto: (archivo: File) => Promise<void>;
  fotoSubida?: boolean;
}

const ESTADOS: { id: EstadoFoodLog; emoji: string; texto: string; activo: string }[] = [
  { id: 'cumpli', emoji: '✅', texto: 'Lo comí', activo: 'bg-emerald-500 text-white ring-emerald-500' },
  { id: 'a_medias', emoji: '🌗', texto: 'A medias', activo: 'bg-amber-400 text-amber-950 ring-amber-400' },
  { id: 'no', emoji: '❌', texto: 'No', activo: 'bg-rose-500 text-white ring-rose-500' },
];

export function TarjetaComida({
  tiempoClave, tiempo, hora, platoNombre, medidaCasera, calorias, fotoPlato, esSiguiente,
  estadoActual, onMarcar, onFoto, fotoSubida,
}: Props) {
  const [nota, setNota] = useState('');
  const [verNota, setVerNota] = useState(false);
  const [cargando, setCargando] = useState<EstadoFoodLog | null>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [aviso, setAviso] = useState<{ texto: string; error: boolean } | null>(null);
  const estilo = estiloTiempo(tiempoClave);
  const hecha = estadoActual === 'cumpli';

  const marcar = async (estado: EstadoFoodLog) => {
    setCargando(estado);
    setAviso(null);
    try {
      await onMarcar(estado, nota || undefined);
      if (estado === 'cumpli') setAviso({ texto: '¡Bien hecho! 🎉', error: false });
      setVerNota(false);
    } catch (err) {
      setAviso({ texto: err instanceof Error ? err.message : 'No se pudo guardar.', error: true });
    } finally {
      setCargando(null);
    }
  };

  const subirFoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const archivo = e.target.files?.[0];
    e.target.value = '';
    if (!archivo) return;
    setSubiendo(true);
    setAviso(null);
    try {
      await onFoto(archivo);
      setAviso({ texto: '📸 Foto enviada a Camilo', error: false });
    } catch (err) {
      setAviso({ texto: err instanceof Error ? err.message : 'No se pudo subir la foto.', error: true });
    } finally {
      setSubiendo(false);
    }
  };

  return (
    <article
      className={`overflow-hidden rounded-3xl bg-white shadow-sm transition-shadow ${
        esSiguiente ? 'shadow-lg shadow-emerald-900/10 ring-2 ring-emerald-400' : hecha ? 'ring-2 ring-emerald-200' : 'ring-1 ring-slate-100'
      }`}
    >
      <div className="flex gap-3 p-3 md:gap-4 md:p-4">
        {/* Imagen del plato o ilustración del tiempo de comida */}
        <div className={`relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl bg-gradient-to-br ${estilo.fondo} md:h-28 md:w-28`}>
          {fotoPlato ? (
            // eslint-disable-next-line @next/next/no-img-element -- foto pública del plato en Supabase Storage
            <img src={fotoPlato} alt={platoNombre} className="h-full w-full object-cover" loading="lazy" />
          ) : (
            <span aria-hidden className="flex h-full w-full items-center justify-center text-5xl drop-shadow-sm">{estilo.emoji}</span>
          )}
          {hecha && (
            <span className="absolute inset-0 flex items-center justify-center bg-emerald-600/55">
              <Check className="h-10 w-10 text-white" strokeWidth={3} aria-label="Comida cumplida" />
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${estilo.suave} ${estilo.texto}`}>
              {estilo.emoji} {tiempo}
            </span>
            {hora && (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-500">
                <Clock className="h-3.5 w-3.5" aria-hidden /> {hora}
              </span>
            )}
            {esSiguiente && !estadoActual && (
              <span className="animate-pulse rounded-full bg-emerald-600 px-2 py-0.5 text-xs font-bold text-white">Ahora</span>
            )}
          </div>
          <h3 className="mt-1 text-base font-bold leading-snug text-slate-900 md:text-lg">{platoNombre}</h3>
          <p className="mt-0.5 text-sm text-slate-500">
            {[medidaCasera, calorias ? `${calorias} kcal` : null].filter(Boolean).join(' · ')}
          </p>
          {fotoSubida && <p className="mt-1 text-xs font-semibold text-emerald-700">📸 Foto enviada</p>}
        </div>
      </div>

      {/* Acciones a un toque */}
      <div className="grid grid-cols-3 gap-2 px-3 pb-3 md:px-4">
        {ESTADOS.map(e => {
          const activo = estadoActual === e.id;
          return (
            <button
              key={e.id}
              type="button"
              onClick={() => marcar(e.id)}
              disabled={cargando !== null}
              aria-pressed={activo}
              className={`flex min-h-12 items-center justify-center gap-1 whitespace-nowrap rounded-2xl px-1.5 text-[13px] font-bold md:text-sm ring-1 transition-all active:scale-95 ${
                activo ? e.activo : 'bg-slate-50 text-slate-700 ring-slate-200 hover:bg-white'
              }`}
            >
              {cargando === e.id ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <span aria-hidden>{e.emoji}</span>}
              {e.texto}
            </button>
          );
        })}
      </div>

      <div className="flex border-t border-slate-100 text-sm font-semibold">
        <label className={`flex flex-1 items-center justify-center gap-2 py-3 text-emerald-700 ${subiendo ? 'opacity-60' : 'cursor-pointer hover:bg-emerald-50'}`}>
          {subiendo ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Camera className="h-4 w-4" aria-hidden />}
          {subiendo ? 'Subiendo…' : fotoSubida ? 'Cambiar foto' : 'Foto de mi plato'}
          <input type="file" accept="image/*" capture="environment" className="sr-only" onChange={subirFoto} disabled={subiendo} />
        </label>
        <button
          type="button"
          onClick={() => setVerNota(v => !v)}
          className="flex flex-1 items-center justify-center gap-2 border-l border-slate-100 py-3 text-slate-600 hover:bg-slate-50"
          aria-expanded={verNota}
        >
          <MessageSquarePlus className="h-4 w-4" aria-hidden /> Nota
        </button>
      </div>

      {verNota && (
        <div className="border-t border-slate-100 p-3">
          <textarea
            placeholder="Ej.: comí menos arroz. Luego toca cómo te fue."
            value={nota}
            onChange={e => setNota(e.target.value)}
            maxLength={500}
            rows={2}
            className="w-full resize-none rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/30"
          />
        </div>
      )}

      {aviso && (
        <p role="status" className={`px-4 pb-3 text-sm font-semibold ${aviso.error ? 'text-rose-600' : 'text-emerald-700'}`}>
          {aviso.texto}
        </p>
      )}
    </article>
  );
}
