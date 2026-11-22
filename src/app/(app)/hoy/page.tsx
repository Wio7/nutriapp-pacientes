import { getToken } from '@/lib/token';
import { DEMO_MODE, DEMO_COMIDAS_HOY, DEMO_PACIENTE } from '@/lib/demo';
import { TarjetaComidaWrapper } from './tarjeta-comida-wrapper';
import { Droplets, Calendar, Clock } from 'lucide-react';

async function getComidas(token: string) {
  try {
    const { supabase } = await import('@/lib/supabase');
    const { data } = await supabase.rpc('nutri_paciente_hoy', { p_token: token });
    return data;
  } catch {
    return null;
  }
}

export default async function HoyPage() {
  const token = await getToken();
  const fechaActual = new Date();
  const hoyTexto = fechaActual.toLocaleDateString('es-PE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
  const fechaIso = fechaActual.toISOString().slice(0, 10);

  interface ComidaItem {
    item_id: string;
    tiempo_comida: string;
    plato_nombre: string;
    medida_casera?: string;
    porcion?: number;
    hora?: string;
    calorias?: number;
    log?: {
      status: string;
      foto_path?: string;
    } | null;
  }

  let comidas: ComidaItem[] = [];
  let metaAguaMl: number | null = null;

  if (DEMO_MODE) {
    comidas = DEMO_COMIDAS_HOY.map(c => ({
      item_id: c.itemId,
      tiempo_comida: c.tiempoComida,
      plato_nombre: c.platoNombre,
      medida_casera: c.medidaCasera,
      calorias: c.macros.calorias,
      log: c.estado ? { status: c.estado } : null,
    }));
    metaAguaMl = DEMO_PACIENTE.pesoKg * 35;
  } else if (token) {
    const datos = await getComidas(token);
    comidas = (datos?.comidas as ComidaItem[]) || [];
    metaAguaMl = datos?.meta_agua_ml ?? null;
  }

  const HORAS_DEFECTO: Record<string, string> = {
    desayuno: '7:00',
    media_manana: '10:00',
    almuerzo: '13:00',
    media_tarde: '16:00',
    cena: '19:30',
  };

  const NOMBRES_TIEMPO: Record<string, string> = {
    desayuno: 'Desayuno',
    media_manana: 'Media mañana',
    almuerzo: 'Almuerzo',
    media_tarde: 'Media tarde',
    cena: 'Cena',
  };

  const metaAguaLitros = metaAguaMl ? (metaAguaMl / 1000).toFixed(1) : null;

  return (
    <div className="space-y-6">
      {/* Cabecera con fecha y agua */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-slate-500 text-sm mb-1">
            <Calendar className="h-4 w-4 text-emerald-600" />
            <span className="capitalize">{hoyTexto}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Comidas de hoy
          </h1>
        </div>

        {metaAguaLitros && (
          <div className="inline-flex items-center gap-2.5 rounded-2xl bg-sky-50 border border-sky-100 px-3.5 py-2 text-sky-900 shadow-xs self-start sm:self-auto">
            <div className="rounded-xl bg-sky-200/60 p-1.5 text-sky-700">
              <Droplets className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-sky-600 font-medium">Meta de agua</p>
              <p className="text-sm font-bold">{metaAguaLitros} litros / día</p>
            </div>
          </div>
        )}
      </div>

      {/* Lista de comidas */}
      {comidas.length === 0 ? (
        <div className="rounded-3xl bg-white border border-slate-200/60 p-8 text-center space-y-2">
          <Clock className="h-10 w-10 text-slate-400 mx-auto" />
          <h2 className="text-lg font-bold text-slate-800">Tu dieta se está preparando</h2>
          <p className="text-sm text-slate-500 max-w-sm mx-auto">
            Camilo está revisando tu plan de alimentación. Tan pronto lo publique, verás tus comidas aquí.
          </p>
        </div>
      ) : (
        <div className="space-y-3.5">
          {comidas.map(c => (
            <TarjetaComidaWrapper
              key={c.item_id}
              itemId={c.item_id}
              tiempo={NOMBRES_TIEMPO[c.tiempo_comida] || c.tiempo_comida}
              hora={c.hora || HORAS_DEFECTO[c.tiempo_comida] || ''}
              platoNombre={c.plato_nombre}
              medidaCasera={c.medida_casera}
              calorias={c.calorias}
              estadoActual={(c.log?.status as 'cumpli' | 'a_medias' | 'no') || null}
              fotoSubida={Boolean(c.log?.foto_path)}
              fecha={fechaIso}
            />
          ))}
        </div>
      )}
    </div>
  );
}
