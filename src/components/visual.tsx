// Piezas visuales compartidas de la app del paciente: encabezados con color,
// anillos de avance y el estilo (emoji + degradé) de cada tiempo de comida.
import type { ReactNode } from 'react';

export const ESTILO_TIEMPO: Record<string, { emoji: string; nombre: string; fondo: string; suave: string; texto: string }> = {
  desayuno:     { emoji: '🥣', nombre: 'Desayuno',     fondo: 'from-amber-300 via-orange-300 to-rose-300', suave: 'bg-amber-50',   texto: 'text-amber-800' },
  media_manana: { emoji: '🍓', nombre: 'Media mañana', fondo: 'from-pink-300 via-rose-300 to-orange-200',  suave: 'bg-rose-50',    texto: 'text-rose-800' },
  almuerzo:     { emoji: '🍲', nombre: 'Almuerzo',     fondo: 'from-emerald-300 via-teal-300 to-lime-200', suave: 'bg-emerald-50', texto: 'text-emerald-800' },
  media_tarde:  { emoji: '🍎', nombre: 'Media tarde',  fondo: 'from-lime-300 via-emerald-200 to-teal-200', suave: 'bg-lime-50',    texto: 'text-lime-800' },
  cena:         { emoji: '🌙', nombre: 'Cena',         fondo: 'from-indigo-300 via-violet-300 to-sky-300', suave: 'bg-indigo-50',  texto: 'text-indigo-800' },
};

export function estiloTiempo(clave: string) {
  return ESTILO_TIEMPO[clave] ?? { emoji: '🍽️', nombre: clave, fondo: 'from-slate-200 to-slate-300', suave: 'bg-slate-50', texto: 'text-slate-700' };
}

const TONOS = {
  verde: 'from-emerald-600 via-emerald-500 to-teal-500',
  naranja: 'from-orange-500 via-amber-500 to-yellow-400',
  azul: 'from-sky-600 via-cyan-500 to-teal-400',
  morado: 'from-violet-600 via-fuchsia-500 to-pink-400',
};

/** Encabezado de pantalla: bloque de color con emoji grande, título y una línea. */
export function Encabezado({
  emoji, titulo, subtitulo, tono = 'verde', children,
}: {
  emoji: string; titulo: string; subtitulo?: string; tono?: keyof typeof TONOS; children?: ReactNode;
}) {
  return (
    <section className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${TONOS[tono]} p-5 text-white shadow-lg shadow-emerald-900/10 md:p-7`}>
      <div aria-hidden className="pointer-events-none absolute -right-8 -top-10 h-40 w-40 rounded-full bg-white/15" />
      <div aria-hidden className="pointer-events-none absolute -bottom-12 right-16 h-28 w-28 rounded-full bg-white/10" />
      <div className="relative flex items-center gap-4">
        <span aria-hidden className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/25 text-3xl backdrop-blur-sm md:h-16 md:w-16 md:text-4xl">
          {emoji}
        </span>
        <div className="min-w-0">
          <h1 className="text-2xl font-extrabold leading-tight tracking-tight md:text-3xl">{titulo}</h1>
          {subtitulo && <p className="mt-0.5 text-sm text-white/90 md:text-base">{subtitulo}</p>}
        </div>
      </div>
      {children && <div className="relative mt-4">{children}</div>}
    </section>
  );
}

/** Anillo de avance (0 a 100) con contenido al centro. */
export function Anillo({
  pct, tam = 96, grosor = 10, color = '#10b981', fondo = 'rgba(255,255,255,0.3)', children,
}: {
  pct: number; tam?: number; grosor?: number; color?: string; fondo?: string; children?: ReactNode;
}) {
  const r = (tam - grosor) / 2;
  const c = 2 * Math.PI * r;
  const valor = Math.max(0, Math.min(100, pct));
  return (
    <div className="relative inline-flex shrink-0 items-center justify-center" style={{ width: tam, height: tam }}>
      <svg width={tam} height={tam} className="-rotate-90" aria-hidden>
        <circle cx={tam / 2} cy={tam / 2} r={r} fill="none" stroke={fondo} strokeWidth={grosor} />
        <circle
          cx={tam / 2} cy={tam / 2} r={r} fill="none" stroke={color} strokeWidth={grosor} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - valor / 100)} className="transition-[stroke-dashoffset] duration-700"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">{children}</div>
    </div>
  );
}

/** Tarjeta de dato: ícono en círculo de color, número grande y etiqueta. */
export function Dato({
  emoji, valor, etiqueta, detalle, color = 'bg-emerald-100',
}: {
  emoji: string; valor: ReactNode; etiqueta: string; detalle?: string; color?: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
      <span aria-hidden className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-2xl ${color}`}>{emoji}</span>
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{etiqueta}</p>
        <p className="text-xl font-extrabold leading-tight text-slate-900">{valor}</p>
        {detalle && <p className="text-xs text-slate-500">{detalle}</p>}
      </div>
    </div>
  );
}
