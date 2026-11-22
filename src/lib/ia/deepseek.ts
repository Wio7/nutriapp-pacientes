import OpenAI from 'openai';
import type { RevisionIA } from '../nutricion/types';

export const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || '';
export const DEEPSEEK_BASE_URL = 'https://api.deepseek.com';
export const DEEPSEEK_MODELO_VISION = process.env.DEEPSEEK_MODELO_VISION || 'deepseek-flash';
export const IA_TOPE_FOTOS_MES = parseInt(process.env.IA_TOPE_FOTOS_MES || '10000', 10);
export const MAX_FOTOS_PACIENTE_DIA = 6;

export interface MetricasResumenMes {
  totalComidasPlaneadas: number;
  comidasCumplidas: number;
  pctCumplimiento: number;
  comidasSaltadas: number;
  pesoInicialKg: number;
  pesoFinalKg: number;
  cambioPesoKg: number;
  diasRutinaCumplidos: number;
  diasRutinaObjetivo: number;
  totalFotosSubidas: number;
  fotosCoincidentes: number;
  pctFotosCoinciden: number;
}

/**
 * Valida si un paciente puede subir una foto hoy según su tope diario
 * y el tope mensual de la cuenta.
 */
export function validarTopesIA(params: {
  fotosHoyPaciente: number;
  fotosMesCuenta: number;
  topeMesCuenta?: number;
}): { permitido: boolean; motivo?: string } {
  const topeMes = params.topeMesCuenta ?? IA_TOPE_FOTOS_MES;
  if (params.fotosHoyPaciente >= MAX_FOTOS_PACIENTE_DIA) {
    return {
      permitido: false,
      motivo: `Has alcanzado el límite diario de ${MAX_FOTOS_PACIENTE_DIA} fotos por hoy.`,
    };
  }
  if (params.fotosMesCuenta >= topeMes) {
    return {
      permitido: false,
      motivo: 'Se alcanzó el tope mensual de revisiones con IA de la cuenta.',
    };
  }
  return { permitido: true };
}

/**
 * Parsea y normaliza la respuesta JSON de DeepSeek Vision.
 */
export function parsearRespuestaVision(texto: string): RevisionIA {
  try {
    let limpio = texto.trim();
    // Remover bloques markdown ```json ... ``` si los tuviera
    if (limpio.startsWith('```')) {
      limpio = limpio.replace(/^```json?\s*/i, '').replace(/```\s*$/, '').trim();
    }
    const json = JSON.parse(limpio);
    
    const coincideVal = String(json.coincide).toLowerCase();
    const coincide: 'si' | 'parcial' | 'no' = 
      coincideVal === 'si' || coincideVal === 'sí' ? 'si' :
      coincideVal === 'parcial' ? 'parcial' : 'no';

    return {
      que_se_ve: String(json.que_se_ve || 'Alimentos no identificados'),
      coincide,
      kcal_aprox: Number(json.kcal_aprox) || 0,
      comentario: String(json.comentario || 'Foto recibida para revisión.'),
    };
  } catch {
    return {
      que_se_ve: 'Foto de comida',
      coincide: 'parcial',
      kcal_aprox: 0,
      comentario: 'Foto recibida para revisión del nutricionista.',
    };
  }
}

/**
 * Llama a DeepSeek Vision para comparar la foto con el plato planeado.
 */
export async function revisarFotoConDeepSeek(params: {
  base64Imagen: string;
  mimeType: string;
  platoPlaneado: string;
  tiempoComida: string;
}): Promise<RevisionIA> {
  if (!DEEPSEEK_API_KEY) {
    return {
      que_se_ve: 'Plato registrado',
      coincide: 'si',
      kcal_aprox: 0,
      comentario: 'Foto almacenada (IA en modo sin clave).',
    };
  }

  const client = new OpenAI({
    apiKey: DEEPSEEK_API_KEY,
    baseURL: DEEPSEEK_BASE_URL,
  });

  const prompt = `Analiza esta foto de comida de un paciente en Perú.
Tiempo de comida: ${params.tiempoComida}
Plato planeado: "${params.platoPlaneado}"

Responde ÚNICAMENTE con un objeto JSON válido con este esquema exacto, sin explicaciones ni markdown:
{
  "que_se_ve": "descripción breve de los alimentos visibles",
  "coincide": "si" | "parcial" | "no",
  "kcal_aprox": número entero estimado de calorías,
  "comentario": "frase corta técnica descriptiva (máx 15 palabras)"
}`;

  const response = await client.chat.completions.create({
    model: DEEPSEEK_MODELO_VISION,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          {
            type: 'image_url',
            image_url: {
              url: `data:${params.mimeType};base64,${params.base64Imagen}`,
            },
          },
        ],
      },
    ],
    max_tokens: 250,
    temperature: 0.2,
  });

  const contenido = response.choices[0]?.message?.content || '{}';
  return parsearRespuestaVision(contenido);
}

/**
 * Calcula los números del mes a partir de los registros.
 */
export function calcularMetricasMes(params: {
  foodLogs: Array<{ status: 'cumpli' | 'a_medias' | 'no' | null; revisionIA?: RevisionIA }>;
  totalEsperadoComidas: number;
  pesos: Array<{ fecha: string; pesoKg: number }>;
  diasRutinaHechos: number;
  diasRutinaMeta: number;
}): MetricasResumenMes {
  const cumplidas = params.foodLogs.filter(f => f.status === 'cumpli').length;
  const saltadas = params.foodLogs.filter(f => f.status === 'no').length;
  const pctCumplimiento = params.totalEsperadoComidas > 0 
    ? Math.round((cumplidas / params.totalEsperadoComidas) * 100) 
    : 0;

  const pesosOrdenados = [...params.pesos].sort((a, b) => a.fecha.localeCompare(b.fecha));
  const pesoInicialKg = pesosOrdenados[0]?.pesoKg ?? 0;
  const pesoFinalKg = pesosOrdenados[pesosOrdenados.length - 1]?.pesoKg ?? pesoInicialKg;
  const cambioPesoKg = Math.round((pesoFinalKg - pesoInicialKg) * 10) / 10;

  const fotosConRevision = params.foodLogs.filter(f => f.revisionIA);
  const totalFotos = fotosConRevision.length;
  const fotosCoinciden = fotosConRevision.filter(f => f.revisionIA?.coincide === 'si' || f.revisionIA?.coincide === 'parcial').length;
  const pctFotosCoinciden = totalFotos > 0 
    ? Math.round((fotosCoinciden / totalFotos) * 100) 
    : 0;

  return {
    totalComidasPlaneadas: params.totalEsperadoComidas,
    comidasCumplidas: cumplidas,
    pctCumplimiento,
    comidasSaltadas: saltadas,
    pesoInicialKg,
    pesoFinalKg,
    cambioPesoKg,
    diasRutinaCumplidos: params.diasRutinaHechos,
    diasRutinaObjetivo: params.diasRutinaMeta,
    totalFotosSubidas: totalFotos,
    fotosCoincidentes: fotosCoinciden,
    pctFotosCoinciden,
  };
}

/**
 * Genera el resumen del mes pidiéndole a DeepSeek redactar de 3 a 5 frases
 * amables a partir de los números precalculados (sin consejos médicos).
 */
export async function redactarResumenMesConDeepSeek(
  metricas: MetricasResumenMes,
  nombrePaciente: string
): Promise<string> {
  const textoDefault = `¡Gran esfuerzo este mes, ${nombrePaciente}! Cumpliste con el ${metricas.pctCumplimiento}% de tus comidas y completaste ${metricas.diasRutinaCumplidos} días de tu rutina. Tu peso varió ${metricas.cambioPesoKg > 0 ? '+' : ''}${metricas.cambioPesoKg} kg. Sigue así con Camilo en tu próximo ciclo.`;

  if (!DEEPSEEK_API_KEY) {
    return textoDefault;
  }

  const client = new OpenAI({
    apiKey: DEEPSEEK_API_KEY,
    baseURL: DEEPSEEK_BASE_URL,
  });

  const prompt = `Eres el asistente de redacción del nutricionista Camilo Villafranca (Perú).
Escribe un resumen mensual para el paciente ${nombrePaciente} en español de Perú, tuteo, tono motivador y empático.
Máximo entre 3 y 5 frases.

REGLAS ESTRICTAS:
- Basate EXCLUSIVAMENTE en estos números calculados:
  * Cumplimiento de comidas: ${metricas.pctCumplimiento}% (${metricas.comidasCumplidas} de ${metricas.totalComidasPlaneadas})
  * Comidas saltadas: ${metricas.comidasSaltadas}
  * Días de rutina completados: ${metricas.diasRutinaCumplidos} de ${metricas.diasRutinaObjetivo} días meta
  * Cambio de peso en el mes: ${metricas.cambioPesoKg > 0 ? '+' : ''}${metricas.cambioPesoKg} kg (de ${metricas.pesoInicialKg} kg a ${metricas.pesoFinalKg} kg)
  * Fotos con buena adherencia: ${metricas.pctFotosCoinciden}%
- Menciona qué logró y qué le faltó reforzar.
- PROHIBIDO DAR CONSEJOS MÉDICOS, PROHIBIDO DIAGNOSTICAR, PROHIBIDO PRESCRIBIR MEDICAMENTOS O SUPLEMENTOS.
- Termina invitándolo amablemente a seguir con su siguiente ciclo junto a Camilo.`;

  try {
    const response = await client.chat.completions.create({
      model: DEEPSEEK_MODELO_VISION,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 350,
      temperature: 0.6,
    });

    const respuesta = response.choices[0]?.message?.content?.trim();
    return respuesta || textoDefault;
  } catch {
    return textoDefault;
  }
}
