export type Sexo = 'masculino' | 'femenino';

export type NivelActividad = 'sedentario' | 'ligera' | 'ligero' | 'moderada' | 'moderado' | 'alto' | 'muy_alto';

export type TiempoComida = 'desayuno' | 'media_manana' | 'almuerzo' | 'media_tarde' | 'cena';

export type TipoReglaEtiqueta = 'mandatory' | 'recommended' | 'forbidden';

export type NivelEjercicio = 'nivel_cero' | 'principiante' | 'con_experiencia' | 'avanzado';

export type EstadoFoodLog = 'cumpli' | 'a_medias' | 'no';

export type EstadoRevisionIA = 'pendiente' | 'hecha' | 'fallida';

export type EstadoCiclo = 'borrador' | 'activo' | 'por_renovar' | 'pagado';

export interface MacrosGramos {
  calorias: number;
  carbohidratosG: number;
  proteinasG: number;
  grasasG: number;
}

export interface DistribucionMacrosPct {
  carbsPct: number;
  proteinPct: number;
  fatPct: number;
}

export interface AlimentoCENAN {
  id: string;
  nombre: string;
  categoria: string;
  medidaCaseraPorDefecto?: string;
  gramosPorMedidaCasera?: number;
  kcal100g: number;
  carbs100g: number;
  proteinas100g: number;
  grasas100g: number;
  fuente: string;
}

export interface IngredientePlato {
  alimentoId: string;
  cantidadGramos: number;
  medidaCasera?: string;
}

export interface Plato {
  id: string;
  nombre: string;
  tiempoComida: TiempoComida;
  etiquetas: string[];
  ingredientes: IngredientePlato[];
  instrucciones?: string;
  imagenUrl?: string;
}

export interface EtiquetaPlato {
  id: string;
  nombre: string;
  descripcion?: string;
}

export interface ReglaCondicion {
  etiquetaId: string;
  tipo: TipoReglaEtiqueta;
}

export interface CondicionSalud {
  id: string;
  nombre: string;
  macrosPorDefecto: DistribucionMacrosPct;
  reglasEtiquetas: ReglaCondicion[];
  descripcion?: string;
}

export interface ItemPlanAlimentacion {
  tiempoComida: TiempoComida;
  platoId: string;
  porcionMultiplicador: number;
  diaSemana?: number; // 1 = Lunes ... 7 = Domingo
  platoNombre?: string;
  medidaCasera?: string;
  itemId?: string;
}

export interface EvaluacionPlato {
  estado: 'compatible' | 'advertencia' | 'prohibido';
  motivos: string[];
  etiquetasObligatoriasCumplidas: string[];
  etiquetasObligatoriasFaltantes: string[];
  etiquetasRecomendadas: string[];
  etiquetasProhibidas: string[];
}

export interface FoodLog {
  id: string;
  fecha: string;
  tiempoComida: TiempoComida;
  itemPlanId: string;
  estado: EstadoFoodLog | null;
  nota?: string;
  fotoPath?: string;
  revisionIA?: RevisionIA;
  estadoRevision: EstadoRevisionIA;
}

export interface RevisionIA {
  que_se_ve: string;
  coincide: 'si' | 'parcial' | 'no';
  kcal_aprox: number;
  comentario: string;
}

export interface PesoRegistro {
  fecha: string;
  pesoKg: number;
}

export interface Ciclo {
  id: string;
  inicio: string;
  fin: string;
  estado: EstadoCiclo;
  resumenTexto?: string;
  planId: string;
}

export interface DatosPaciente {
  id: string;
  nombre: string;
  pesoKg: number;
  pesoObjetivoKg?: number;
  caloriasObjetivo: number;
  nivelEjercicio: NivelEjercicio;
  cicloActivo?: Ciclo;
}
