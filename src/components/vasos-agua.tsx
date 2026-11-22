'use client';

import { useEffect, useState } from 'react';

const ML_VASO = 250;

/** Vasos de agua del día: el paciente toca para llenarlos. Se guarda solo en su celular. */
export function VasosAgua({ metaMl, fecha }: { metaMl: number; fecha: string }) {
  const total = Math.max(1, Math.round(metaMl / ML_VASO));
  const clave = `nutri_agua_${fecha}`;
  const [llenos, setLlenos] = useState(0);

  useEffect(() => {
    try {
      const guardado = Number(localStorage.getItem(clave) ?? 0);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- lectura única de localStorage al montar
      if (guardado > 0) setLlenos(Math.min(guardado, total));
    } catch { /* sin almacenamiento: empieza en 0 */ }
  }, [clave, total]);

  const tocar = (i: number) => {
    const nuevo = i + 1 === llenos ? i : i + 1;
    setLlenos(nuevo);
    try { localStorage.setItem(clave, String(nuevo)); } catch { /* ignorar */ }
  };

  const litros = ((llenos * ML_VASO) / 1000).toFixed(1).replace('.0', '');
  const metaL = (metaMl / 1000).toFixed(1).replace('.0', '');

  return (
    <section className="rounded-3xl bg-gradient-to-br from-sky-50 to-cyan-50 p-4 ring-1 ring-sky-100 md:p-5">
      <div className="mb-3 flex items-end justify-between gap-2">
        <div>
          <h2 className="text-base font-bold text-sky-950">💧 Agua de hoy</h2>
          <p className="text-sm text-sky-800">Toca un vaso cada vez que tomes uno</p>
        </div>
        <p className="text-right text-sm font-semibold text-sky-900">
          <span className="text-2xl font-extrabold">{litros}</span> / {metaL} L
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: total }, (_, i) => {
          const lleno = i < llenos;
          return (
            <button
              key={i}
              type="button"
              onClick={() => tocar(i)}
              aria-label={`Vaso ${i + 1}${lleno ? ', tomado' : ''}`}
              aria-pressed={lleno}
              className={`relative h-12 w-9 overflow-hidden rounded-b-xl rounded-t-md border-2 transition-transform active:scale-90 ${lleno ? 'border-sky-500' : 'border-sky-200 bg-white'}`}
            >
              <span className={`absolute inset-x-0 bottom-0 bg-gradient-to-t from-sky-500 to-cyan-300 transition-all duration-300 ${lleno ? 'h-full' : 'h-0'}`} />
            </button>
          );
        })}
      </div>
      {llenos >= total && <p className="mt-3 text-sm font-bold text-sky-800">🎉 ¡Meta de agua cumplida!</p>}
    </section>
  );
}
