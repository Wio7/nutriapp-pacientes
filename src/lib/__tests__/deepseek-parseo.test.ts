import { describe, it, expect } from 'vitest';
import { parsearRespuestaVision } from '../ia/deepseek';

describe('Parseo de respuestas de DeepSeek Vision', () => {
  it('parsea un JSON limpio estándar', () => {
    const raw = JSON.stringify({
      que_se_ve: 'Arroz con pechuga de pollo y ensalada',
      coincide: 'si',
      kcal_aprox: 480,
      comentario: 'Cumple con el plato planeado.',
    });

    const res = parsearRespuestaVision(raw);
    expect(res.que_se_ve).toBe('Arroz con pechuga de pollo y ensalada');
    expect(res.coincide).toBe('si');
    expect(res.kcal_aprox).toBe(480);
    expect(res.comentario).toBe('Cumple con el plato planeado.');
  });

  it('parsea un JSON envuelto en bloques markdown ```json ... ```', () => {
    const raw = `\`\`\`json
{
  "que_se_ve": "Yogur natural con papaya en trozos",
  "coincide": "si",
  "kcal_aprox": 160,
  "comentario": "Porción adecuada de fruta y lácteo."
}
\`\`\``;

    const res = parsearRespuestaVision(raw);
    expect(res.que_se_ve).toBe('Yogur natural con papaya en trozos');
    expect(res.coincide).toBe('si');
    expect(res.kcal_aprox).toBe(160);
  });

  it('normaliza "sí" con tilde a "si" y maneja coincidencia parcial', () => {
    const raw = JSON.stringify({
      que_se_ve: 'Avena pero sin la manzana cocida',
      coincide: 'parcial',
      kcal_aprox: 250,
      comentario: 'Faltó la fruta agregada.',
    });

    const res = parsearRespuestaVision(raw);
    expect(res.coincide).toBe('parcial');
  });

  it('maneja con elegancia respuestas inválidas o corruptas sin lanzar excepción', () => {
    const raw = 'Lo siento, no pude procesar la imagen de manera adecuada.';
    const res = parsearRespuestaVision(raw);
    expect(res.coincide).toBe('parcial');
    expect(res.comentario).toContain('revisión');
  });
});
