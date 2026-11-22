import { describe, it, expect } from 'vitest';
import crypto from 'crypto';
import { validarTelefonoPeruano } from '../nutricion/calculos';

export function validarCodigoAcceso(codigo: string): { valido: boolean; error?: string } {
  const limpio = codigo.trim();
  if (limpio.length !== 6 || !/^\d{6}$/.test(limpio)) {
    return { valido: false, error: 'El código debe tener exactamente 6 dígitos numéricos' };
  }
  return { valido: true };
}

export function hashearSha256(cadena: string): string {
  return crypto.createHash('sha256').update(cadena).digest('hex');
}

export function verificarIntentosFallidos(
  intentosActuales: number,
  ultimoFalloMs: number,
  ahoraMs: number
): { bloqueado: boolean; minutosRestantes?: number } {
  const VENTANA_MS = 15 * 60 * 1000;
  if (intentosActuales >= 5 && ahoraMs - ultimoFalloMs < VENTANA_MS) {
    const restante = Math.ceil((VENTANA_MS - (ahoraMs - ultimoFalloMs)) / 60000);
    return { bloqueado: true, minutosRestantes: restante };
  }
  return { bloqueado: false };
}

describe('Lógica de Canje de Código y Token (lado TS)', () => {
  it('valida celulares peruanos válidos e inválidos', () => {
    expect(validarTelefonoPeruano('952686162')).toEqual({
      valido: true,
      e164: '+51952686162',
    });
    expect(validarTelefonoPeruano('+51 952 686 162')).toEqual({
      valido: true,
      e164: '+51952686162',
    });
    expect(validarTelefonoPeruano('852686162').valido).toBe(false);
    expect(validarTelefonoPeruano('95268616').valido).toBe(false);
  });

  it('valida códigos de acceso de 6 dígitos numéricos', () => {
    expect(validarCodigoAcceso('123456').valido).toBe(true);
    expect(validarCodigoAcceso('000123').valido).toBe(true);
    expect(validarCodigoAcceso('12345').valido).toBe(false);
    expect(validarCodigoAcceso('1234567').valido).toBe(false);
    expect(validarCodigoAcceso('abcdef').valido).toBe(false);
  });

  it('genera hash SHA-256 consistente para códigos y tokens', () => {
    const hash1 = hashearSha256('123456');
    const hash2 = hashearSha256('123456');
    expect(hash1).toBe(hash2);
    expect(hash1).toHaveLength(64);
  });

  it('controla el bloqueo por 5 intentos fallidos en ventana de 15 minutos', () => {
    const ahora = Date.now();
    // 5 intentos hace 2 minutos -> bloqueado
    const bloq = verificarIntentosFallidos(5, ahora - 2 * 60 * 1000, ahora);
    expect(bloq.bloqueado).toBe(true);
    expect(bloq.minutosRestantes).toBe(13);

    // 5 intentos hace 20 minutos -> desbloqueado
    const libre = verificarIntentosFallidos(5, ahora - 20 * 60 * 1000, ahora);
    expect(libre.bloqueado).toBe(false);

    // 4 intentos hace 2 minutos -> no bloqueado
    const intentos4 = verificarIntentosFallidos(4, ahora - 2 * 60 * 1000, ahora);
    expect(intentos4.bloqueado).toBe(false);
  });
});
