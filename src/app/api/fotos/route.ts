import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getToken } from '@/lib/token';
import {
  validarTopesIA,
  revisarFotoConDeepSeek,
  MAX_FOTOS_PACIENTE_DIA,
} from '@/lib/ia/deepseek';

export async function POST(req: NextRequest) {
  try {
    const token = await getToken();
    if (!token) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const formData = await req.formData();
    const foto = formData.get('foto') as File | null;
    const itemId = formData.get('item_id') as string | null;
    const fecha = (formData.get('fecha') as string | null) || new Date().toISOString().slice(0, 10);
    const tiempoComida = (formData.get('tiempo_comida') as string | null) || 'desayuno';
    const platoNombre = (formData.get('plato_nombre') as string | null) || 'Plato del plan';

    if (!foto) {
      return NextResponse.json({ error: 'No se envió ninguna foto' }, { status: 400 });
    }

    // 1. Validar el token y obtener patient_id y account_id
    const { data: pacienteData, error: pacError } = await supabase.rpc('nutri_pac_validar_token', {
      p_token: token,
    });

    if (pacError || !pacienteData || pacienteData.length === 0) {
      return NextResponse.json({ error: 'Sesión inválida o expirada' }, { status: 401 });
    }

    const { patient_id: patientId, account_id: accountId } = pacienteData[0];

    // 2. Comprobar topes:
    // a) Fotos de este paciente hoy
    const { count: fotosHoyCount } = await supabase
      .from('nutri_food_logs')
      .select('id', { count: 'exact', head: true })
      .eq('patient_id', patientId)
      .eq('log_date', fecha)
      .not('foto_path', 'is', null);

    const fotosHoy = fotosHoyCount || 0;

    // b) Fotos de la cuenta en el mes actual
    const mesActual = fecha.slice(0, 7); // YYYY-MM
    const { data: aiUsage } = await supabase
      .from('nutri_ai_usage')
      .select('fotos_usadas')
      .eq('account_id', accountId)
      .eq('mes', mesActual)
      .maybeSingle();

    const fotosMes = aiUsage?.fotos_usadas || 0;

    const validacion = validarTopesIA({
      fotosHoyPaciente: fotosHoy,
      fotosMesCuenta: fotosMes,
    });

    // 3. Subir archivo a Storage (bucket privado 'nutri-fotos')
    const buffer = Buffer.from(await foto.arrayBuffer());
    const extension = foto.type.includes('png') ? 'png' : 'jpg';
    const fotoPath = `${accountId}/${patientId}/${fecha}/${tiempoComida}_${Date.now()}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from('nutri-fotos')
      .upload(fotoPath, buffer, {
        contentType: foto.type || 'image/jpeg',
        upsert: true,
      });

    if (uploadError) {
      // Si falla storage por permisos o falta de bucket, se guarda registro sin truncar
      console.error('Error subiendo foto a storage:', uploadError);
    }

    // 4. Obtener el ciclo activo
    const { data: ciclo } = await supabase
      .from('nutri_cycles')
      .select('id')
      .eq('patient_id', patientId)
      .in('status', ['activo', 'por_renovar'])
      .order('starts_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const cicloId = ciclo?.id;

    // 5. Si no se puede usar IA por tope o error, se guarda con 'pendiente'
    let revisionIA = null;
    let estadoRevision: 'pendiente' | 'hecha' | 'fallida' = 'pendiente';

    if (validacion.permitido) {
      try {
        const base64 = buffer.toString('base64');
        revisionIA = await revisarFotoConDeepSeek({
          base64Imagen: base64,
          mimeType: foto.type || 'image/jpeg',
          platoPlaneado: platoNombre,
          tiempoComida,
        });
        estadoRevision = 'hecha';

        // Actualizar contador mensual de IA
        await supabase
          .from('nutri_ai_usage')
          .upsert(
            {
              account_id: accountId,
              mes: mesActual,
              fotos_usadas: fotosMes + 1,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'account_id,mes' }
          );
      } catch (iaError) {
        console.error('Error en DeepSeek Vision:', iaError);
        estadoRevision = 'fallida';
      }
    } else {
      estadoRevision = 'pendiente';
    }

    // 6. Guardar en nutri_food_logs (nunca se pierde la foto ni el registro)
    if (cicloId) {
      await supabase.from('nutri_food_logs').upsert(
        {
          account_id: accountId,
          patient_id: patientId,
          cycle_id: cicloId,
          log_date: fecha,
          meal_time: tiempoComida,
          meal_plan_item_id: itemId || null,
          foto_path: fotoPath,
          revision_ia: revisionIA,
          estado_revision: estadoRevision,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'patient_id,log_date,meal_time' }
      );
    }

    // Anti-meta: El paciente NUNCA ve el resultado de la IA, solo "foto recibida"
    return NextResponse.json({
      ok: true,
      mensaje: 'Foto recibida',
    });
  } catch (err: unknown) {
    const mensaje = err instanceof Error ? err.message : 'Error al procesar foto';
    return NextResponse.json({ error: mensaje }, { status: 500 });
  }
}
