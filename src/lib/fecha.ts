/**
 * Fecha de hoy (YYYY-MM-DD) en Lima. Vercel y Supabase corren en UTC:
 * desde las 19:00 de Lima, toISOString() ya devuelve el día siguiente.
 */
export function hoyLima(ahora: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Lima',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(ahora);
}
