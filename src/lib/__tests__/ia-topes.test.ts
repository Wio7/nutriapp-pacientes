import { describe, it, expect } from 'vitest';
import { validarTopesIA, MAX_FOTOS_PACIENTE_DIA, IA_TOPE_FOTOS_MES } from '../ia/deepseek';

describe('Topes de IA', () => {
  it('permite subir foto si está por debajo del límite diario y mensual', () => {
    const res = validarTopesIA({
      fotosHoyPaciente: 2,
      fotosMesCuenta: 500,
    });
    expect(res.permitido).toBe(true);
  });

  it('rechaza si el paciente ya subió 6 fotos hoy', () => {
    const res = validarTopesIA({
      fotosHoyPaciente: 6,
      fotosMesCuenta: 100,
    });
    expect(res.permitido).toBe(false);
    expect(res.motivo).toContain(`${MAX_FOTOS_PACIENTE_DIA} fotos`);
  });

  it('permite en la 5ta foto (límite superior estricto)', () => {
    const res = validarTopesIA({
      fotosHoyPaciente: 5,
      fotosMesCuenta: 100,
    });
    expect(res.permitido).toBe(true);
  });

  it('rechaza si la cuenta alcanzó el tope mensual de 10,000 fotos', () => {
    const res = validarTopesIA({
      fotosHoyPaciente: 1,
      fotosMesCuenta: 10000,
      topeMesCuenta: 10000,
    });
    expect(res.permitido).toBe(false);
    expect(res.motivo).toContain('tope mensual');
  });

  it('respeta tope mensual personalizado', () => {
    const res = validarTopesIA({
      fotosHoyPaciente: 0,
      fotosMesCuenta: 50,
      topeMesCuenta: 50,
    });
    expect(res.permitido).toBe(false);
  });
});
