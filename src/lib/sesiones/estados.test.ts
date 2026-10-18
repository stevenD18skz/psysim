import { describe, expect, it } from 'vitest';

import { duracionSesion, estaPorRevisar, estadoCortoSesion, estadoVisibleSesion } from './estados';

const base = { estado: 'finalizada' as const, comenzada: true, retroalimentacion: null };

describe('estadoVisibleSesion', () => {
  it('en curso: cada rol con su voz; el docente nunca ve el chat en vivo', () => {
    expect(estadoVisibleSesion({ ...base, estado: 'en_curso' }, 'docente')).toEqual({
      texto: 'Practicando ahora',
      tono: 'en-curso',
    });
    expect(estadoVisibleSesion({ ...base, estado: 'en_curso' }, 'estudiante').texto).toBe(
      'En curso'
    );
    expect(
      estadoVisibleSesion({ ...base, estado: 'en_curso', comenzada: false }, 'docente').texto
    ).toBe('Abrió la práctica');
    expect(
      estadoVisibleSesion({ ...base, estado: 'en_curso', comenzada: false }, 'estudiante').texto
    ).toBe('Abierta, sin empezar');
  });

  it('en curso con el plazo de inactividad vencido: cerrándose', () => {
    const ahora = new Date('2026-10-07T15:20:00.000Z');
    const contexto = { ultimaActividad: '2026-10-07T15:05:00.000Z', ahora };
    expect(estadoVisibleSesion({ ...base, estado: 'en_curso' }, 'estudiante', contexto)).toEqual({
      texto: 'Cerrándose por inactividad',
      tono: 'neutro',
    });
    expect(
      estadoVisibleSesion({ ...base, estado: 'en_curso' }, 'docente', {
        ultimaActividad: '2026-10-07T15:15:00.000Z',
        ahora,
      }).texto
    ).toBe('Practicando ahora');
  });

  it('terminada sin revisar, en borrador y publicada', () => {
    expect(estadoVisibleSesion(base, 'docente').texto).toBe('Por revisar');
    expect(estadoVisibleSesion({ ...base, estado: 'interrumpida' }, 'docente').texto).toBe(
      'Por revisar · sin terminar'
    );
    expect(
      estadoVisibleSesion({ ...base, retroalimentacion: { publicada: false, nota: 4 } }, 'docente')
        .texto
    ).toBe('Borrador guardado');
    expect(
      estadoVisibleSesion({ ...base, retroalimentacion: { publicada: true, nota: 4 } }, 'docente')
    ).toEqual({ texto: 'Publicada', tono: 'listo' });
  });

  it('sin conversación: se cerró antes de comenzar', () => {
    expect(
      estadoVisibleSesion({ ...base, estado: 'interrumpida', comenzada: false }, 'estudiante')
    ).toEqual({ texto: 'Sin conversación', tono: 'neutro' });
  });

  it('el estudiante no ve los borradores del docente', () => {
    expect(
      estadoVisibleSesion(
        { ...base, retroalimentacion: { publicada: false, nota: 4 } },
        'estudiante'
      ).texto
    ).toBe('Esperando retroalimentación');
    expect(
      estadoVisibleSesion(
        { ...base, retroalimentacion: { publicada: true, nota: 4 } },
        'estudiante'
      ).texto
    ).toBe('Retroalimentación lista');
    expect(estadoVisibleSesion({ ...base, estado: 'interrumpida' }, 'estudiante').texto).toBe(
      'Esperando retroalimentación'
    );
  });
});

describe('estaPorRevisar', () => {
  it('terminada con conversación y sin publicar', () => {
    expect(estaPorRevisar(base)).toBe(true);
    expect(estaPorRevisar({ ...base, estado: 'interrumpida' })).toBe(true);
    expect(estaPorRevisar({ ...base, estado: 'interrumpida', comenzada: false })).toBe(false);
    expect(estaPorRevisar({ ...base, estado: 'en_curso' })).toBe(false);
    expect(estaPorRevisar({ ...base, retroalimentacion: { publicada: false, nota: null } })).toBe(
      true
    );
    expect(estaPorRevisar({ ...base, retroalimentacion: { publicada: true, nota: 4 } })).toBe(
      false
    );
  });
});

describe('duracionSesion', () => {
  it('solo para sesiones que comenzaron y terminaron', () => {
    const inicio = '2026-10-07T15:00:00.000Z';
    expect(duracionSesion({ comenzada: true, inicio, fin: '2026-10-07T15:12:30.000Z' })).toBe(750);
    expect(
      duracionSesion({ comenzada: false, inicio, fin: '2026-10-07T15:12:30.000Z' })
    ).toBeNull();
    expect(duracionSesion({ comenzada: true, inicio, fin: null })).toBeNull();
  });
});

describe('estadoCortoSesion', () => {
  it('nombra el estado en una palabra', () => {
    expect(estadoCortoSesion({ estado: 'finalizada', comenzada: true })).toBe('Finalizada');
    expect(estadoCortoSesion({ estado: 'interrumpida', comenzada: true })).toBe('Interrumpida');
    expect(estadoCortoSesion({ estado: 'interrumpida', comenzada: false })).toBe('No comenzada');
    expect(estadoCortoSesion({ estado: 'en_curso', comenzada: true })).toBe('En curso');
    expect(estadoCortoSesion({ estado: 'en_curso', comenzada: false })).toBe('Sin comenzar');
  });
});
