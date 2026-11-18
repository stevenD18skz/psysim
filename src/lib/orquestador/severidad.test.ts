import { describe, expect, it } from 'vitest';

import {
  ajustarIntensidad,
  emocionPorSeveridad,
  intensidadPorSeveridad,
  lenguajeNoVerbal,
  acotarBanderas,
  acotarSeveridad,
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

  it('sin cambios ni emoción anterior, usa neutral a baja severidad y triste a partir de 2,5', () => {
    expect(emocionPorSeveridad({ ...base, severidad: 1 })).toBe('neutral');
    expect(emocionPorSeveridad({ ...base, severidad: 2 })).toBe('neutral');
    expect(emocionPorSeveridad({ ...base, severidad: 3, severidadAnterior: 3.2 })).toBe('triste');
  });

  it('sin cambios notables conserva la emoción anterior, salvo el alivio y el desborde', () => {
    const estable = { severidad: 3, severidadAnterior: 3 };
    expect(emocionPorSeveridad({ ...estable, emocionAnterior: 'ansioso' })).toBe('ansioso');
    expect(emocionPorSeveridad({ ...estable, emocionAnterior: 'aliviado' })).toBe('triste');
    expect(emocionPorSeveridad({ ...estable, emocionAnterior: 'abrumado' })).toBe('triste');
  });

  it('conserva la tristeza cuando la severidad baja de 1,5 en un cambio pequeño', () => {
    expect(
      emocionPorSeveridad({ severidad: 1.4, severidadAnterior: 1.7, emocionAnterior: 'triste' })
    ).toBe('triste');
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

// Auditoría, punto 5: `severidad` es `numeric(4,2) check between 0 and 5`. Un valor fuera de rango
// hacía fallar `guardar_intercambio_ia` y el turno se perdía en cada reintento.
describe('acotarSeveridad', () => {
  it('deja como está una severidad dentro del rango', () => {
    expect(acotarSeveridad(0)).toBe(0);
    expect(acotarSeveridad(2.7)).toBe(2.7);
    expect(acotarSeveridad(5)).toBe(5);
  });

  it('lleva al rango lo que se sale de él', () => {
    expect(acotarSeveridad(5.4)).toBe(5);
    expect(acotarSeveridad(12)).toBe(5);
    expect(acotarSeveridad(-0.3)).toBe(0);
  });

  it('redondea a dos decimales, que es lo que guarda la base', () => {
    expect(acotarSeveridad(2.3456789)).toBe(2.35);
    expect(acotarSeveridad(4.999)).toBe(5);
  });

  it.each([null, undefined, '3', Number.NaN, Number.POSITIVE_INFINITY, {}])(
    'lo que no es un número finito (%j) queda sin severidad',
    valor => {
      expect(acotarSeveridad(valor)).toBeNull();
    }
  );
});

describe('acotarBanderas', () => {
  it('conserva los códigos, sin repetir y sin espacios', () => {
    expect(acotarBanderas(['risk', ' abuse ', 'risk'])).toEqual(['risk', 'abuse']);
  });

  it('descarta lo que no es texto y recorta lo demasiado largo o numeroso', () => {
    expect(acotarBanderas([7, null, '', 'x'.repeat(200)])).toEqual(['x'.repeat(40)]);
    expect(acotarBanderas(Array.from({ length: 50 }, (_, i) => `b${i}`))).toHaveLength(12);
  });
});
