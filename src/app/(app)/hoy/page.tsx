import { hoyLima } from '@/lib/fecha';
import { getToken } from '@/lib/token';
import { DEMO_MODE, DEMO_COMIDAS_HOY, DEMO_PACIENTE } from '@/lib/demo';
import { TarjetaComidaWrapper } from './tarjeta-comida-wrapper';
import { Anillo, estiloTiempo } from '@/components/visual';
import { VasosAgua } from '@/components/vasos-agua';

async function getComidas(token: string) {
  try {
    const { supabase } = await import('@/lib/supabase');
    const { data } = await supabase.rpc('nutri_paciente_hoy', { p_token: token });
    return data;
  } catch {
    return null;
  }
}

interface ComidaItem {
  item_id: string;
  tiempo_comida: string;
  plato_nombre: string;
  foto_url?: string | null;
  medida_casera?: string;
  porcion?: number;
  hora?: string;
  calorias?: number;
  log?: { status: string; foto_path?: string } | null;
}

const HORAS_DEFECTO: Record<string, string> = {
  desayuno: '7:00',
  media_manana: '10:00',
  almuerzo: '13:00',
  media_tarde: '16:00',
  cena: '19:30',
};

function saludo(horaLima: number): { texto: string; emoji: string } {
  if (horaLima < 12) return { texto: '¡Buenos días!', emoji: '☀️' };
  if (horaLima < 19) return { texto: '¡Buenas tardes!', emoji: '🌤️' };
  return { texto: '¡Buenas noches!', emoji: '🌙' };
}

export default async function HoyPage() {
  const token = await getToken();
  const ahora = new Date();
  const hoyTexto = ahora.toLocaleDateString('es-PE', { timeZone: 'America/Lima', weekday: 'long', day: 'numeric', month: 'long' });
  const horaLima = Number(ahora.toLocaleString('en-US', { timeZone: 'America/Lima', hour: 'numeric', hour12: false })) % 24;
  const fechaIso = hoyLima();

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

  const cumplidas = comidas.filter(c => c.log?.status === 'cumpli').length;
  const pct = comidas.length ? Math.round((cumplidas / comidas.length) * 100) : 0;
  const siguiente = comidas.find(c => !c.log?.status);
  const { texto: textoSaludo, emoji } = saludo(horaLima);

  return (
    <div className="space-y-5 md:space-y-6">
      {/* Resumen del día */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-600 via-emerald-500 to-teal-500 p-5 text-white shadow-lg shadow-emerald-900/10 md:p-7">
        <div aria-hidden className="pointer-events-none absolute -right-10 -top-12 h-44 w-44 rounded-full bg-white/15" />
        <div aria-hidden className="pointer-events-none absolute -bottom-14 left-24 h-32 w-32 rounded-full bg-white/10" />
        <div className="relative flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm font-medium text-white/85 first-letter:uppercase">{hoyTexto}</p>
            <h1 className="mt-1 text-2xl font-extrabold leading-tight md:text-3xl">
              {textoSaludo} <span aria-hidden>{emoji}</span>
            </h1>
            {comidas.length > 0 && (
              <p className="mt-2 text-sm text-white/95 md:text-base">
                {cumplidas === comidas.length
                  ? '¡Cumpliste todas tus comidas de hoy! 🏆'
                  : siguiente
                    ? <>Lo que sigue: <strong>{estiloTiempo(siguiente.tiempo_comida).emoji} {estiloTiempo(siguiente.tiempo_comida).nombre}</strong></>
                    : 'Sigue así, vas muy bien.'}
              </p>
            )}
          </div>
          {comidas.length > 0 && (
            <Anillo pct={pct} tam={104} grosor={11} color="#ffffff">
              <span className="text-2xl font-extrabold leading-none">{cumplidas}/{comidas.length}</span>
              <span className="mt-0.5 text-[11px] font-semibold uppercase tracking-wide text-white/90">comidas</span>
            </Anillo>
          )}
        </div>

        {/* Línea del día: un punto por comida */}
        {comidas.length > 0 && (
          <ol className="relative mt-5 flex items-center justify-between gap-1" aria-label="Tus comidas del día">
            <span aria-hidden className="absolute left-4 right-4 top-1/2 h-1 -translate-y-1/2 rounded-full bg-white/30" />
            {comidas.map(c => {
              const e = estiloTiempo(c.tiempo_comida);
              const estado = c.log?.status;
              return (
                <li key={c.item_id} className="relative flex flex-col items-center gap-1" title={e.nombre}>
                  <span
                    className={`flex h-10 w-10 items-center justify-center rounded-full text-lg ring-2 md:h-12 md:w-12 md:text-xl ${
                      estado === 'cumpli' ? 'bg-white ring-white' : estado ? 'bg-white/70 ring-white/70' : c === siguiente ? 'bg-amber-300 ring-white' : 'bg-white/25 ring-white/40'
                    }`}
                  >
                    {estado === 'cumpli' ? '✅' : estado === 'a_medias' ? '🌗' : estado === 'no' ? '❌' : e.emoji}
                  </span>
                </li>
              );
            })}
          </ol>
        )}
      </section>

      {/* Lista de comidas */}
      {comidas.length === 0 ? (
        <div className="space-y-2 rounded-3xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-100">
          <p className="text-5xl" aria-hidden>👨‍🍳</p>
          <h2 className="text-lg font-bold text-slate-800">Tu dieta se está preparando</h2>
          <p className="mx-auto max-w-sm text-sm text-slate-500">
            Camilo está revisando tu plan. Apenas lo publique, verás aquí tus comidas del día.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-[1fr_300px] md:items-start">
          <div className="space-y-4">
            <h2 className="text-lg font-extrabold text-slate-900">🍽️ Tus comidas de hoy</h2>
            {comidas.map(c => (
              <TarjetaComidaWrapper
                key={c.item_id}
                itemId={c.item_id}
                tiempoClave={c.tiempo_comida}
                tiempo={estiloTiempo(c.tiempo_comida).nombre}
                hora={c.hora || HORAS_DEFECTO[c.tiempo_comida] || ''}
                platoNombre={c.plato_nombre}
                medidaCasera={c.medida_casera}
                calorias={c.calorias}
                fotoPlato={c.foto_url}
                esSiguiente={c === siguiente}
                estadoActual={(c.log?.status as 'cumpli' | 'a_medias' | 'no') || null}
                fotoSubida={Boolean(c.log?.foto_path)}
                fecha={fechaIso}
              />
            ))}
          </div>
          {metaAguaMl && (
            <div className="md:sticky md:top-6 md:pt-11">
              <VasosAgua metaMl={metaAguaMl} fecha={fechaIso} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
