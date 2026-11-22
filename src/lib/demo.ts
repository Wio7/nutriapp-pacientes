import type { DatosPaciente, FoodLog, PesoRegistro, Ciclo } from './nutricion/types';

export const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === '1';

const hoy = new Date().toISOString().slice(0, 10);
const ayer = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

export const DEMO_PACIENTE: DatosPaciente = {
  id: 'demo-paciente-001',
  nombre: 'María García',
  pesoKg: 72,
  pesoObjetivoKg: 65,
  caloriasObjetivo: 1800,
  nivelEjercicio: 'principiante',
  cicloActivo: {
    id: 'demo-ciclo-001',
    inicio: ayer,
    fin: new Date(Date.now() + 29 * 86400000).toISOString().slice(0, 10),
    estado: 'activo',
    planId: 'demo-plan-001',
  },
};

export const DEMO_COMIDAS_HOY = [
  { itemId: 'item-1', tiempoComida: 'desayuno' as const, platoNombre: 'Avena con manzana cocida y canela', medidaCasera: '1 taza', macros: { calorias: 320, carbohidratosG: 58, proteinasG: 10, grasasG: 5 }, estado: 'cumpli' as const },
  { itemId: 'item-2', tiempoComida: 'media_manana' as const, platoNombre: 'Yogur natural con papaya picada', medidaCasera: '1 taza', macros: { calorias: 150, carbohidratosG: 22, proteinasG: 8, grasasG: 2 }, estado: null },
  { itemId: 'item-3', tiempoComida: 'almuerzo' as const, platoNombre: 'Pechuga a la plancha con quinua y ensalada', medidaCasera: '1 porción', macros: { calorias: 480, carbohidratosG: 45, proteinasG: 42, grasasG: 8 }, estado: null },
  { itemId: 'item-4', tiempoComida: 'media_tarde' as const, platoNombre: 'Manzana al horno con canela', medidaCasera: '1 unidad', macros: { calorias: 90, carbohidratosG: 24, proteinasG: 0, grasasG: 0 }, estado: null },
  { itemId: 'item-5', tiempoComida: 'cena' as const, platoNombre: 'Ensalada fresca con atún en agua y palta', medidaCasera: '1 plato', macros: { calorias: 280, carbohidratosG: 12, proteinasG: 28, grasasG: 14 }, estado: null },
];

export const DEMO_PESOS: PesoRegistro[] = [
  { fecha: new Date(Date.now() - 14 * 86400000).toISOString().slice(0, 10), pesoKg: 73.5 },
  { fecha: new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10), pesoKg: 72.8 },
  { fecha: hoy, pesoKg: 72.0 },
];

export const DEMO_RUTINA = {
  nivel: 'principiante',
  ejercicios: [
    { nombre: 'Caminata', series: null, repeticiones: null, minutos: 30, descripcion: 'Caminata moderada' },
    { nombre: 'Sentadillas', series: 3, repeticiones: 15, minutos: null, descripcion: 'Sin peso' },
    { nombre: 'Flexiones de rodilla', series: 3, repeticiones: 10, minutos: null, descripcion: 'En el suelo' },
    { nombre: 'Plancha abdominal', series: 3, repeticiones: null, minutos: 0.5, descripcion: '30 segundos' },
  ],
  diasPorSemana: 4,
  marcada: false,
};
