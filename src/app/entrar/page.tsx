'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Boton, Campo, claseEntrada, Aviso } from '@/components/ui';
import { BotonInstalar } from '@/components/boton-instalar';
import { DEMO_MODE } from '@/lib/demo';

export default function EntrarPage() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [celular, setCelular] = useState('');
  const [codigo, setCodigo] = useState('');
  const [error, setError] = useState('');

  const entrar = () => {
    start(async () => {
      setError('');
      if (DEMO_MODE) {
        router.push('/hoy');
        return;
      }

      let cel = celular.replace(/\D/g, '');
      if (cel.startsWith('51') && cel.length === 11) cel = cel.slice(2);
      if (cel.length !== 9 || !cel.startsWith('9')) {
        setError('Ingresa tu número celular peruano (9 dígitos, empieza con 9).');
        return;
      }
      if (codigo.length !== 6 || !/^\d{6}$/.test(codigo)) {
        setError('El código debe tener exactamente 6 dígitos.');
        return;
      }

      try {
        const res = await fetch('/api/entrar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ celular: `+51${cel}`, codigo }),
        });
        const json = await res.json();
        if (!res.ok) {
          const msgs: Record<string, string> = {
            CELULAR_NO_REGISTRADO: 'Ese número no está registrado. Escríbele a Camilo para que te agregue.',
            CODIGO_INVALIDO: 'El celular o el código no coinciden. Revisa el mensaje de Camilo.',
            LIMITE_INTENTOS: 'Demasiados intentos. Espera 15 minutos e inténtalo de nuevo.',
          };
          setError(msgs[json.codigo] ?? json.error ?? 'No pudimos ingresar. Inténtalo de nuevo.');
          return;
        }
        router.push('/hoy');
      } catch {
        setError('Sin conexión. Verifica tu internet e inténtalo de nuevo.');
      }
    });
  };

  const entrarComoDemo = () => {
    router.push('/hoy');
  };

  return (
    <div className="min-h-screen bg-[#f3f9f5] flex flex-col items-center justify-center px-4 py-8">
      {/* Vista Móvil */}
      <div className="w-full max-w-sm space-y-6 md:hidden">
        <div className="text-center">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-700 text-white text-2xl font-bold mb-3 shadow-sm">
            N
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">NutriApp</h1>
          <p className="text-slate-600 text-sm mt-1">
            Ingresa con tu celular y el código de 6 dígitos que te dio Camilo.
          </p>
        </div>

        {DEMO_MODE && (
          <Aviso tipo="info">
            Modo demo activado. Puedes ingresar directamente sin Supabase.
          </Aviso>
        )}

        {error && <Aviso tipo="error">{error}</Aviso>}

        <div className="space-y-4">
          <Campo etiqueta="Celular">
            {({ id, ...rest }) => (
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-base font-medium">
                  +51
                </span>
                <input
                  id={id}
                  {...rest}
                  type="tel"
                  inputMode="numeric"
                  placeholder="9XXXXXXXX"
                  value={celular}
                  onChange={e => setCelular(e.target.value)}
                  className={`${claseEntrada} pl-14`}
                  maxLength={12}
                />
              </div>
            )}
          </Campo>

          <Campo etiqueta="Código de acceso (6 dígitos)">
            {({ id, ...rest }) => (
              <input
                id={id}
                {...rest}
                type="text"
                inputMode="numeric"
                placeholder="123456"
                value={codigo}
                onChange={e => setCodigo(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className={`${claseEntrada} tracking-widest text-center font-mono font-semibold text-lg`}
                maxLength={6}
              />
            )}
          </Campo>

          <Boton className="w-full text-base" cargando={pending} onClick={entrar}>
            Entrar a mi plan
          </Boton>

          {DEMO_MODE && (
            <Boton variante="secundario" className="w-full" onClick={entrarComoDemo}>
              Ver versión demo
            </Boton>
          )}
        </div>

        <BotonInstalar className="w-full pt-2" />

        <div className="text-center text-xs text-slate-500 pt-2">
          ¿No tienes código o renovaste?{' '}
          <a
            href="https://wa.me/51952686162?text=Hola%20Camilo,%20necesito%20mi%20c%C3%B3digo%20de%20acceso%20a%20la%20app"
            target="_blank"
            rel="noreferrer"
            className="text-emerald-700 font-semibold underline"
          >
            Escríbele a Camilo
          </a>
        </div>
      </div>

      {/* Vista Computadora */}
      <div className="hidden md:flex gap-12 items-center max-w-4xl w-full">
        <div className="flex-1 space-y-4">
          <div className="inline-flex h-20 w-20 items-center justify-center rounded-3xl bg-emerald-700 text-white text-3xl font-bold shadow-md">
            N
          </div>
          <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">
            NutriApp Pacientes
          </h1>
          <p className="text-slate-600 text-lg leading-relaxed">
            Tu plan de alimentación personalizado, horarios de comida, rutina de ejercicio y seguimiento de progreso junto al nutricionista Camilo Villafranca.
          </p>
          <div className="pt-2">
            <BotonInstalar />
          </div>
        </div>

        <div className="flex-1 bg-white rounded-3xl shadow-sm border border-slate-100 p-8 space-y-5">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Bienvenido</h2>
            <p className="text-slate-500 text-sm mt-1">Ingresa a tu cuenta con los datos de tu plan</p>
          </div>

          {DEMO_MODE && (
            <Aviso tipo="info">
              Modo demo activado para evaluación local.
            </Aviso>
          )}

          {error && <Aviso tipo="error">{error}</Aviso>}

          <Campo etiqueta="Número de celular">
            {({ id, ...rest }) => (
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-base font-medium">
                  +51
                </span>
                <input
                  id={id}
                  {...rest}
                  type="tel"
                  inputMode="numeric"
                  placeholder="9XXXXXXXX"
                  value={celular}
                  onChange={e => setCelular(e.target.value)}
                  className={`${claseEntrada} pl-14`}
                  maxLength={12}
                />
              </div>
            )}
          </Campo>

          <Campo etiqueta="Código de acceso (6 dígitos)">
            {({ id, ...rest }) => (
              <input
                id={id}
                {...rest}
                type="text"
                inputMode="numeric"
                placeholder="123456"
                value={codigo}
                onChange={e => setCodigo(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className={`${claseEntrada} tracking-widest text-center font-mono font-semibold text-lg`}
                maxLength={6}
              />
            )}
          </Campo>

          <Boton className="w-full text-base" cargando={pending} onClick={entrar}>
            Entrar a mi plan
          </Boton>

          {DEMO_MODE && (
            <Boton variante="secundario" className="w-full" onClick={entrarComoDemo}>
              Ver versión demo
            </Boton>
          )}

          <p className="text-center text-xs text-slate-500 pt-2">
            ¿Aún no tienes tu código?{' '}
            <a
              href="https://wa.me/51952686162?text=Hola%20Camilo,%20necesito%20mi%20c%C3%B3digo%20de%20acceso%20a%20la%20app"
              target="_blank"
              rel="noreferrer"
              className="text-emerald-700 font-semibold underline"
            >
              Escríbele a Camilo por WhatsApp
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
