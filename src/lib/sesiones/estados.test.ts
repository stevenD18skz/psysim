import { describe, expect, it } from 'vitest';

import { duracionSesion, estadoVisibleSesion } from './estados';

const base = { estado: 'finalizada' as const, comenzada: true, retroalimentacion: null };

describe('estadoVisibleSesion', () => {
  it('en curso: el docente solo ve que está en progreso', () => {
    expect(estadoVisibleSesion({ ...base, estado: 'en_curso' }, 'docente')).toEqual({
      texto: 'Simulación en progreso',
      tono: 'en-curso',
    });
    expect(
      estadoVisibleSesion({ ...base, estado: 'en_curso', comenzada: false }, 'docente').texto
    ).toBe('Leyendo las instrucciones');
  });

  it('terminada sin revisar, en borrador y publicada', () => {
    expect(estadoVisibleSesion(base, 'docente').texto).toBe('Pendiente de retroalimentación');
    expect(
      estadoVisibleSesion({ ...base, retroalimentacion: { publicada: false, nota: 4 } }, 'docente')
        .texto
    ).toBe('Borrador de retroalimentación');
    expect(
      estadoVisibleSesion({ ...base, retroalimentacion: { publicada: true, nota: 4 } }, 'docente')
    ).toEqual({ texto: 'Retroalimentación publicada', tono: 'listo' });
  });

  it('el estudiante no ve los borradores del docente', () => {
    expect(
      estadoVisibleSesion(
        { ...base, retroalimentacion: { publicada: false, nota: 4 } },
        'estudiante'
      ).texto
    ).toBe('Pendiente de retroalimentación');
    expect(
      estadoVisibleSesion(
        { ...base, retroalimentacion: { publicada: true, nota: 4 } },
        'estudiante'
      ).texto
    ).toBe('Retroalimentación disponible');
    expect(estadoVisibleSesion({ ...base, estado: 'interrumpida' }, 'estudiante').texto).toBe(
      'Interrumpida · en revisión'
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
