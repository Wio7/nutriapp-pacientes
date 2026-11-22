import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { getToken } from '@/lib/token';
import { NavInferior } from '@/components/nav-inferior';
import { NavLateral } from '@/components/nav-lateral';
import { DEMO_MODE, DEMO_PACIENTE } from '@/lib/demo';

async function getNombre(token: string): Promise<string | undefined> {
  if (DEMO_MODE) return DEMO_PACIENTE.nombre;
  try {
    const { supabase } = await import('@/lib/supabase');
    const { data } = await supabase.rpc('nutri_paciente_mis_metas', { p_token: token });
    return data?.nombre;
  } catch {
    return undefined;
  }
}

export default async function AppLayout({ children }: { children: ReactNode }) {
  const token = await getToken();
  if (!token && !DEMO_MODE) {
    redirect('/entrar');
  }

  const nombre = token ? await getNombre(token) : DEMO_PACIENTE.nombre;

  return (
    <div className="fondo-app min-h-screen">
      {/* Navegación lateral en escritorio */}
      <NavLateral nombre={nombre} />

      {/* Contenedor principal: en desktop deja espacio a la izquierda, en móvil deja espacio abajo */}
      <div className="md:pl-56">
        <header className="sticky top-0 z-20 border-b border-slate-200/60 bg-white/80 backdrop-blur-md px-4 py-3 md:hidden flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span aria-hidden className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 text-lg shadow-sm">
              🥗
            </span>
            <span className="font-extrabold text-slate-900">NutriApp</span>
          </div>
          {nombre && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-orange-100 to-amber-100 px-3 py-1 text-sm font-bold text-orange-900">
              👋 {nombre.split(' ')[0]}
            </span>
          )}
        </header>

        <main className="mx-auto max-w-3xl px-4 py-6 pb-24 md:pb-12 md:py-8">
          {children}
        </main>
      </div>

      {/* Barra inferior en móvil */}
      <NavInferior />
    </div>
  );
}
