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
    expect(decidirCierrePorEstado('active', { banderas: ['abuse'] })).toEqual({
      tipo: 'sigue',
    });
  });

  it('completed es el cierre success: la práctica no termina', () => {
    expect(decidirCierrePorEstado('completed')).toEqual({
      tipo: 'cerrada_alla',
      codigo: 'success',
    });
  });

  it('terminated con banderas de abuso es trato inapropiado, con cualquier severidad', () => {
    expect(decidirCierrePorEstado('terminated', { banderas: ['repeat_abuse'] })).toEqual({
      tipo: 'termina',
      motivo: 'inapropiada',
    });
  });

  it('terminated sin motivo ni maltrato conserva un cierre neutro', () => {
    expect(decidirCierrePorEstado('terminated', { banderas: ['risk'] })).toEqual({
      tipo: 'cerrada_alla',
      codigo: 'sin_motivo',
    });
  });

  it('si la sesión trae su closing_kind, decide él', () => {
    expect(decidirCierrePorEstado('terminated', { cierre: 'crisis' })).toEqual({
      tipo: 'termina',
      motivo: 'crisis',
    });
    expect(decidirCierrePorEstado('terminated', { cierre: 'success' })).toEqual({
      tipo: 'cerrada_alla',
      codigo: 'success',
    });
    // Un motivo en blanco es como no tenerlo: se decide por el estado.
    expect(decidirCierrePorEstado('completed', { cierre: '  ' })).toEqual({
      tipo: 'cerrada_alla',
      codigo: 'success',
    });
  });

  it('un estado desconocido no termina la práctica', () => {
    expect(decidirCierrePorEstado('archived', { banderas: ['abuse'] })).toEqual({
      tipo: 'cerrada_alla',
      codigo: 'desconocido',
    });
  });

  it('la bandera risk por sí sola nunca cierra una sesión activa', () => {
    expect(decidirCierrePorEstado('active', { banderas: ['risk'] })).toEqual({ tipo: 'sigue' });
  });
});

describe('los dos caminos concluyen lo mismo con los mismos hechos', () => {
  it.each([
    ['success', 'completed', []],
    ['crisis', 'terminated', []],
    ['inappropriate', 'terminated', ['repeat_abuse']],
  ] as const)('closing_kind %s y estado %s', (kind, estado, banderas) => {
    expect(decidirCierrePorEstado(estado, { banderas, cierre: kind })).toEqual(
      decidirCierre(true, kind)
    );
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
