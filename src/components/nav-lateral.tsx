'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Sun, Dumbbell, TrendingUp, Target, CalendarCheck, LogOut } from 'lucide-react';
import { BotonInstalar } from './boton-instalar';

const ENLACES = [
  { href: '/hoy', icono: Sun, texto: 'Hoy' },
  { href: '/rutina', icono: Dumbbell, texto: 'Rutina' },
  { href: '/progreso', icono: TrendingUp, texto: 'Progreso' },
  { href: '/metas', icono: Target, texto: 'Mis metas' },
  { href: '/mi-mes', icono: CalendarCheck, texto: 'Mi mes' },
];

export function NavLateral({ nombre }: { nombre?: string }) {
  const ruta = usePathname();
  return (
    <aside className="hidden md:flex md:w-56 md:flex-col md:fixed md:inset-y-0 md:border-r md:border-slate-200 md:bg-white">
      <div className="flex items-center gap-3 border-b border-slate-100 p-5">
        <span aria-hidden className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 text-2xl shadow-sm">🥗</span>
        <div className="min-w-0">
          <span className="text-lg font-extrabold text-slate-900">NutriApp</span>
          {nombre && <p className="truncate text-sm text-slate-500">👋 {nombre}</p>}
        </div>
      </div>
      <nav className="flex-1 p-3">
        <ul className="space-y-1">
          {ENLACES.map(({ href, icono: Icono, texto }) => {
            const activo = ruta === href || ruta.startsWith(href + '/');
            return (
              <li key={href}>
                <Link href={href} aria-current={activo ? 'page' : undefined} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${activo ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-sm' : 'text-slate-700 hover:bg-emerald-50'}`}>
                  <Icono className="h-5 w-5" />
                  {texto}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="p-3 space-y-2 border-t border-slate-100">
        <BotonInstalar className="w-full" />
        <form action="/api/salir" method="POST">
          <button type="submit" className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
            <LogOut className="h-4 w-4" /> Cerrar sesión
          </button>
        </form>
      </div>
    </aside>
  );
}
