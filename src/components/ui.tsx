'use client';

import { ButtonHTMLAttributes, ReactNode, useId } from 'react';
import { Loader2 } from 'lucide-react';

export const claseEntrada =
  'w-full min-h-12 rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-base text-slate-900 placeholder:text-slate-400 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/30';

const VARIANTES = {
  primario: 'bg-emerald-700 text-white hover:bg-emerald-800 disabled:bg-slate-300 disabled:text-slate-600',
  secundario: 'bg-white text-emerald-800 border border-emerald-300 hover:bg-emerald-50 disabled:text-slate-400 disabled:border-slate-200',
  fantasma: 'text-emerald-800 hover:bg-emerald-100 disabled:text-slate-400',
  peligro: 'bg-white text-red-700 border border-red-300 hover:bg-red-50 disabled:text-slate-400',
};

export const claseBoton = (variante: keyof typeof VARIANTES = 'primario') =>
  `inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-base font-semibold transition-colors ${VARIANTES[variante]}`;

export function Boton({
  variante = 'primario',
  cargando = false,
  className = '',
  children,
  type = 'button',
  disabled,
  ...resto
}: ButtonHTMLAttributes<HTMLButtonElement> & { variante?: keyof typeof VARIANTES; cargando?: boolean }) {
  return (
    <button type={type} disabled={disabled || cargando} className={`${claseBoton(variante)} ${className}`} {...resto}>
      {cargando && <Loader2 className="h-5 w-5 animate-spin" aria-hidden />}
      {children}
    </button>
  );
}

export function Campo({
  etiqueta, error, ayuda, children,
}: {
  etiqueta: string; error?: string; ayuda?: string;
  children: (props: { id: string; 'aria-invalid'?: boolean; 'aria-describedby'?: string }) => ReactNode;
}) {
  const id = useId();
  const idAyuda = `${id}-ayuda`;
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-slate-800">{etiqueta}</label>
      {children({ id, 'aria-invalid': error ? true : undefined, 'aria-describedby': error || ayuda ? idAyuda : undefined })}
      {(error || ayuda) && (
        <p id={idAyuda} className={`mt-1.5 text-sm ${error ? 'font-medium text-red-700' : 'text-slate-600'}`}>
          {error || ayuda}
        </p>
      )}
    </div>
  );
}

export function Tarjeta({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-2xl bg-white p-4 shadow-sm ${className}`}>{children}</div>;
}

export function Insignia({ texto, color = 'verde' }: { texto: string; color?: 'verde' | 'ambar' | 'rojo' | 'gris' | 'azul' }) {
  const colores = {
    verde: 'bg-emerald-100 text-emerald-800',
    ambar: 'bg-amber-100 text-amber-800',
    rojo: 'bg-red-100 text-red-800',
    gris: 'bg-slate-100 text-slate-700',
    azul: 'bg-sky-100 text-sky-800',
  };
  return <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${colores[color]}`}>{texto}</span>;
}

export function Separador() {
  return <hr className="border-slate-200" />;
}

export function Aviso({ tipo, children }: { tipo: 'info' | 'exito' | 'advertencia' | 'error'; children: ReactNode }) {
  const estilos = {
    info: 'bg-sky-50 border-sky-200 text-sky-900',
    exito: 'bg-emerald-50 border-emerald-200 text-emerald-900',
    advertencia: 'bg-amber-50 border-amber-200 text-amber-900',
    error: 'bg-red-50 border-red-200 text-red-900',
  };
  return <div className={`rounded-xl border p-3 text-sm ${estilos[tipo]}`}>{children}</div>;
}
