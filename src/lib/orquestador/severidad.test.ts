import { describe, expect, it } from 'vitest';

import {
  ajustarIntensidad,
  emocionPorSeveridad,
  intensidadPorSeveridad,
  lenguajeNoVerbal,
} from './severidad';

const base = { severidadAnterior: null, emocionAnterior: null } as const;

describe('intensidadPorSeveridad', () => {
  it.each([
    [0, 1],
    [1.9, 1],
    [2, 2],
    [3.9, 2],
    [4, 3],
    [5, 3],
  ] as const)('severidad %f → intensidad %i', (severidad, intensidad) => {
    expect(intensidadPorSeveridad(severidad)).toBe(intensidad);
  });
});

describe('ajustarIntensidad', () => {
  it('sin severidad (Gemini) deja la etiqueta como llegó', () => {
    expect(ajustarIntensidad(2, null)).toBe(2);
    expect(ajustarIntensidad(null, null)).toBeNull();
  });

  it('sin etiqueta, la intensidad sale de la severidad', () => {
    expect(ajustarIntensidad(null, 4.5)).toBe(3);
    expect(ajustarIntensidad(null, 1)).toBe(1);
  });

  it('la severidad alta sube un punto y la baja lo quita, sin salirse de 1 a 3', () => {
    expect(ajustarIntensidad(2, 4)).toBe(3);
    expect(ajustarIntensidad(3, 5)).toBe(3);
    expect(ajustarIntensidad(2, 1)).toBe(1);
    expect(ajustarIntensidad(1, 0.5)).toBe(1);
    expect(ajustarIntensidad(2, 3)).toBe(2);
  });
});

describe('emocionPorSeveridad', () => {
  it('el maltrato al paciente se ve como molestia, con cualquier severidad', () => {
    expect(emocionPorSeveridad({ ...base, severidad: 2, banderas: ['abuse'] })).toBe('molesto');
    expect(emocionPorSeveridad({ ...base, severidad: 5, banderas: ['repeat_abuse'] })).toBe(
      'molesto'
    );
  });

  it('con severidad alta el paciente está abrumado', () => {
    expect(emocionPorSeveridad({ ...base, severidad: 4 })).toBe('abrumado');
    expect(emocionPorSeveridad({ ...base, severidad: 4.6, banderas: ['risk'] })).toBe('abrumado');
  });

  it('una bajada notable se ve como alivio y una subida como ansiedad', () => {
    expect(emocionPorSeveridad({ ...base, severidad: 2, severidadAnterior: 2.5 })).toBe('aliviado');
    expect(emocionPorSeveridad({ ...base, severidad: 3, severidadAnterior: 2.5 })).toBe('ansioso');
  });

  it('sin cambios, depende del nivel: tranquilo, neutral o triste', () => {
    expect(emocionPorSeveridad({ ...base, severidad: 1 })).toBe('tranquilo');
    expect(emocionPorSeveridad({ ...base, severidad: 2 })).toBe('neutral');
    expect(emocionPorSeveridad({ ...base, severidad: 3, severidadAnterior: 3.2 })).toBe('triste');
  });

  it('sin cambios notables conserva la emoción anterior, salvo el alivio y el desborde', () => {
    const estable = { severidad: 3, severidadAnterior: 3 };
    expect(emocionPorSeveridad({ ...estable, emocionAnterior: 'ansioso' })).toBe('ansioso');
    expect(emocionPorSeveridad({ ...estable, emocionAnterior: 'aliviado' })).toBe('triste');
    expect(emocionPorSeveridad({ ...estable, emocionAnterior: 'abrumado' })).toBe('triste');
  });
});

describe('lenguajeNoVerbal', () => {
  it('respeta la emoción de la etiqueta y ajusta su intensidad con la severidad', () => {
    expect(
      lenguajeNoVerbal({ emocion: 'triste', intensidad: 2 }, { ...base, severidad: 4.2 })
    ).toEqual({ emocion: 'triste', intensidad: 3, deducida: false });
  });

  it('con emoción pero sin intensidad, la intensidad sale de la severidad', () => {
    expect(
      lenguajeNoVerbal({ emocion: 'ansioso', intensidad: null }, { ...base, severidad: 2.5 })
    ).toEqual({ emocion: 'ansioso', intensidad: 2, deducida: false });
  });

  it('sin etiqueta deduce emoción e intensidad de la severidad y del historial', () => {
    expect(
      lenguajeNoVerbal(
        { emocion: null, intensidad: null },
        { severidad: 1.2, severidadAnterior: 2.5, emocionAnterior: 'triste' }
      )
    ).toEqual({ emocion: 'aliviado', intensidad: 1, deducida: true });
  });
});
