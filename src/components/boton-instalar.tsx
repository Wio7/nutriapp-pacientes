'use client';

import { useState, useSyncExternalStore } from 'react';
import { Download } from 'lucide-react';
import { Boton } from '@/components/ui';
import { decidirInstalacion, esDispositivoIos, ModoInstalacion } from '@/lib/instalacion';

const CLAVE_IOS = 'nutri_pac_instalada_ios';
const EVENTO = 'nutri-instalacion-cambio';

interface AvisoInstalacion extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

declare global {
  interface Window { __avisoInstalacion?: AvisoInstalacion | null; }
}

function leerIosInstalada(): boolean {
  try { return localStorage.getItem(CLAVE_IOS) === '1'; } catch { return false; }
}

function modoActual(): ModoInstalacion {
  return decidirInstalacion({
    abiertaComoApp: window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true,
    hayAvisoNativo: Boolean(window.__avisoInstalacion),
    esIos: esDispositivoIos(navigator.userAgent, navigator.platform, navigator.maxTouchPoints),
    iosYaInstalada: leerIosInstalada(),
  });
}

function suscribir(avisar: () => void) {
  window.addEventListener(EVENTO, avisar);
  return () => window.removeEventListener(EVENTO, avisar);
}

export function BotonInstalar({ className = '' }: { className?: string }) {
  const modo = useSyncExternalStore<ModoInstalacion>(suscribir, modoActual, () => 'oculto');
  const [verPasos, setVerPasos] = useState(false);

  if (modo === 'oculto') return null;

  const instalar = async () => {
    if (modo === 'ios') { setVerPasos(v => !v); return; }
    const aviso = window.__avisoInstalacion;
    if (!aviso) return;
    await aviso.prompt();
    await aviso.userChoice;
    window.__avisoInstalacion = null;
    window.dispatchEvent(new Event(EVENTO));
  };

  return (
    <div className={className}>
      <Boton variante="secundario" className="w-full" aria-expanded={modo === 'ios' ? verPasos : undefined} onClick={instalar}>
        <Download className="h-5 w-5" aria-hidden /> Descargar app
      </Boton>
      {modo === 'ios' && verPasos && (
        <div className="mt-2 rounded-xl border border-emerald-200 bg-white p-3 text-sm text-slate-800">
          <ol className="list-decimal space-y-1 pl-5">
            <li>Abre esta página en Safari.</li>
            <li>Toca el botón <strong>Compartir</strong>.</li>
            <li>Elige <strong>Agregar a pantalla de inicio</strong>.</li>
          </ol>
          <Boton variante="fantasma" className="mt-2 w-full" onClick={() => {
            try { localStorage.setItem(CLAVE_IOS, '1'); } catch {}
            window.dispatchEvent(new Event(EVENTO));
          }}>
            Ya la instalé
          </Boton>
        </div>
      )}
    </div>
  );
}
