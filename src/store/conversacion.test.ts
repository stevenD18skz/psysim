import { describe, expect, it, vi } from 'vitest';

import { type MensajeConversacion, type SesionActiva } from '@/types';

import { crearAppStore } from './app-store';
import { respuestaEnCamino } from './conversacion-slice';

const sesion: SesionActiva = {
  id: '5b1c2f0e-8f7a-4a51-9c5e-1b2f3d4e5f60',
  inicio: '2026-09-30T15:00:00.000Z',
  comenzada: true,
  estudiante: { codigo: '202012345', nombre: 'Ana María Pérez' },
  escenario: {
    id: '0f8fad5b-d9cb-469f-a165-70867728950e',
    codigo: 'E-01',
    titulo: 'Duelo y pérdida',
    descripcion: 'Caso de prueba.',
    categoria: 'clinico',
    dificultad: 'basico',
    competenciaCentral: 'Empatía y validación emocional',
    configuracion3d: 'scenes/e-01.json',
  },
  npc: {
    id: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
    nombre: 'Marta Lucía',
    edad: 58,
    perfilClinico: 'Viuda reciente.',
  },
};

function mensaje(
  remitente: MensajeConversacion['remitente'],
  contenido: string,
  latencia_ms?: number
): MensajeConversacion {
  return {
    id: crypto.randomUUID(),
    remitente,
    contenido,
    timestamp: new Date().toISOString(),
    ...(latencia_ms !== undefined && { latencia_ms }),
  };
}

describe('acciones de conversación y NPC (HU-14 · T02)', () => {
  it('agregarMensaje añade al historial y cuenta las intervenciones del estudiante', () => {
    const store = crearAppStore();
    const { agregarMensaje } = store.getState().conversacion;

    agregarMensaje(mensaje('estudiante', 'Hola'));
    agregarMensaje(mensaje('npc', 'Buenas', 850));
    agregarMensaje(mensaje('estudiante', '¿Cómo está?'));

    const { conversacion, metricas } = store.getState();
    expect(conversacion.mensajes.map(m => m.contenido)).toEqual(['Hola', 'Buenas', '¿Cómo está?']);
    expect(metricas.totalMensajes).toBe(2);
    expect(metricas.latencias).toEqual([850]);
  });

  it('actualizarEstadoNPC aplica transiciones válidas y rechaza las demás', () => {
    const store = crearAppStore();
    const { actualizarEstadoNPC } = store.getState().npc;
    const aviso = vi.spyOn(console, 'warn').mockImplementation(() => {});

    expect(actualizarEstadoNPC('esperando_input')).toBe(true);
    expect(actualizarEstadoNPC('procesando')).toBe(true);
    // Doble envío durante la petición: se ignora.
    expect(actualizarEstadoNPC('esperando_input')).toBe(false);
    expect(store.getState().npc.estado).toBe('procesando');
    expect(aviso).toHaveBeenCalledOnce();

    expect(actualizarEstadoNPC('respondiendo')).toBe(true);
    expect(store.getState().npc.estado).toBe('respondiendo');
  });

  it('registrarTokens acumula el consumo de la IA', () => {
    const store = crearAppStore();
    store.getState().metricas.registrarTokens(500, 20);
    store.getState().metricas.registrarTokens(620, null);
    expect(store.getState().metricas).toMatchObject({ tokensEntrada: 1120, tokensSalida: 20 });
  });

  it('iniciarSesion reinicia la conversación y retoma un historial guardado', () => {
    const store = crearAppStore();
    store.getState().conversacion.agregarMensaje(mensaje('estudiante', 'de otra sesión'));
    store.getState().npc.actualizarEstadoNPC('esperando_input');

    const historial = [mensaje('estudiante', 'Hola'), mensaje('npc', 'Buenas', 900)];
    store.getState().sesion.iniciar(sesion, historial);

    const estado = store.getState();
    expect(estado.sesion.activa).toEqual(sesion);
    expect(estado.conversacion.mensajes).toEqual(historial);
    expect(estado.npc.estado).toBe('inactivo');
    expect(estado.metricas).toMatchObject({ totalMensajes: 1, latencias: [900] });
  });

  it('limpiarSesion resetea sesión, conversación, NPC y métricas sin tocar el perfil', () => {
    const store = crearAppStore();
    store.getState().sesion.iniciar(sesion, [mensaje('estudiante', 'Hola')]);
    store.getState().npc.actualizarEstadoNPC('esperando_input');
    store.getState().conversacion.establecerPendiente(mensaje('estudiante', 'pendiente'));
    store.getState().metricas.registrarTokens(10, 10);

    store.getState().sesion.limpiar();

    const estado = store.getState();
    expect(estado.sesion.activa).toBeNull();
    expect(estado.conversacion).toMatchObject({ mensajes: [], pendiente: null });
    expect(estado.npc.estado).toBe('inactivo');
    expect(estado.metricas).toMatchObject({
      totalMensajes: 0,
      latencias: [],
      tokensEntrada: 0,
      tokensSalida: 0,
    });
  });
});

describe('respuesta del paciente por partes', () => {
  function conRespuestaEnCurso() {
    const store = crearAppStore();
    store.getState().sesion.iniciar(sesion);
    store.getState().npc.actualizarEstadoNPC('esperando_input');
    const { agregarMensaje } = store.getState().conversacion;
    agregarMensaje(mensaje('estudiante', 'Hola'));
    store.getState().npc.actualizarEstadoNPC('procesando');
    const respuesta = { ...mensaje('npc', 'Bue'), enCurso: true };
    agregarMensaje(respuesta);
    store.getState().npc.actualizarEstadoNPC('respondiendo');
    return { store, id: respuesta.id };
  }

  it('ampliarMensaje añade texto solo a ese mensaje', () => {
    const { store, id } = conRespuestaEnCurso();
    store.getState().conversacion.ampliarMensaje(id, 'nas tardes.');
    expect(store.getState().conversacion.mensajes.map(m => m.contenido)).toEqual([
      'Hola',
      'Buenas tardes.',
    ]);
  });

  it('actualizarMensaje cambia sus campos y cuenta la latencia una sola vez', () => {
    const { store, id } = conRespuestaEnCurso();
    const { actualizarMensaje } = store.getState().conversacion;

    actualizarMensaje(id, { emocion: 'triste' });
    expect(store.getState().metricas.latencias).toEqual([]);

    actualizarMensaje(id, { contenido: 'Buenas.', latencia_ms: 2100, enCurso: false });
    actualizarMensaje(id, { latencia_ms: 9999 });
    expect(store.getState().conversacion.mensajes[1]).toMatchObject({
      contenido: 'Buenas.',
      emocion: 'triste',
      enCurso: false,
    });
    expect(store.getState().metricas.latencias).toEqual([2100]);

    // Un id que no existe no cambia nada.
    const antes = store.getState().conversacion.mensajes;
    actualizarMensaje('otro', { contenido: 'x' });
    expect(store.getState().conversacion.mensajes).toBe(antes);
  });

  it('quitarMensaje retira la respuesta que se cortó a medias', () => {
    const { store, id } = conRespuestaEnCurso();
    store.getState().conversacion.quitarMensaje(id);
    expect(store.getState().conversacion.mensajes.map(m => m.contenido)).toEqual(['Hola']);
    expect(store.getState().metricas.totalMensajes).toBe(1);
  });

  it('respuestaEnCamino: mientras se pide o llega la respuesta, no cuando solo se está mostrando', () => {
    const store = crearAppStore();
    store.getState().npc.actualizarEstadoNPC('esperando_input');
    expect(respuestaEnCamino(store.getState())).toBe(false);

    store.getState().npc.actualizarEstadoNPC('procesando');
    expect(respuestaEnCamino(store.getState())).toBe(true);

    const { store: otro, id } = conRespuestaEnCurso();
    expect(respuestaEnCamino(otro.getState())).toBe(true);
    otro.getState().conversacion.actualizarMensaje(id, { enCurso: false });
    expect(respuestaEnCamino(otro.getState())).toBe(false);
  });

  it('una respuesta que se corta puede pasar de respondiendo a error_comunicacion', () => {
    const { store } = conRespuestaEnCurso();
    expect(store.getState().npc.actualizarEstadoNPC('error_comunicacion')).toBe(true);
  });

  it('la espera y el cierre se guardan y se reinician con la práctica', () => {
    const store = crearAppStore();
    store.getState().sesion.iniciar(sesion);
    store.getState().conversacion.establecerEspera({ desde: 1000, hasta: 9000 });
    store.getState().conversacion.establecerCierre('crisis');
    expect(store.getState().conversacion).toMatchObject({
      espera: { desde: 1000, hasta: 9000 },
      cierre: 'crisis',
    });

    store.getState().sesion.iniciar(sesion);
    expect(store.getState().conversacion).toMatchObject({ espera: null, cierre: null });

    // Al reabrir una práctica que el paciente ya había cerrado, el cierre viene del servidor.
    store.getState().sesion.iniciar({ ...sesion, cierre: 'inapropiada' });
    expect(store.getState().conversacion.cierre).toBe('inapropiada');
  });
});
