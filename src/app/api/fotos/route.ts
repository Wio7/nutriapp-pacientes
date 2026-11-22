import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getToken } from '@/lib/token';
import { storageFotos } from '@/lib/supabase-servidor';
import { revisarFotoConDeepSeek, IA_TOPE_FOTOS_MES } from '@/lib/ia/deepseek';

const TIEMPOS = ['desayuno', 'media_manana', 'almuerzo', 'media_tarde', 'cena'];
const TIPOS = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_BYTES = 5 * 1024 * 1024;

const MENSAJES: Record<string, string> = {
  TOKEN_INVALIDO: 'Tu sesión venció. Vuelve a entrar.',
  TOPE_DIA: 'Ya subiste 6 fotos hoy. Mañana puedes subir más.',
  SIN_CICLO: 'Todavía no tienes una dieta activa.',
  TIEMPO_INVALIDO: 'Comida no válida.',
};

export async function POST(req: NextRequest) {
  try {
    const token = await getToken();
    if (!token) return NextResponse.json({ error: MENSAJES.TOKEN_INVALIDO }, { status: 401 });

    const form = await req.formData();
    const foto = form.get('foto');
    const tiempoComida = String(form.get('tiempo_comida') ?? '');

    if (!(foto instanceof File)) return NextResponse.json({ error: 'No se envió ninguna foto' }, { status: 400 });
    if (!TIEMPOS.includes(tiempoComida)) return NextResponse.json({ error: MENSAJES.TIEMPO_INVALIDO }, { status: 400 });
    if (!TIPOS.includes(foto.type) || foto.size > MAX_BYTES) {
      return NextResponse.json({ error: 'La foto debe ser JPG, PNG o WebP de hasta 5 MB.' }, { status: 400 });
    }

    // 1. Reserva: valida el token, aplica el tope diario (6) y el mensual de la cuenta, y da la ruta y el plato planeado.
    const { data: reserva, error: errReserva } = await supabase.rpc('nutri_paciente_foto_reservar', {
      p_token: token,
      p_tiempo_comida: tiempoComida,
      p_tope_mes: IA_TOPE_FOTOS_MES,
    });
    if (errReserva) throw errReserva;
    if (!reserva?.ok) {
      const codigo = String(reserva?.error ?? 'ERROR');
      return NextResponse.json({ error: MENSAJES[codigo] ?? 'No se pudo subir la foto.' }, { status: codigo === 'TOKEN_INVALIDO' ? 401 : 400 });
    }

    // 2. Sube la foto al bucket privado
    const buffer = Buffer.from(await foto.arrayBuffer());
    const { error: errSubida } = await storageFotos().upload(reserva.ruta, buffer, {
      contentType: foto.type,
      upsert: false,
    });
    if (errSubida) throw errSubida;

    // 3. Revisión con IA (solo la ve Camilo). Si no hay cupo, queda "pendiente"; si falla, "fallida".
    let revision = null;
    let estado: 'pendiente' | 'hecha' | 'fallida' = 'pendiente';
    if (reserva.ia_permitida) {
      try {
        revision = await revisarFotoConDeepSeek({
          base64Imagen: buffer.toString('base64'),
          mimeType: foto.type,
          platoPlaneado: reserva.plato_nombre ?? 'sin plato planeado',
          tiempoComida,
        });
        estado = revision ? 'hecha' : 'fallida';
      } catch (e) {
        console.error('Revisión de foto con DeepSeek falló:', e);
        estado = e instanceof Error && e.message === 'SIN_CLAVE_DEEPSEEK' ? 'pendiente' : 'fallida';
      }
    }

    // 4. Guarda la foto y la revisión en el registro de esa comida
    const { error: errGuardar } = await supabase.rpc('nutri_paciente_foto_guardar', {
      p_token: token,
      p_ruta: reserva.ruta,
      p_tiempo_comida: tiempoComida,
      p_revision: revision,
      p_estado_revision: estado,
    });
    if (errGuardar) throw errGuardar;

    // El paciente nunca ve la revisión de la IA
    return NextResponse.json({ ok: true, mensaje: 'Foto recibida' });
  } catch (err) {
    console.error('Error en /api/fotos:', err);
    return NextResponse.json({ error: 'No se pudo subir la foto. Inténtalo de nuevo.' }, { status: 500 });
  }
}
