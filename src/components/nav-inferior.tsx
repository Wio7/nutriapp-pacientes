'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Sun, Dumbbell, TrendingUp, Target, CalendarCheck } from 'lucide-react';

const ENLACES = [
  { href: '/hoy', icono: Sun, texto: 'Hoy' },
  { href: '/rutina', icono: Dumbbell, texto: 'Rutina' },
  { href: '/progreso', icono: TrendingUp, texto: 'Progreso' },
  { href: '/metas', icono: Target, texto: 'Metas' },
  { href: '/mi-mes', icono: CalendarCheck, texto: 'Mi mes' },
];

export function NavInferior() {
  const ruta = usePathname();
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-slate-200 bg-white/95 backdrop-blur-sm md:hidden">
      <ul className="grid grid-cols-5">
        {ENLACES.map(({ href, icono: Icono, texto }) => {
          const activo = ruta === href || ruta.startsWith(href + '/');
          return (
            <li key={href}>
              <Link
                href={href}
                className={`flex flex-col items-center gap-0.5 py-2 text-xs font-medium transition-colors ${activo ? 'text-emerald-700' : 'text-slate-500 hover:text-emerald-700'}`}
              >
                <Icono className={`h-5 w-5 ${activo ? 'stroke-[2.5]' : ''}`} />
                {texto}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
