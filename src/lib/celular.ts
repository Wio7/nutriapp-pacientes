/** Lleva "987 654 321", "51987654321" o "+51987654321" a +51987654321. Si no es un celular peruano, lo deja como vino. */
export function normalizarCelular(entrada: string): string {
  let d = entrada.replace(/\D/g, '');
  if (d.length === 11 && d.startsWith('51')) d = d.slice(2);
  return /^9\d{8}$/.test(d) ? `+51${d}` : entrada;
}
