'use client';

import { useState } from 'react';
import { Camera, ChevronDown, Check, Minus, X } from 'lucide-react';
import { Boton, Tarjeta } from './ui';
import type { EstadoFoodLog } from '@/lib/nutricion/types';

interface Props {
  itemId: string;
  tiempo: string;
  hora: string;
  platoNombre: string;
  medidaCasera?: string;
  calorias?: number;
  estadoActual: EstadoFoodLog | null;
  onMarcar: (estado: EstadoFoodLog, nota?: string) => Promise<void>;
  onFoto: (archivo: File) => Promise<void>;
  fotoSubida?: boolean;
}

const ESTADOS: { id: EstadoFoodLog; texto: string; icono: typeof Check; color: string }[] = [
  { id: 'cumpli', texto: 'Lo cumplí', icono: Check, color: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
  { id: 'a_medias', texto: 'A medias', icono: Minus, color: 'bg-amber-100 text-amber-800 border-amber-300' },
  { id: 'no', texto: 'No lo comí', icono: X, color: 'bg-red-100 text-red-800 border-red-300' },
];

export function TarjetaComida({ itemId, tiempo, hora, platoNombre, medidaCasera, calorias, estadoActual, onMarcar, onFoto, fotoSubida }: Props) {
  const [abierto, setAbierto] = useState(false);
  const [nota, setNota] = useState('');
  const [cargando, setCargando] = useState<EstadoFoodLog | null>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [aviso, setAviso] = useState<{ texto: string; error: boolean } | null>(null);

  const estadoInfo = ESTADOS.find(e => e.id === estadoActual);

  const marcar = async (estado: EstadoFoodLog) => {
    setCargando(estado);
    setAviso(null);
    try {
      await onMarcar(estado, nota || undefined);
      setAbierto(false);
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
      setAviso({ texto: 'Foto recibida', error: false });
    } catch (err) {
      setAviso({ texto: err instanceof Error ? err.message : 'No se pudo subir la foto.', error: true });
    } finally {
      setSubiendo(false);
    }
  };

  return (
    <Tarjeta className="border border-slate-100">
      <button className="flex w-full items-start gap-3 text-left" onClick={() => setAbierto(a => !a)}>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{tiempo}</span>
            <span className="text-xs text-slate-400">{hora}</span>
            {estadoInfo && (
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${estadoInfo.color}`}>
                {estadoInfo.texto}
              </span>
            )}
            {fotoSubida && <span className="text-xs text-emerald-600 font-medium">📷 foto enviada</span>}
          </div>
          <p className="mt-0.5 font-semibold text-slate-900 leading-snug">{platoNombre}</p>
          {medidaCasera && <p className="text-sm text-slate-500">{medidaCasera}</p>}
          {calorias && <p className="text-xs text-slate-400">{calorias} kcal</p>}
        </div>
        <ChevronDown className={`h-5 w-5 text-slate-400 mt-0.5 flex-shrink-0 transition-transform ${abierto ? 'rotate-180' : ''}`} />
      </button>

      {abierto && (
        <div className="mt-3 pt-3 border-t border-slate-100 space-y-3">
          <div className="grid grid-cols-3 gap-2">
            {ESTADOS.map(({ id, texto, icono: Icono }) => (
              <button
                key={id}
                onClick={() => marcar(id)}
                disabled={cargando !== null}
                className={`flex flex-col items-center gap-1 rounded-xl border-2 p-2.5 text-xs font-semibold transition-colors ${estadoActual === id ? ESTADOS.find(e => e.id === id)!.color + ' border-current' : 'border-slate-200 text-slate-600 hover:border-emerald-300'}`}
              >
                {cargando === id ? '...' : <Icono className="h-4 w-4" />}
                {texto}
              </button>
            ))}
          </div>
          <textarea
            placeholder="Nota opcional (ej. comí menos arroz)"
            value={nota}
            onChange={e => setNota(e.target.value)}
            maxLength={500}
            rows={2}
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/30 resize-none"
          />
          <label className={`flex items-center gap-2 text-sm text-emerald-700 font-medium ${subiendo ? 'opacity-60' : 'cursor-pointer hover:underline'}`}>
            <Camera className="h-4 w-4" />
            {subiendo ? 'Subiendo foto...' : fotoSubida ? 'Cambiar foto' : 'Agregar foto'}
            <input type="file" accept="image/*" capture="environment" className="sr-only" onChange={subirFoto} disabled={subiendo} />
          </label>
        </div>
      )}
      {aviso && (
        <p role="status" className={`mt-2 text-sm font-medium ${aviso.error ? 'text-red-600' : 'text-emerald-700'}`}>
          {aviso.texto}
        </p>
      )}
    </Tarjeta>
  );
}
