import { describe, expect, it } from 'vitest';

import { planDesde, planVoz, VOZ_POR_DEFECTO } from '@/lib/audio/voz';
import { crearAppStore } from '@/store/app-store';
import { type SesionActiva } from '@/types';

import { SESION_ACTIVA } from '../../../test/fixtures';

import { crearSeguidorDeHabla, PAUSA_ENTRE_PLANES_MS, type TramoDeHabla } from './habla-progresiva';
import { duracionEscritura } from './use-texto-progresivo';

const INICIO = 'Pues la verdad no he dormido casi nada, ';
const RESTO = 'me la paso dando vueltas en la cama pensando en todo lo que pasó.';

/** Store con el paciente a punto de responder y un seguidor suscrito a sus cambios. */
function montar(sesion: SesionActiva = SESION_ACTIVA) {
  const store = crearAppStore();
  store.getState().sesion.iniciar(sesion);
  store.getState().npc.actualizarEstadoNPC('esperando_input');
  store.getState().npc.actualizarEstadoNPC('procesando');

  let reloj = 0;
  const seguir = crearSeguidorDeHabla(VOZ_POR_DEFECTO, () => reloj);
  const tramos: TramoDeHabla[] = [];
  store.subscribe((actual, previo) => {
    const tramo = seguir(previo, actual);
    if (tramo) tramos.push(tramo);
  });
  return { store, tramos, avanzar: (ms: number) => (reloj += ms) };
}

const fin = (silabas: TramoDeHabla['silabas']) => {
  const ultima = silabas.at(-1);
  return ultima ? ultima.inicio + ultima.duracion : 0;
};

describe('planDesde', () => {
  const plan = planVoz(INICIO + RESTO, VOZ_POR_DEFECTO, 'triste', 3);

  it('sin tiempo transcurrido devuelve el plan entero', () => {
    expect(planDesde(plan, 0)).toEqual(plan);
  });

  it('quita lo ya dicho y cuenta los tiempos desde ahora', () => {
    const resto = planDesde(plan, 1.5);
    expect(resto.length).toBeGreaterThan(0);
    expect(resto.length).toBeLessThan(plan.length);
    expect(resto[0]!.inicio).toBeGreaterThanOrEqual(0);
    expect(resto[0]!.inicio).toBeLessThan(0.5);
    expect(fin(resto)).toBeCloseTo(fin(plan) - 1.5, 5);
  });

  it('pasado el final no queda nada por decir', () => {
    expect(planDesde(plan, 10)).toEqual([]);
  });
});

describe('crearSeguidorDeHabla', () => {
  it('una respuesta que llega completa se dice de una vez', () => {
    const { store, tramos } = montar();
    store.getState().conversacion.agregarMensaje({
      id: 'r',
      remitente: 'npc',
      contenido: INICIO + RESTO,
      timestamp: '2026-11-11T15:00:00.000Z',
      emocion: 'triste',
    });
    store.getState().npc.actualizarEstadoNPC('respondiendo');
    // Los cambios posteriores del store (ids guardados, tokens) no la repiten.
    store.getState().conversacion.confirmarGuardado({ r: 'id-guardado' });
    store.getState().metricas.registrarTokens(10, 10);

    expect(tramos).toHaveLength(1);
    expect(tramos[0]).toMatchObject({
      primero: true,
      completa: true,
      texto: INICIO + RESTO,
      respuesta: INICIO + RESTO,
      emocion: 'triste',
    });
    expect(fin(tramos[0]!.silabas)).toBeLessThanOrEqual(duracionEscritura(INICIO + RESTO));
  });

  it('una respuesta por partes: habla con lo que hay y continúa donde iba al completarse', () => {
    const { store, tramos, avanzar } = montar();
    store.getState().conversacion.agregarMensaje({
      id: 'r',
      remitente: 'npc',
      contenido: INICIO,
      timestamp: '2026-11-11T15:00:00.000Z',
      enCurso: true,
    });
    store.getState().npc.actualizarEstadoNPC('respondiendo');
    expect(tramos).toHaveLength(1);
    expect(tramos[0]).toMatchObject({ primero: true, completa: false, texto: INICIO });

    // Llega más texto enseguida: todavía no se rehace el plan (como mucho, uno cada 700 ms).
    avanzar(200);
    store.getState().conversacion.ampliarMensaje('r', RESTO.slice(0, 20));
    expect(tramos).toHaveLength(1);

    avanzar(PAUSA_ENTRE_PLANES_MS);
    store.getState().conversacion.ampliarMensaje('r', RESTO.slice(20));
    expect(tramos).toHaveLength(2);
    expect(tramos[1]).toMatchObject({ primero: false, completa: false });
    // Sigue desde el segundo por el que va: ya no dice el principio.
    expect(tramos[1]!.texto.length).toBeLessThan((INICIO + RESTO).length);
    expect(INICIO + RESTO).toContain(tramos[1]!.texto);

    // Se completa (aunque el texto no cambie): último plan, con la respuesta entera disponible.
    avanzar(100);
    store.getState().conversacion.actualizarMensaje('r', { enCurso: false });
    expect(tramos).toHaveLength(3);
    expect(tramos[2]).toMatchObject({ completa: true, respuesta: INICIO + RESTO });

    store.getState().metricas.registrarTokens(10, 10);
    expect(tramos).toHaveLength(3);
  });

  it('si la respuesta empieza de nuevo (reinicio), el habla también', () => {
    const { store, tramos, avanzar } = montar();
    store.getState().conversacion.agregarMensaje({
      id: 'r',
      remitente: 'npc',
      contenido: 'Un intento que falló a medias y se descarta',
      timestamp: '2026-11-11T15:00:00.000Z',
      enCurso: true,
    });
    store.getState().npc.actualizarEstadoNPC('respondiendo');
    avanzar(300);
    store.getState().conversacion.actualizarMensaje('r', { contenido: '' });
    store.getState().conversacion.actualizarMensaje('r', { contenido: INICIO });

    const ultimo = tramos.at(-1)!;
    // Desde cero: dice el texto nuevo completo, no desde el segundo 0,3.
    expect(ultimo.texto).toBe(INICIO);
  });

  it('cuando el paciente deja de responder no hay nada que decir, y la siguiente respuesta empieza de nuevo', () => {
    const { store, tramos } = montar();
    store.getState().conversacion.agregarMensaje({
      id: 'r1',
      remitente: 'npc',
      contenido: INICIO,
      timestamp: '2026-11-11T15:00:00.000Z',
    });
    store.getState().npc.actualizarEstadoNPC('respondiendo');
    store.getState().npc.actualizarEstadoNPC('esperando_input');
    store.getState().npc.actualizarEstadoNPC('procesando');
    store.getState().conversacion.agregarMensaje({
      id: 'r2',
      remitente: 'npc',
      contenido: RESTO,
      timestamp: '2026-11-11T15:01:00.000Z',
    });
    store.getState().npc.actualizarEstadoNPC('respondiendo');

    expect(tramos.map(tramo => [tramo.primero, tramo.texto])).toEqual([
      [true, INICIO],
      [true, RESTO],
    ]);
  });
});
