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
    <div className="min-h-screen bg-[#f3f9f5]">
      {/* Navegación lateral en escritorio */}
      <NavLateral nombre={nombre} />

      {/* Contenedor principal: en desktop deja espacio a la izquierda, en móvil deja espacio abajo */}
      <div className="md:pl-56">
        <header className="sticky top-0 z-20 border-b border-slate-200/60 bg-white/80 backdrop-blur-md px-4 py-3 md:hidden flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-700 text-white font-bold text-sm">
              N
            </span>
            <span className="font-bold text-slate-900">NutriApp</span>
          </div>
          {nombre && (
            <span className="text-xs font-medium text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
              {nombre.split(' ')[0]}
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
