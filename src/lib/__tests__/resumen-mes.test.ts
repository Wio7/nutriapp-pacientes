import { describe, it, expect } from 'vitest';
import { calcularMetricasMes } from '../ia/deepseek';

describe('Cálculo de métricas del Resumen del Mes', () => {
  it('calcula correctamente los porcentajes de comidas y variación de peso', () => {
    const foodLogs = [
      { status: 'cumpli' as const, revisionIA: { que_se_ve: 'Avena', coincide: 'si' as const, kcal_aprox: 300, comentario: 'Ok' } },
      { status: 'cumpli' as const, revisionIA: { que_se_ve: 'Pollo', coincide: 'si' as const, kcal_aprox: 450, comentario: 'Ok' } },
      { status: 'a_medias' as const, revisionIA: { que_se_ve: 'Fruta', coincide: 'parcial' as const, kcal_aprox: 120, comentario: 'Faltó queso' } },
      { status: 'no' as const },
    ];

    const pesos = [
      { fecha: '2026-11-01', pesoKg: 75.0 },
      { fecha: '2026-11-15', pesoKg: 74.2 },
      { fecha: '2026-11-30', pesoKg: 73.5 },
    ];

    const resultado = calcularMetricasMes({
      foodLogs,
      totalEsperadoComidas: 10,
      pesos,
      diasRutinaHechos: 8,
      diasRutinaMeta: 12,
    });

    expect(resultado.totalComidasPlaneadas).toBe(10);
    expect(resultado.comidasCumplidas).toBe(2);
    expect(resultado.pctCumplimiento).toBe(20);
    expect(resultado.comidasSaltadas).toBe(1);
    expect(resultado.pesoInicialKg).toBe(75.0);
    expect(resultado.pesoFinalKg).toBe(73.5);
    expect(resultado.cambioPesoKg).toBe(-1.5);
    expect(resultado.diasRutinaCumplidos).toBe(8);
    expect(resultado.totalFotosSubidas).toBe(3);
    expect(resultado.fotosCoincidentes).toBe(3); // 2 'si' + 1 'parcial'
    expect(resultado.pctFotosCoinciden).toBe(100);
  });

  it('maneja casos sin registros o con un solo peso sin errores', () => {
    const resultado = calcularMetricasMes({
      foodLogs: [],
      totalEsperadoComidas: 150,
      pesos: [{ fecha: '2026-11-01', pesoKg: 80 }],
      diasRutinaHechos: 0,
      diasRutinaMeta: 16,
    });

    expect(resultado.pctCumplimiento).toBe(0);
    expect(resultado.comidasCumplidas).toBe(0);
    expect(resultado.comidasSaltadas).toBe(0);
    expect(resultado.cambioPesoKg).toBe(0);
    expect(resultado.pctFotosCoinciden).toBe(0);
  });
});
