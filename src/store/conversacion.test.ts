import { describe, expect, it, vi } from 'vitest';

import { type MensajeConversacion, type SesionActiva } from '@/types';

import { crearAppStore } from './app-store';

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
