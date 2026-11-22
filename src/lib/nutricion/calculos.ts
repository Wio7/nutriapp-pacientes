import {
  Sexo,
  NivelActividad,
  MacrosGramos,
  DistribucionMacrosPct,
  AlimentoCENAN,
  IngredientePlato,
  Plato,
  ReglaCondicion,
  EvaluacionPlato,
  TiempoComida,
  ItemPlanAlimentacion,
} from './types';

export const FACTORES_ACTIVIDAD_DEFAULT: Record<NivelActividad, number> = {
  sedentario: 1.2,
  ligera: 1.375,
  ligero: 1.375,
  moderada: 1.55,
  moderado: 1.55,
  alto: 1.725,
  muy_alto: 1.9,
};

export const AJUSTES_OBJETIVO_DEFAULT: Record<string, number> = {
  bajar_peso: -15, // Déficit del 15%
  ganar_masa: 10,  // Superávit del 10%
  mantenimiento: 0,
};

/**
 * Tasa Metabólica Basal (TMB) según fórmula Mifflin-St Jeor:
 * Hombres: 10 × peso(kg) + 6.25 × talla(cm) − 5 × edad(años) + 5
 * Mujeres: 10 × peso(kg) + 6.25 × talla(cm) − 5 × edad(años) − 161
 */
export function calcularTMB(
  pesoKg: number,
  tallaCm: number,
  edadAnos: number,
  sexo: Sexo
): number {
  if (pesoKg <= 0 || tallaCm <= 0 || edadAnos <= 0) {
    throw new Error('Peso, talla y edad deben ser números positivos mayores a 0');
  }

  const base = 10 * pesoKg + 6.25 * tallaCm - 5 * edadAnos;
  const tmb = sexo === 'masculino' ? base + 5 : base - 161;
  return Math.round(tmb * 100) / 100;
}

/**
 * Gasto Energético Total (GET) multiplicando TMB por factor de actividad.
 */
export function calcularGET(
  tmb: number,
  factorActividad: number
): number {
  if (tmb <= 0 || factorActividad <= 0) {
    throw new Error('TMB y factor de actividad deben ser positivos');
  }
  return Math.round(tmb * factorActividad * 100) / 100;
}

/**
 * Ajusta calorías según objetivo (ej. -15% para pérdida de peso, +10% para superávit).
 */
export function ajustarCaloriasPorObjetivo(
  caloriasBase: number,
  porcentajeAjuste: number
): number {
  const factor = 1 + porcentajeAjuste / 100;
  return Math.round(caloriasBase * factor);
}

/**
 * Convierte porcentajes de macronutrientes a gramos y calorías:
 * Carbohidratos: 4 kcal/g
 * Proteínas: 4 kcal/g
 * Grasas: 9 kcal/g
 */
export function calcularMacronutrientes(
  caloriasTotales: number,
  distribucion: DistribucionMacrosPct
): MacrosGramos {
  const { carbsPct, proteinPct, fatPct } = distribucion;
  const suma = Math.round((carbsPct + proteinPct + fatPct) * 10) / 10;
  if (suma !== 100) {
    throw new Error(`La suma de macronutrientes debe ser 100%. Suma actual: ${suma}%`);
  }

  const calCarbs = caloriasTotales * (carbsPct / 100);
  const calProteinas = caloriasTotales * (proteinPct / 100);
  const calGrasas = caloriasTotales * (fatPct / 100);

  return {
    calorias: caloriasTotales,
    carbohidratosG: Math.round((calCarbs / 4) * 10) / 10,
    proteinasG: Math.round((calProteinas / 4) * 10) / 10,
    grasasG: Math.round((calGrasas / 9) * 10) / 10,
  };
}

/**
 * Calcula calorías y macronutrientes totales de un plato según sus ingredientes
 * y el contenido nutricional por cada 100g de la base CENAN/INS.
 */
export function calcularMacrosPlato(
  ingredientes: IngredientePlato[],
  alimentosMap: Record<string, AlimentoCENAN>,
  multiplicador: number = 1.0
): MacrosGramos {
  let calorias = 0;
  let carbohidratosG = 0;
  let proteinasG = 0;
  let grasasG = 0;

  for (const ing of ingredientes) {
    const alimento = alimentosMap[ing.alimentoId];
    if (!alimento) continue;

    const factor = ((ing.cantidadGramos * multiplicador) / 100);
    calorias += alimento.kcal100g * factor;
    carbohidratosG += alimento.carbs100g * factor;
    proteinasG += alimento.proteinas100g * factor;
    grasasG += alimento.grasas100g * factor;
  }

  return {
    calorias: Math.round(calorias * 10) / 10,
    carbohidratosG: Math.round(carbohidratosG * 10) / 10,
    proteinasG: Math.round(proteinasG * 10) / 10,
    grasasG: Math.round(grasasG * 10) / 10,
  };
}

/**
 * Evalúa si un plato cumple con las reglas de composición de una condición médica:
 * - Prohibida: si el plato contiene una etiqueta prohibida, se clasifica como 'prohibido'.
 * - Obligatoria: el plato debe tener las etiquetas marcadas como obligatorias.
 * - Recomendada: suma afinidad al plato.
 */
export function evaluarCompatibilidadPlato(
  etiquetasPlato: string[],
  reglas: ReglaCondicion[]
): EvaluacionPlato {
  const motivos: string[] = [];
  const obligatoriasCumplidas: string[] = [];
  const obligatoriasFaltantes: string[] = [];
  const recomendadas: string[] = [];
  const prohibidasDetectadas: string[] = [];

  const setTags = new Set(etiquetasPlato.map(t => t.toLowerCase().trim()));

  for (const regla of reglas) {
    const tagId = regla.etiquetaId.toLowerCase().trim();
    const presente = setTags.has(tagId);

    if (regla.tipo === 'forbidden') {
      if (presente) {
        prohibidasDetectadas.push(regla.etiquetaId);
        motivos.push(`Contiene etiqueta no permitida: "${regla.etiquetaId}"`);
      }
    } else if (regla.tipo === 'mandatory') {
      if (presente) {
        obligatoriasCumplidas.push(regla.etiquetaId);
      } else {
        obligatoriasFaltantes.push(regla.etiquetaId);
        motivos.push(`Falta etiqueta obligatoria requerida: "${regla.etiquetaId}"`);
      }
    } else if (regla.tipo === 'recommended') {
      if (presente) {
        recomendadas.push(regla.etiquetaId);
      }
    }
  }

  if (prohibidasDetectadas.length > 0) {
    return {
      estado: 'prohibido',
      motivos,
      etiquetasObligatoriasCumplidas: obligatoriasCumplidas,
      etiquetasObligatoriasFaltantes: obligatoriasFaltantes,
      etiquetasRecomendadas: recomendadas,
      etiquetasProhibidas: prohibidasDetectadas,
    };
  }

  if (obligatoriasFaltantes.length > 0) {
    return {
      estado: 'advertencia',
      motivos,
      etiquetasObligatoriasCumplidas: obligatoriasCumplidas,
      etiquetasObligatoriasFaltantes: obligatoriasFaltantes,
      etiquetasRecomendadas: recomendadas,
      etiquetasProhibidas: [],
    };
  }

  return {
    estado: 'compatible',
    motivos: ['Cumple con las directrices nutricionales'],
    etiquetasObligatoriasCumplidas: obligatoriasCumplidas,
    etiquetasObligatoriasFaltantes: [],
    etiquetasRecomendadas: recomendadas,
    etiquetasProhibidas: [],
  };
}

/**
 * Compara un valor nutricional actual contra el objetivo y devuelve
 * el porcentaje de diferencia y el estado de color:
 * - 'verde': dentro de ±10%
 * - 'ambar': dentro de ±20%
 * - 'rojo': fuera de ±20%
 */
export function evaluarDesviacionNutriente(
  actual: number,
  objetivo: number,
  margenVerdePct: number = 10,
  margenAmbarPct: number = 20
): {
  diferencia: number;
  porcentajeDiferencia: number;
  estado: 'verde' | 'ambar' | 'rojo';
  texto: string;
} {
  if (objetivo <= 0) {
    return { diferencia: 0, porcentajeDiferencia: 0, estado: 'verde', texto: '0%' };
  }

  const diferencia = Math.round((actual - objetivo) * 10) / 10;
  const porcentajeDiferencia = Math.round(((actual - objetivo) / objetivo) * 1000) / 10;
  const absPct = Math.abs(porcentajeDiferencia);

  let estado: 'verde' | 'ambar' | 'rojo' = 'verde';
  if (absPct <= margenVerdePct) {
    estado = 'verde';
  } else if (absPct <= margenAmbarPct) {
    estado = 'ambar';
  } else {
    estado = 'rojo';
  }

  const signo = porcentajeDiferencia > 0 ? '+' : '';
  const texto = `${signo}${porcentajeDiferencia}%`;

  return {
    diferencia,
    porcentajeDiferencia,
    estado,
    texto,
  };
}

/**
 * Valida número de celular en Perú:
 * - Debe tener 9 dígitos numéricos
 * - Debe iniciar con el dígito 9 (celulares en Perú)
 * - Devuelve formato E.164 (+519XXXXXXXX)
 */
export function validarTelefonoPeruano(telefonoRaw: string): {
  valido: boolean;
  e164: string;
  error?: string;
} {
  // Limpiar espacios, guiones, paréntesis
  let limpio = telefonoRaw.replace(/[^\d+]/g, '');

  // Si viene con +51 o 51 al inicio
  if (limpio.startsWith('+51')) {
    limpio = limpio.substring(3);
  } else if (limpio.startsWith('51') && limpio.length === 11) {
    limpio = limpio.substring(2);
  }

  limpio = limpio.replace(/\D/g, '');

  if (limpio.length !== 9) {
    return {
      valido: false,
      e164: '',
      error: 'El número debe tener exactamente 9 dígitos',
    };
  }

  if (!limpio.startsWith('9')) {
    return {
      valido: false,
      e164: '',
      error: 'Los números celulares en el Perú deben comenzar con el dígito 9',
    };
  }

  return {
    valido: true,
    e164: `+51${limpio}`,
  };
}

/**
 * Calcula los totales nutricionales de un conjunto de items de un plan.
 */
export function calcularTotalesPlan(
  items: ItemPlanAlimentacion[],
  platosMap: Record<string, Plato>,
  alimentosMap: Record<string, AlimentoCENAN>
): MacrosGramos {
  let calorias = 0;
  let carbohidratosG = 0;
  let proteinasG = 0;
  let grasasG = 0;

  for (const item of items) {
    const plato = platosMap[item.platoId];
    if (!plato) continue;

    const macrosPlato = calcularMacrosPlato(
      plato.ingredientes,
      alimentosMap,
      item.porcionMultiplicador
    );

    calorias += macrosPlato.calorias;
    carbohidratosG += macrosPlato.carbohidratosG;
    proteinasG += macrosPlato.proteinasG;
    grasasG += macrosPlato.grasasG;
  }

  return {
    calorias: Math.round(calorias),
    carbohidratosG: Math.round(carbohidratosG * 10) / 10,
    proteinasG: Math.round(proteinasG * 10) / 10,
    grasasG: Math.round(grasasG * 10) / 10,
  };
}

/**
 * Genera una sugerencia automática de plan alimentario balanceado para los 5 tiempos de comida,
 * respetando las reglas de la condición y acercándose a las calorías y macronutrientes objetivo.
 */
export function generarSugerenciaAutomatica({
  platos,
  alimentosMap,
  reglasCondicion,
  caloriasObjetivo,
  macrosObjetivo,
  evitarPlatoIds = [],
  diaSemana,
}: {
  platos: Plato[];
  alimentosMap: Record<string, AlimentoCENAN>;
  reglasCondicion: ReglaCondicion[];
  caloriasObjetivo: number;
  macrosObjetivo: MacrosGramos;
  /** Platos ya usados (plan semanal): se evitan mientras haya otros compatibles. */
  evitarPlatoIds?: string[];
  diaSemana?: number;
}): {
  items: ItemPlanAlimentacion[];
  totales: MacrosGramos;
  cumpleReglas: boolean;
  tiemposSinPlato: TiempoComida[];
} {
  const tiempos: TiempoComida[] = [
    'desayuno',
    'media_manana',
    'almuerzo',
    'media_tarde',
    'cena',
  ];

  // Solo entran platos que cumplen todas las reglas: ni prohibidos ni con obligatorias faltantes.
  const platosPorTiempo: Record<TiempoComida, Plato[]> = {
    desayuno: [],
    media_manana: [],
    almuerzo: [],
    media_tarde: [],
    cena: [],
  };

  for (const plato of platos) {
    const evalResult = evaluarCompatibilidadPlato(plato.etiquetas, reglasCondicion);
    if (evalResult.estado === 'compatible') {
      platosPorTiempo[plato.tiempoComida].push(plato);
    }
  }

  // Distribución calórica sugerida por tiempo de comida:
  // Desayuno: ~25%, Media mañana: ~10%, Almuerzo: ~35%, Media tarde: ~10%, Cena: ~20%
  const distribucionTiempos: Record<TiempoComida, number> = {
    desayuno: 0.25,
    media_manana: 0.10,
    almuerzo: 0.35,
    media_tarde: 0.10,
    cena: 0.20,
  };

  const items: ItemPlanAlimentacion[] = [];
  const platosMap: Record<string, Plato> = {};
  for (const p of platos) platosMap[p.id] = p;

  const evitar = new Set(evitarPlatoIds);
  const tiemposSinPlato: TiempoComida[] = [];

  // Opciones de cada tiempo de comida: plato + porción que mejor encaja con lo que le toca
  const opcionesPorTiempo: { tiempo: TiempoComida; opciones: { plato: Plato; factor: number; macros: MacrosGramos }[] }[] = [];

  for (const tiempo of tiempos) {
    const compatibles = platosPorTiempo[tiempo];
    if (compatibles.length === 0) {
      // Nunca se rellena con un plato no compatible: se avisa al nutricionista.
      tiemposSinPlato.push(tiempo);
      continue;
    }
    const sinRepetir = compatibles.filter(p => !evitar.has(p.id));
    const listaDisponibles = sinRepetir.length > 0 ? sinRepetir : compatibles;
    const calIdeal = caloriasObjetivo * distribucionTiempos[tiempo];

    const opciones = listaDisponibles.flatMap(plato => {
      const base = calcularMacrosPlato(plato.ingredientes, alimentosMap, 1.0);
      if (base.calorias <= 0) return [];
      // Porción más cercana a lo que le toca (múltiplos de 0.25, entre 0.5 y 2) y sus vecinas,
      // para poder compensar los macros entre comidas.
      const central = Math.round((calIdeal / base.calorias) * 4) / 4;
      const factores = new Set([central - 0.25, central, central + 0.25].map(v => Math.max(0.5, Math.min(2.0, v))));
      return [...factores].map(factor => ({ plato, factor, macros: calcularMacrosPlato(plato.ingredientes, alimentosMap, factor) }));
    });
    if (opciones.length > 0) opcionesPorTiempo.push({ tiempo, opciones });
    else tiemposSinPlato.push(tiempo);
  }

  // Se evalúa el día completo: elegir plato por plato deja los macros lejos del objetivo.
  const desviacion = (actual: number, objetivo: number) => (objetivo > 0 ? Math.abs(actual - objetivo) / objetivo : 0);
  const puntaje = (t: MacrosGramos) =>
    2 * desviacion(t.calorias, caloriasObjetivo) +
    desviacion(t.carbohidratosG, macrosObjetivo.carbohidratosG) +
    desviacion(t.proteinasG, macrosObjetivo.proteinasG) +
    desviacion(t.grasasG, macrosObjetivo.grasasG);

  let mejorPuntaje = Infinity;
  let mejorCombinacion: { plato: Plato; factor: number }[] = [];
  const actual: { plato: Plato; factor: number }[] = [];
  const recorrer = (i: number, kcal: number, carbs: number, prot: number, grasa: number) => {
    if (i === opcionesPorTiempo.length) {
      const p = puntaje({ calorias: kcal, carbohidratosG: carbs, proteinasG: prot, grasasG: grasa });
      if (p < mejorPuntaje) {
        mejorPuntaje = p;
        mejorCombinacion = actual.slice();
      }
      return;
    }
    for (const o of opcionesPorTiempo[i].opciones) {
      actual[i] = o;
      recorrer(i + 1, kcal + o.macros.calorias, carbs + o.macros.carbohidratosG, prot + o.macros.proteinasG, grasa + o.macros.grasasG);
    }
  };
  recorrer(0, 0, 0, 0, 0);

  mejorCombinacion.forEach((elegido, i) => {
    items.push({
      tiempoComida: opcionesPorTiempo[i].tiempo,
      platoId: elegido.plato.id,
      porcionMultiplicador: elegido.factor,
      ...(diaSemana ? { diaSemana } : {}),
    });
  });

  const totales = calcularTotalesPlan(items, platosMap, alimentosMap);

  return {
    items,
    totales,
    cumpleReglas: tiemposSinPlato.length === 0,
    tiemposSinPlato,
  };
}
