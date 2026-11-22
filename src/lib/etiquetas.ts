export type TiempoComida = 'desayuno' | 'media_manana' | 'almuerzo' | 'media_tarde' | 'cena';

export const TIEMPOS_COMIDA: { id: TiempoComida; texto: string; hora: string }[] = [
  { id: 'desayuno', texto: 'Desayuno', hora: '7:00' },
  { id: 'media_manana', texto: 'Media mañana', hora: '10:00' },
  { id: 'almuerzo', texto: 'Almuerzo', hora: '13:00' },
  { id: 'media_tarde', texto: 'Media tarde', hora: '16:00' },
  { id: 'cena', texto: 'Cena', hora: '19:30' },
];

export const nombreTiempo = (id: TiempoComida) =>
  TIEMPOS_COMIDA.find(t => t.id === id)?.texto ?? id;

export const horaTiempo = (id: TiempoComida) =>
  TIEMPOS_COMIDA.find(t => t.id === id)?.hora ?? '';

export function fechaCorta(iso: string): string {
  const fecha = iso.length === 10 ? new Date(`${iso}T12:00:00`) : new Date(iso);
  return fecha.toLocaleDateString('es-PE', { day: 'numeric', month: 'short', year: 'numeric' });
}
