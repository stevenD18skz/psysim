import { beforeEach, describe, expect, it, vi } from 'vitest';

import { crearAppStore } from '@/store/app-store';
import { type SesionActiva } from '@/types';

import { enviarMensaje, MENSAJE_NO_DISPONIBLE, RUTA_CHAT } from './enviar-mensaje';

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

const respuestaOk = {
  respuesta_npc: 'Buenas... no sé por dónde empezar.',
  timestamp_respuesta: '2026-09-30T15:01:00.000Z',
  tokens_entrada: 500,
  tokens_salida: 20,
};

function jsonResponse(cuerpo: unknown, status = 200) {
  return new Response(JSON.stringify(cuerpo), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/** Store con la sesión activa y la conversación iniciada (esperando_input). */
function storeListo() {
  const store = crearAppStore();
  store.getState().sesion.iniciar(sesion);
  store.getState().npc.actualizarEstadoNPC('esperando_input');
  return store;
}

describe('enviarMensaje (HU-13 · T03)', () => {
  let reloj = 0;
  const ahora = () => reloj;

  beforeEach(() => {
    reloj = 1000;
  });

  it('envía el mensaje, agrega la respuesta con su latencia y pasa a respondiendo', async () => {
    const store = storeListo();
    const hacerFetch = vi.fn(async () => {
      reloj += 1234;
      return jsonResponse(respuestaOk);
    });

    const resultado = await enviarMensaje(store, '  Hola, Marta.  ', { fetch: hacerFetch, ahora });

    expect(resultado).toEqual({ ok: true });
    const [url, init] = hacerFetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(RUTA_CHAT);
    expect(JSON.parse(init.body as string)).toEqual({
      sesion_id: sesion.id,
      npc_id: sesion.npc.id,
      mensaje_usuario: 'Hola, Marta.',
      historial: [],
    });

    const { conversacion, npc, metricas } = store.getState();
    expect(conversacion.mensajes.map(m => [m.remitente, m.contenido])).toEqual([
      ['estudiante', 'Hola, Marta.'],
      ['npc', respuestaOk.respuesta_npc],
    ]);
    expect(conversacion.mensajes[1]).toMatchObject({
      latencia_ms: 1234,
      timestamp: respuestaOk.timestamp_respuesta,
    });
    expect(conversacion.pendiente).toBeNull();
    expect(npc.estado).toBe('respondiendo');
    expect(metricas).toMatchObject({
      totalMensajes: 1,
      latencias: [1234],
      tokensEntrada: 500,
      tokensSalida: 20,
    });
  });

  it('envía el historial previo sin incluir el mensaje actual', async () => {
    const store = storeListo();
    const hacerFetch = vi.fn(async () => jsonResponse(respuestaOk));
    await enviarMensaje(store, 'Primero', { fetch: hacerFetch, ahora });
    store.getState().npc.actualizarEstadoNPC('esperando_input');
    await enviarMensaje(store, 'Segundo', { fetch: hacerFetch, ahora });

    const cuerpo = JSON.parse(
      (hacerFetch.mock.calls[1] as unknown as [string, RequestInit])[1].body as string
    );
    expect(cuerpo.mensaje_usuario).toBe('Segundo');
    expect(cuerpo.historial).toEqual([
      { rol: 'user', contenido: 'Primero' },
      { rol: 'assistant', contenido: respuestaOk.respuesta_npc },
    ]);
  });

  it('impide envíos concurrentes mientras el NPC está procesando', async () => {
    const store = storeListo();
    let resolver: (r: Response) => void = () => {};
    const hacerFetch = vi.fn(() => new Promise<Response>(r => (resolver = r)));

    const primero = enviarMensaje(store, 'Uno', { fetch: hacerFetch, ahora });
    const segundo = await enviarMensaje(store, 'Dos', { fetch: hacerFetch, ahora });

    expect(segundo.ok).toBe(false);
    expect(hacerFetch).toHaveBeenCalledOnce();
    resolver(jsonResponse(respuestaOk));
    await primero;
    expect(store.getState().conversacion.mensajes).toHaveLength(2);
  });

  it('no envía mensajes vacíos ni demasiado largos', async () => {
    const store = storeListo();
    const hacerFetch = vi.fn();
    expect((await enviarMensaje(store, '   ', { fetch: hacerFetch })).ok).toBe(false);
    expect((await enviarMensaje(store, 'x'.repeat(1001), { fetch: hacerFetch })).ok).toBe(false);
    expect(hacerFetch).not.toHaveBeenCalled();
    expect(store.getState().npc.estado).toBe('esperando_input');
  });

  it.each([
    ['un error HTTP 504', async () => jsonResponse({ error: 'Tardó demasiado' }, 504)],
    ['un fallo de red', async () => Promise.reject(new TypeError('Failed to fetch'))],
    ['una respuesta con formato inesperado', async () => jsonResponse({ otra: 'cosa' })],
  ])(
    'HU-16 · T01: ante %s pasa a error_comunicacion y conserva el historial',
    async (_, respuesta) => {
      const store = storeListo();
      const resultado = await enviarMensaje(store, 'Hola', { fetch: vi.fn(respuesta), ahora });

      expect(resultado).toEqual({ ok: false, motivo: MENSAJE_NO_DISPONIBLE });
      const { conversacion, npc } = store.getState();
      expect(npc.estado).toBe('error_comunicacion');
      expect(conversacion.error).toBe(MENSAJE_NO_DISPONIBLE);
      expect(conversacion.mensajes.map(m => m.contenido)).toEqual(['Hola']);
      expect(conversacion.pendiente?.contenido).toBe('Hola');
    }
  );

  it('HU-16 · T02: reintentar reenvía el mensaje pendiente sin duplicarlo', async () => {
    const store = storeListo();
    await enviarMensaje(store, 'Hola', {
      fetch: vi.fn(async () => jsonResponse({ error: 'x' }, 502)),
      ahora,
    });

    const hacerFetch = vi.fn(async () => jsonResponse(respuestaOk));
    const resultado = await enviarMensaje(
      store,
      { reintentar: true },
      { fetch: hacerFetch, ahora }
    );

    expect(resultado.ok).toBe(true);
    const cuerpo = JSON.parse(
      (hacerFetch.mock.calls[0] as unknown as [string, RequestInit])[1].body as string
    );
    expect(cuerpo).toMatchObject({ mensaje_usuario: 'Hola', historial: [] });
    const { conversacion, npc, metricas } = store.getState();
    expect(conversacion.mensajes.map(m => m.remitente)).toEqual(['estudiante', 'npc']);
    expect(conversacion.error).toBeNull();
    expect(npc.estado).toBe('respondiendo');
    expect(metricas.totalMensajes).toBe(1);
  });

  it('muestra el mensaje del servidor cuando la sesión del docente expiró (401)', async () => {
    const store = storeListo();
    const resultado = await enviarMensaje(store, 'Hola', {
      fetch: vi.fn(async () =>
        jsonResponse({ error: 'Tu sesión expiró. Vuelve a iniciar sesión.' }, 401)
      ),
      ahora,
    });
    expect(resultado).toEqual({ ok: false, motivo: 'Tu sesión expiró. Vuelve a iniciar sesión.' });
  });
});
