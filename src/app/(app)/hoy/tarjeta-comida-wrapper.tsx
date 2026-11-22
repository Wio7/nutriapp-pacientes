'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { TarjetaComida } from '@/components/tarjeta-comida';
import type { EstadoFoodLog } from '@/lib/nutricion/types';
import { DEMO_MODE } from '@/lib/demo';

interface Props {
  itemId: string;
  /** Clave del tiempo de comida (desayuno, media_manana, ...). `tiempo` es solo el texto que se muestra. */
  tiempoClave: string;
  tiempo: string;
  hora: string;
  platoNombre: string;
  medidaCasera?: string;
  calorias?: number;
  fotoPlato?: string | null;
  esSiguiente?: boolean;
  estadoActual: EstadoFoodLog | null;
  fotoSubida: boolean;
  fecha: string;
}

async function revisar(res: Response) {
  if (res.ok) return;
  const json = await res.json().catch(() => null);
  throw new Error(json?.error || 'No se pudo guardar. Revisa tu conexión.');
}

export function TarjetaComidaWrapper(props: Props) {
  const router = useRouter();

  const marcar = useCallback(
    async (estado: EstadoFoodLog, nota?: string) => {
      if (DEMO_MODE) return;
      const res = await fetch('/api/registrar-comida', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fecha: props.fecha,
          tiempo_comida: props.tiempoClave,
          item_plan_id: props.itemId,
          estado,
          nota,
        }),
      });
      await revisar(res);
      router.refresh();
    },
    [props.fecha, props.itemId, props.tiempoClave, router]
  );

  const foto = useCallback(
    async (archivo: File) => {
      if (DEMO_MODE) return;

      // Comprimir a máx. 1024 px en el navegador antes de subir (requisito de GEMINI.md)
      const comprimida = await comprimirImagen(archivo, 1024);

      const form = new FormData();
      form.append('foto', comprimida);
      form.append('tiempo_comida', props.tiempoClave);

      const res = await fetch('/api/fotos', { method: 'POST', body: form });
      await revisar(res);
      router.refresh();
    },
    [props.tiempoClave, router]
  );

  return <TarjetaComida {...props} onMarcar={marcar} onFoto={foto} />;
}

async function comprimirImagen(archivo: File, maxPx: number): Promise<File> {
  return new Promise(resolve => {
    const img = new Image();
    const url = URL.createObjectURL(archivo);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const escala = Math.min(1, maxPx / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * escala);
      canvas.height = Math.round(img.height * escala);
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(archivo);
        return;
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        blob => {
          resolve(blob ? new File([blob], archivo.name, { type: 'image/jpeg' }) : archivo);
        },
        'image/jpeg',
        0.82
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(archivo);
    };
    img.src = url;
  });
}
