import { describe, it, expect } from 'vitest';
import { hoyLima } from '../fecha';
import { normalizarCelular } from '../celular';

describe('hoyLima', () => {
  it('a las 20:00 de Lima (01:00 UTC del día siguiente) sigue siendo el mismo día', () => {
    expect(hoyLima(new Date('2026-11-23T01:00:00Z'))).toBe('2026-11-22');
  });
  it('a las 00:30 de Lima ya es el día siguiente', () => {
    expect(hoyLima(new Date('2026-11-23T05:30:00Z'))).toBe('2026-11-23');
  });
});

describe('normalizarCelular', () => {
  it('acepta con espacios, con 51 y con +51', () => {
    expect(normalizarCelular('987 654 321')).toBe('+51987654321');
    expect(normalizarCelular('51987654321')).toBe('+51987654321');
    expect(normalizarCelular('+51 987-654-321')).toBe('+51987654321');
  });
  it('deja tal cual lo que no es un celular peruano', () => {
    expect(normalizarCelular('12345')).toBe('12345');
  });
});
