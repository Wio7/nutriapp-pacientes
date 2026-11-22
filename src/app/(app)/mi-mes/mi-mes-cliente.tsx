'use client';

import { useState } from 'react';
import { Lock, MessageCircle, Sparkles, CheckCircle, AlertTriangle, ArrowRight } from 'lucide-react';
import { Boton, Tarjeta, Aviso } from '@/components/ui';

interface Props {
  datos: {
    nombre?: string;
    ciclo?: {
      id?: string;
      status?: string;
      starts_at?: string;
      ends_at?: string;
      summary_numbers?: {
        pctCumplimiento?: number;
        comidasCumplidas?: number;
        comidasSaltadas?: number;
        cambioPesoKg?: number;
        diasRutinaCumplidos?: number;
        pctFotosCoinciden?: number;
      };
    };
    resumen_texto?: string | null;
    ciclo_nuevo_bloqueado?: boolean;
    whatsapp_camilo?: string;
  } | null;
}

export function MiMesCliente({ datos }: Props) {
  const [resumen, setResumen] = useState<string | null>(datos?.resumen_texto || null);
  const [generando, setGenerando] = useState(false);

  const nombrePaciente = datos?.nombre || 'Paciente';
  const ciclo = datos?.ciclo;
  const status = ciclo?.status || 'activo';
  const estaPorRenovar = status === 'por_renovar' || status === 'pagado';
  const tieneDietaBloqueada = Boolean(datos?.ciclo_nuevo_bloqueado) || estaPorRenovar;

  const wa = datos?.whatsapp_camilo || '51952686162';
  const textoWhatsApp = encodeURIComponent(
    `Hola Camilo, soy ${nombrePaciente}. Ya terminé mi ciclo de 30 días y quiero renovar para recibir mi nuevo plan de alimentación.`
  );
  const waUrl = `https://wa.me/${wa}?text=${textoWhatsApp}`;

  const solicitarResumen = async () => {
    if (!ciclo?.id) return;
    setGenerando(true);
    try {
      const res = await fetch('/api/resumen-mes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ciclo_id: ciclo.id }),
      });
      if (res.ok) {
        const json = await res.json();
        setResumen(json.resumen_texto);
      }
    } finally {
      setGenerando(false);
    }
  };

  const metricas = ciclo?.summary_numbers;

  return (
    <div className="space-y-6">
      {/* Estado del ciclo */}
      {!estaPorRenovar && (
        <Aviso tipo="info">
          Tu ciclo de 30 días está actualmente en curso. Cuando concluya el periodo, verás aquí el resumen completo de tus logros y la evaluación del mes.
        </Aviso>
      )}

      {/* Resumen del mes si ya concluyó o si está disponible */}
      {resumen ? (
        <Tarjeta className="border-2 border-emerald-500/30 bg-gradient-to-br from-emerald-50/70 via-white to-emerald-50/30 p-6 space-y-4">
          <div className="flex items-center gap-2 text-emerald-800">
            <Sparkles className="h-5 w-5 text-emerald-600" />
            <h2 className="text-lg font-bold">Tu resumen del mes</h2>
          </div>
          <p className="text-slate-800 leading-relaxed text-base font-normal">
            {resumen}
          </p>

          {metricas && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3 border-t border-emerald-100 text-center">
              <div className="p-2 rounded-xl bg-white/80 border border-emerald-100">
                <p className="text-xl font-bold text-emerald-700">{metricas.pctCumplimiento}%</p>
                <p className="text-xs text-slate-500">Cumplimiento</p>
              </div>
              <div className="p-2 rounded-xl bg-white/80 border border-emerald-100">
                <p className="text-xl font-bold text-slate-800">{metricas.comidasSaltadas}</p>
                <p className="text-xs text-slate-500">Saltadas</p>
              </div>
              <div className="p-2 rounded-xl bg-white/80 border border-emerald-100">
                <p className="text-xl font-bold text-emerald-700">
                  {metricas.cambioPesoKg !== undefined ? `${metricas.cambioPesoKg > 0 ? '+' : ''}${metricas.cambioPesoKg} kg` : '—'}
                </p>
                <p className="text-xs text-slate-500">Variación peso</p>
              </div>
              <div className="p-2 rounded-xl bg-white/80 border border-emerald-100">
                <p className="text-xl font-bold text-slate-800">{metricas.diasRutinaCumplidos}</p>
                <p className="text-xs text-slate-500">Días rutina</p>
              </div>
            </div>
          )}
        </Tarjeta>
      ) : estaPorRenovar ? (
        <Tarjeta className="border border-slate-200/60 p-6 text-center space-y-3">
          <Sparkles className="h-8 w-8 text-emerald-600 mx-auto" />
          <h2 className="text-lg font-bold text-slate-900">¿Listo para ver tu balance del mes?</h2>
          <p className="text-sm text-slate-500 max-w-md mx-auto">
            Calcula tus estadísticas del mes y genera un resumen personalizado de tus avances.
          </p>
          <Boton onClick={solicitarResumen} cargando={generando} className="px-6">
            Generar resumen del mes
          </Boton>
        </Tarjeta>
      ) : null}

      {/* Tarjeta de renovación (OPCIÓN A: Dieta nueva lista y bloqueada) */}
      <Tarjeta
        className={`p-6 border-2 transition-all ${
          tieneDietaBloqueada
            ? 'border-amber-400 bg-gradient-to-br from-amber-50/60 via-white to-amber-50/30'
            : 'border-slate-200/60 bg-white'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-shrink-0 w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center">
            <Lock className="h-6 w-6" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="inline-block rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-800">
                {tieneDietaBloqueada ? 'Lista y bloqueada' : 'Próximo mes'}
              </span>
            </div>
            <h3 className="text-lg font-bold text-slate-900 mt-1">
              Plan de alimentación del siguiente ciclo
            </h3>
            <p className="text-sm text-slate-600 mt-1">
              {tieneDietaBloqueada
                ? 'Camilo ya tiene preparado tu nuevo plan mensual con tus pesos actualizados y nuevos platos. Coordina tu pago para desbloquearlo.'
                : 'Al finalizar los 30 días, podrás renovar con Camilo para desbloquear tu nueva dieta mensual adaptada a tu progreso.'}
            </p>
          </div>

          <div className="sm:self-center">
            <a
              href={waUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold px-5 py-3 text-sm shadow-sm transition-colors"
            >
              <MessageCircle className="h-5 w-5" />
              <span>Coordinar con Camilo</span>
            </a>
          </div>
        </div>
      </Tarjeta>

      {/* Nota recordatoria sobre Opción A */}
      <div className="rounded-2xl border border-slate-200/60 bg-white p-4 flex items-start gap-3 text-xs text-slate-500">
        <CheckCircle className="h-4 w-4 text-emerald-600 flex-shrink-0 mt-0.5" />
        <p>
          <strong>Siempre tienes acceso:</strong> Sigues viendo tu plan anterior, tus horarios, tu rutina y todo tu historial de progreso mientras coordinas la activación de tu siguiente mes con Camilo.
        </p>
      </div>
    </div>
  );
}
