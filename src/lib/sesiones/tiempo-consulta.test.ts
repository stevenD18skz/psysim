import { describe, expect, it } from 'vitest';

import {
  AVISO_FINAL_S,
  consultaAhora,
  debeNotarElTiempo,
  enMinutos,
  faseDeConsulta,
  GRACIA_CONSULTA_S,
  minutosRestantes,
  terminoPorTiempo,
  TOLERANCIA_FIN_S,
} from './tiempo-consulta';

const QUINCE_MIN = 15 * 60;
const consulta = (transcurridoS: number | null) => ({ duracionS: QUINCE_MIN, transcurridoS });

describe('faseDeConsulta', () => {
  it.each([
    [null, 'sin_iniciar'],
    [0, 'en_curso'],
    [QUINCE_MIN - AVISO_FINAL_S - 1, 'en_curso'],
    // A los 3 minutos del final, el aviso.
    [QUINCE_MIN - AVISO_FINAL_S, 'por_terminar'],
    [QUINCE_MIN - 1, 'por_terminar'],
    // Al cumplirse, la invitación a cerrar: todavía se conversa (margen).
    [QUINCE_MIN, 'cumplida'],
    [QUINCE_MIN + GRACIA_CONSULTA_S - 1, 'cumplida'],
    // Pasado el margen, la práctica termina.
    [QUINCE_MIN + GRACIA_CONSULTA_S, 'vencida'],
    [QUINCE_MIN * 10, 'vencida'],
  ] as const)('con %s s transcurridos → %s', (transcurrido, fase) => {
    expect(faseDeConsulta(consulta(transcurrido))).toBe(fase);
  });

  it('respeta la duración que eligió el docente', () => {
    expect(faseDeConsulta({ duracionS: 30 * 60, transcurridoS: QUINCE_MIN })).toBe('en_curso');
    expect(faseDeConsulta({ duracionS: 10 * 60, transcurridoS: QUINCE_MIN })).toBe('vencida');
  });
});

describe('minutosRestantes y enMinutos', () => {
  it('redondea hacia arriba y nunca baja de cero', () => {
    expect(minutosRestantes(consulta(null))).toBe(15);
    expect(minutosRestantes(consulta(QUINCE_MIN - 121))).toBe(3);
    expect(minutosRestantes(consulta(QUINCE_MIN - 1))).toBe(1);
    expect(minutosRestantes(consulta(QUINCE_MIN + 60))).toBe(0);
  });

  it('dice minuto o minutos', () => {
    expect(enMinutos(1)).toBe('1 minuto');
    expect(enMinutos(15)).toBe('15 minutos');
  });
});

describe('consultaAhora', () => {
  it('suma lo que avanzó el reloj monotónico desde el último dato del servidor', () => {
    expect(consultaAhora({ ...consulta(100), medidoEn: 5_000 }, 65_900)).toEqual(consulta(160));
  });

  it('no corre si la consulta no ha empezado ni retrocede si el reloj va atrás', () => {
    expect(consultaAhora({ ...consulta(null), medidoEn: 0 }, 999_999)).toMatchObject({
      transcurridoS: null,
    });
    expect(consultaAhora({ ...consulta(100), medidoEn: 5_000 }, 1_000)).toEqual(consulta(100));
  });
});

describe('terminoPorTiempo', () => {
  const inicio = '2026-11-15T15:00:00.000Z';
  const despues = (segundos: number) =>
    new Date(Date.parse(inicio) + segundos * 1000).toISOString();
  const limite = QUINCE_MIN + GRACIA_CONSULTA_S;

  it('se decide con las dos horas de la base de datos', () => {
    expect(
      terminoPorTiempo({ consultaInicio: inicio, fin: despues(limite), duracionMinutos: 15 })
    ).toBe(true);
    // El navegador la termina unos instantes antes de lo que mide la base de datos.
    expect(
      terminoPorTiempo({
        consultaInicio: inicio,
        fin: despues(limite - TOLERANCIA_FIN_S),
        duracionMinutos: 15,
      })
    ).toBe(true);
  });

  it('una práctica que el estudiante terminó antes no se marca por tiempo', () => {
    expect(
      terminoPorTiempo({ consultaInicio: inicio, fin: despues(QUINCE_MIN), duracionMinutos: 15 })
    ).toBe(false);
    expect(
      terminoPorTiempo({
        consultaInicio: inicio,
        fin: despues(limite - TOLERANCIA_FIN_S - 1),
        duracionMinutos: 15,
      })
    ).toBe(false);
  });

  it('sin inicio de consulta (nunca intervino) o sin fin, no es por tiempo', () => {
    expect(
      terminoPorTiempo({ consultaInicio: null, fin: despues(9999), duracionMinutos: 15 })
    ).toBe(false);
    expect(terminoPorTiempo({ consultaInicio: inicio, fin: null, duracionMinutos: 15 })).toBe(
      false
    );
    expect(terminoPorTiempo({ consultaInicio: 'no', fin: 'fecha', duracionMinutos: 15 })).toBe(
      false
    );
  });
});

describe('debeNotarElTiempo (opción B)', () => {
  it('antes de cumplirse el tiempo, nunca', () => {
    expect(debeNotarElTiempo(consulta(null), null)).toBe(false);
    expect(debeNotarElTiempo(consulta(QUINCE_MIN - 1), 600)).toBe(false);
  });

  it('en el primer turno con el tiempo cumplido', () => {
    // La última respuesta se guardó cuando faltaba un minuto.
    expect(debeNotarElTiempo(consulta(QUINCE_MIN + 30), 90)).toBe(true);
  });

  it('una sola vez: si ya hubo una respuesta con el tiempo cumplido, no', () => {
    expect(debeNotarElTiempo(consulta(QUINCE_MIN + 90), 30)).toBe(false);
    expect(debeNotarElTiempo(consulta(QUINCE_MIN + 30), 30)).toBe(false);
  });
});
