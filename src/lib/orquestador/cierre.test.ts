import { describe, expect, it } from 'vitest';

import { MOTIVOS_CIERRE } from '@/lib/conversacion/cierre';

import {
  CIERRES_AJENOS,
  decidirCierre,
  decidirCierrePorEstado,
  MOTIVO_CAMBIO_POR_CIERRE,
} from './cierre';

describe('decidirCierre (evento done del stream)', () => {
  it('sin should_close la sesión sigue, diga lo que diga closing_kind', () => {
    expect(decidirCierre(false, null)).toEqual({ tipo: 'sigue' });
    expect(decidirCierre(false, 'crisis')).toEqual({ tipo: 'sigue' });
  });

  it.each([
    ['crisis', 'crisis'],
    ['inappropriate', 'inapropiada'],
    [' Crisis ', 'crisis'],
  ] as const)('%s termina la práctica como %s', (kind, motivo) => {
    expect(decidirCierre(true, kind)).toEqual({ tipo: 'termina', motivo });
  });

  it('success es el paciente calmado: la práctica no termina', () => {
    expect(decidirCierre(true, 'success')).toEqual({ tipo: 'cerrada_alla', codigo: 'success' });
  });

  it.each([null, '', '   '])('sin motivo (%j) nunca se interpreta como crisis', kind => {
    expect(decidirCierre(true, kind)).toEqual({ tipo: 'cerrada_alla', codigo: 'sin_motivo' });
  });

  it.each(['algo_nuevo', 'completed', 'toString', '__proto__', 'constructor'])(
    'un valor desconocido (%s) nunca se interpreta como crisis',
    kind => {
      expect(decidirCierre(true, kind)).toEqual({ tipo: 'cerrada_alla', codigo: 'desconocido' });
    }
  );
});

describe('decidirCierrePorEstado (turno recuperado del historial)', () => {
  it('active: la sesión sigue', () => {
    expect(decidirCierrePorEstado('active', ['abuse'])).toEqual({ tipo: 'sigue' });
  });

  it('completed es el cierre success: la práctica no termina', () => {
    expect(decidirCierrePorEstado('completed', [])).toEqual({
      tipo: 'cerrada_alla',
      codigo: 'success',
    });
  });

  it('terminated es crisis, o trato inapropiado si el turno trae banderas de abuso', () => {
    expect(decidirCierrePorEstado('terminated', [])).toEqual({ tipo: 'termina', motivo: 'crisis' });
    expect(decidirCierrePorEstado('terminated', ['risk'])).toEqual({
      tipo: 'termina',
      motivo: 'crisis',
    });
    expect(decidirCierrePorEstado('terminated', ['repeat_abuse'])).toEqual({
      tipo: 'termina',
      motivo: 'inapropiada',
    });
  });

  it('un estado desconocido no termina la práctica', () => {
    expect(decidirCierrePorEstado('archived', ['abuse'])).toEqual({
      tipo: 'cerrada_alla',
      codigo: 'desconocido',
    });
  });

  it('la bandera risk por sí sola nunca cierra una sesión activa', () => {
    expect(decidirCierrePorEstado('active', ['risk'])).toEqual({ tipo: 'sigue' });
  });
});

describe('los dos caminos concluyen lo mismo con los mismos hechos', () => {
  it.each([
    ['success', 'completed', []],
    ['crisis', 'terminated', []],
    ['inappropriate', 'terminated', ['repeat_abuse']],
  ] as const)('closing_kind %s y estado %s', (kind, estado, banderas) => {
    expect(decidirCierrePorEstado(estado, banderas)).toEqual(decidirCierre(true, kind));
  });
});

describe('motivos del cambio a Gemini', () => {
  it('cada cierre ajeno tiene un motivo que cabe en sesion_ia y en orquestador_evento', () => {
    for (const codigo of CIERRES_AJENOS) {
      expect(MOTIVO_CAMBIO_POR_CIERRE[codigo]).toMatch(/^[a-z_0-9]{1,40}$/);
    }
  });

  it('ningún cierre ajeno coincide con un motivo de cierre de la práctica', () => {
    for (const codigo of CIERRES_AJENOS) {
      expect(MOTIVOS_CIERRE as readonly string[]).not.toContain(codigo);
    }
  });
});
