import { describe, expect, it, vi } from 'vitest';

import { crearAppStore } from '@/store/app-store';
import { type SesionActiva } from '@/types';

import { ESPERAS_REINTENTO_MS, guardarMetricas, RUTA_METRICAS } from './guardar-metricas';

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

function respuesta(cuerpo: unknown, status = 200) {
  return new Response(JSON.stringify(cuerpo), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

const OK = { sesion_id: sesion.id, metrica_id: '55555555-5555-4555-8555-555555555555' };

function mensaje(remitente: 'estudiante' | 'npc', latencia_ms?: number) {
  return {
    id: crypto.randomUUID(),
    remitente,
    contenido: 'x',
    timestamp: new Date().toISOString(),
    ...(latencia_ms !== undefined && { latencia_ms }),
  };
}

/** Store con la sesión activa, dos intervenciones, dos respuestas y tres muestras de cercanía. */
function storeConConversacion() {
  const store = crearAppStore();
  const { sesion: s, conversacion, metricas } = store.getState();
  s.iniciar(sesion);
  for (const m of [
    mensaje('estudiante'),
    mensaje('npc', 1000),
    mensaje('estudiante'),
    mensaje('npc', 2001),
  ]) {
    conversacion.agregarMensaje(m);
  }
  metricas.registrarProximidad(1);
  metricas.registrarProximidad(2);
  metricas.registrarProximidad(3);
  return store;
}

const sinEspera = async () => undefined;

function cuerpoEnviado(hacerFetch: ReturnType<typeof vi.fn>) {
  const [, opciones] = hacerFetch.mock.calls[0] as unknown as [string, RequestInit];
  return JSON.parse(opciones.body as string) as unknown;
}

describe('guardarMetricas (HU-20 · T02)', () => {
  it('envía las métricas capturadas a /api/metrics/save', async () => {
    const store = crearAppStore();
    store.getState().sesion.iniciar(sesion);
    store.getState().metricas.registrarProximidad(2);
    const hacerFetch = vi.fn(async () => respuesta(OK));

    const resultado = await guardarMetricas(store, { fetch: hacerFetch });

    expect(resultado).toEqual({ estado: 'guardadas' });
    expect(hacerFetch).toHaveBeenCalledTimes(1);
    const [ruta, opciones] = hacerFetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(ruta).toBe(RUTA_METRICAS);
    expect(opciones.method).toBe('POST');
    expect(cuerpoEnviado(hacerFetch)).toEqual({
      sesion_id: sesion.id,
      total_mensajes: 0,
      latencia_promedio_ms: null,
      latencia_maxima_ms: null,
      indicadores: { proximidad_promedio: 2 },
    });
  });

  it('el cuerpo refleja la conversación: intervenciones, latencias y cercanía', async () => {
    const store = storeConConversacion();
    store.getState().metricas.registrarProximidad(Number.POSITIVE_INFINITY);
    const hacerFetch = vi.fn(async () => respuesta(OK));

    await guardarMetricas(store, { fetch: hacerFetch });

    expect(cuerpoEnviado(hacerFetch)).toMatchObject({
      total_mensajes: 2,
      latencia_promedio_ms: 1501,
      latencia_maxima_ms: 2001,
      indicadores: { proximidad_promedio: 2 },
    });
  });

  it('sin sesión activa no llama al servidor', async () => {
    const hacerFetch = vi.fn();
    const resultado = await guardarMetricas(crearAppStore(), { fetch: hacerFetch });
    expect(resultado).toMatchObject({ estado: 'fallo' });
    expect(hacerFetch).not.toHaveBeenCalled();
  });

  it('un 409 significa que la sesión ya estaba terminada', async () => {
    const resultado = await guardarMetricas(storeConConversacion(), {
      fetch: async () => respuesta({ error: 'La práctica ya terminó.' }, 409),
    });
    expect(resultado).toEqual({ estado: 'ya_terminada' });
  });

  it('un error del servidor devuelve su mensaje', async () => {
    const resultado = await guardarMetricas(storeConConversacion(), {
      fetch: async () => respuesta({ error: 'No pudimos guardar los resultados.' }, 500),
      esperar: sinEspera,
    });
    expect(resultado).toEqual({
      estado: 'fallo',
      motivo: 'No pudimos guardar los resultados.',
    });
  });

  it('un error sin JSON usa un mensaje genérico', async () => {
    const resultado = await guardarMetricas(storeConConversacion(), {
      fetch: async () => new Response('<html>502</html>', { status: 502 }),
      esperar: sinEspera,
    });
    expect(resultado).toMatchObject({ estado: 'fallo' });
  });

  it('sin conexión devuelve un fallo (no lanza)', async () => {
    const resultado = await guardarMetricas(storeConConversacion(), {
      fetch: async () => {
        throw new TypeError('Failed to fetch');
      },
      esperar: sinEspera,
    });
    expect(resultado).toMatchObject({ estado: 'fallo' });
  });

  it('una respuesta 200 con otro formato no cuenta como guardada', async () => {
    const resultado = await guardarMetricas(storeConConversacion(), {
      fetch: async () => respuesta({ ok: true }),
    });
    expect(resultado).toMatchObject({ estado: 'fallo' });
  });

  describe('reintentos automáticos', () => {
    it('ante fallos pasajeros reintenta tres veces con espera creciente', async () => {
      const hacerFetch = vi.fn(async () => respuesta({ error: 'Falló.' }, 503));
      const esperar = vi.fn(sinEspera);

      const resultado = await guardarMetricas(storeConConversacion(), {
        fetch: hacerFetch,
        esperar,
      });

      expect(resultado).toEqual({ estado: 'fallo', motivo: 'Falló.' });
      expect(hacerFetch).toHaveBeenCalledTimes(4);
      expect(esperar.mock.calls.map(([ms]: number[]) => ms)).toEqual([...ESPERAS_REINTENTO_MS]);
    });

    it('se detiene en cuanto un intento guarda', async () => {
      const hacerFetch = vi
        .fn<typeof fetch>()
        .mockRejectedValueOnce(new TypeError('Failed to fetch'))
        .mockResolvedValueOnce(respuesta(OK));

      const resultado = await guardarMetricas(storeConConversacion(), {
        fetch: hacerFetch,
        esperar: sinEspera,
      });

      expect(resultado).toEqual({ estado: 'guardadas' });
      expect(hacerFetch).toHaveBeenCalledTimes(2);
    });

    it('si se perdió la respuesta de un guardado, el 409 del reintento cuenta como terminada', async () => {
      const hacerFetch = vi
        .fn<typeof fetch>()
        .mockRejectedValueOnce(new TypeError('Failed to fetch'))
        .mockResolvedValueOnce(respuesta({ error: 'La práctica ya terminó.' }, 409));

      const resultado = await guardarMetricas(storeConConversacion(), {
        fetch: hacerFetch,
        esperar: sinEspera,
      });

      expect(resultado).toEqual({ estado: 'ya_terminada' });
    });

    it('todos los intentos envían el mismo cuerpo', async () => {
      const hacerFetch = vi.fn(async () => respuesta({ error: 'Falló.' }, 500));

      await guardarMetricas(storeConConversacion(), { fetch: hacerFetch, esperar: sinEspera });

      const cuerpos = (hacerFetch.mock.calls as unknown as [string, RequestInit][]).map(
        ([, opciones]) => opciones.body
      );
      expect(new Set(cuerpos).size).toBe(1);
    });

    it.each([400, 401, 403, 404])(
      'un %i no se reintenta: repetirlo no cambiaría nada',
      async status => {
        const hacerFetch = vi.fn(async () => respuesta({ error: 'No.' }, status));
        const esperar = vi.fn(sinEspera);

        const resultado = await guardarMetricas(storeConConversacion(), {
          fetch: hacerFetch,
          esperar,
        });

        expect(resultado).toEqual({ estado: 'fallo', motivo: 'No.' });
        expect(hacerFetch).toHaveBeenCalledTimes(1);
        expect(esperar).not.toHaveBeenCalled();
      }
    );

    it('una respuesta 200 con otro formato no se reintenta', async () => {
      const hacerFetch = vi.fn(async () => respuesta({ ok: true }));

      await guardarMetricas(storeConConversacion(), { fetch: hacerFetch, esperar: sinEspera });

      expect(hacerFetch).toHaveBeenCalledTimes(1);
    });
  });
});
