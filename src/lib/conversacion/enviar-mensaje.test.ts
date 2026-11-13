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
  emocion_npc: 'ansioso',
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
      // Pide la respuesta por partes; si el servidor responde un JSON completo, también vale.
      por_partes: true,
    });

    const { conversacion, npc, metricas } = store.getState();
    expect(conversacion.mensajes.map(m => [m.remitente, m.contenido])).toEqual([
      ['estudiante', 'Hola, Marta.'],
      ['npc', respuestaOk.respuesta_npc],
    ]);
    expect(conversacion.mensajes[1]).toMatchObject({
      latencia_ms: 1234,
      timestamp: respuestaOk.timestamp_respuesta,
      // La emoción viaja con el mensaje para el lenguaje no verbal del paciente 3D.
      emocion: 'ansioso',
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

  it('no envía el historial: el servidor lo reconstruye con lo que guardó (LLM01)', async () => {
    const store = storeListo();
    const hacerFetch = vi.fn(async () => jsonResponse(respuestaOk));
    await enviarMensaje(store, 'Primero', { fetch: hacerFetch, ahora });
    store.getState().npc.actualizarEstadoNPC('esperando_input');
    await enviarMensaje(store, 'Segundo', { fetch: hacerFetch, ahora });

    const cuerpo = JSON.parse(
      (hacerFetch.mock.calls[1] as unknown as [string, RequestInit])[1].body as string
    );
    expect(cuerpo.mensaje_usuario).toBe('Segundo');
    expect(cuerpo).not.toHaveProperty('reintento');
    expect(cuerpo).not.toHaveProperty('historial');
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
    // Si el intercambio sí se guardó y solo se perdió la respuesta, el servidor no lo duplica.
    expect(cuerpo).toMatchObject({ mensaje_usuario: 'Hola', reintento: true });
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

  it('RNF-03.7: muestra cuánto esperar cuando se alcanza el límite de mensajes (429)', async () => {
    const store = storeListo();
    const aviso = 'Estás enviando mensajes muy seguido. Espera 30 s antes de volver a escribir.';
    const resultado = await enviarMensaje(store, 'Hola', {
      fetch: vi.fn(async () => jsonResponse({ error: aviso }, 429)),
      ahora,
    });
    expect(resultado).toEqual({ ok: false, motivo: aviso });
    // El mensaje queda pendiente: el estudiante lo reintenta cuando pase la espera.
    const { conversacion, npc } = store.getState();
    expect(npc.estado).toBe('error_comunicacion');
    expect(conversacion.pendiente?.contenido).toBe('Hola');
  });

  it('muestra el aviso del servidor cuando la práctica ya terminó (409)', async () => {
    const store = storeListo();
    const resultado = await enviarMensaje(store, 'Hola', {
      fetch: vi.fn(async () => jsonResponse({ error: 'La práctica ya terminó.' }, 409)),
      ahora,
    });
    expect(resultado).toEqual({ ok: false, motivo: 'La práctica ya terminó.' });
  });

  it('descarta una respuesta que llega cuando ya se abrió otra vez la práctica', async () => {
    const store = storeListo();
    const resultado = await enviarMensaje(store, 'Hola', {
      fetch: vi.fn(async () => {
        // Mientras el paciente piensa, el estudiante sale y vuelve: el historial del servidor ya
        // trae el intercambio.
        store.getState().sesion.iniciar({ ...sesion });
        return jsonResponse({
          ...respuestaOk,
          id_mensaje_estudiante: '11111111-1111-4111-8111-111111111111',
          id_mensaje_npc: '22222222-2222-4222-8222-222222222222',
        });
      }),
      ahora,
    });
    expect(resultado.ok).toBe(false);
    expect(store.getState().conversacion.mensajes.some(m => m.remitente === 'npc')).toBe(false);
  });
});

/** Respuesta por partes: cada paso entrega un trozo del flujo y, antes, deja mirar el store. */
function flujoDeEventos(pasos: (string | (() => void))[]) {
  const codificador = new TextEncoder();
  let indice = 0;
  const cuerpo = new ReadableStream<Uint8Array>(
    {
      pull(controlador) {
        for (;;) {
          const paso = pasos[indice++];
          if (paso === undefined) return controlador.close();
          if (typeof paso === 'string') return controlador.enqueue(codificador.encode(paso));
          paso();
        }
      },
    },
    // Sin cola: cada trozo se produce cuando el lector lo pide, ya procesado el anterior.
    { highWaterMark: 0 }
  );
  return new Response(cuerpo, {
    status: 200,
    headers: { 'Content-Type': 'text/event-stream; charset=utf-8' },
  });
}

const evento = (tipo: string, datos: object = {}) =>
  `event: ${tipo}\ndata: ${JSON.stringify(datos)}\n\n`;

const INICIO = 'Buenas… la verdad no sé muy bien ';
const RESTO = 'por dónde empezar.';
const finOk = {
  respuesta: {
    respuesta_npc: INICIO + RESTO,
    emocion_npc: 'triste',
    intensidad_npc: 3,
    timestamp_respuesta: '2026-09-30T15:01:00.000Z',
    tokens_entrada: 500,
    tokens_salida: 20,
    id_mensaje_estudiante: '11111111-1111-4111-8111-111111111111',
    id_mensaje_npc: '22222222-2222-4222-8222-222222222222',
    cierre: null,
  },
};

describe('enviarMensaje con la respuesta por partes', () => {
  let reloj = 1000;
  const ahora = () => reloj;

  it('muestra el texto mientras llega y al final lo reemplaza por el guardado', async () => {
    const store = storeListo();
    const vistos: unknown[] = [];
    const mirar = () => {
      const { conversacion, npc } = store.getState();
      vistos.push([npc.estado, conversacion.mensajes.at(-1)?.contenido]);
    };
    const hacerFetch = vi.fn(async () =>
      flujoDeEventos([
        evento('emocion', { emocion: 'triste', intensidad: 2 }),
        evento('fragmento', { texto: 'Buenas… ' }),
        // Con tan poco texto todavía no hay burbuja: el paciente sigue pensando.
        mirar,
        evento('fragmento', { texto: 'la verdad no sé muy bien ' }),
        mirar,
        () => (reloj += 2500),
        evento('fragmento', { texto: RESTO }),
        mirar,
        evento('fin', finOk),
      ])
    );

    const resultado = await enviarMensaje(store, 'Hola', { fetch: hacerFetch, ahora });

    expect(resultado).toEqual({ ok: true });
    expect(vistos).toEqual([
      ['procesando', 'Hola'],
      ['respondiendo', INICIO],
      ['respondiendo', INICIO + RESTO],
    ]);
    const { conversacion, npc, metricas } = store.getState();
    expect(npc.estado).toBe('respondiendo');
    expect(conversacion.pendiente).toBeNull();
    expect(conversacion.mensajes).toHaveLength(2);
    expect(conversacion.mensajes[1]).toMatchObject({
      id: finOk.respuesta.id_mensaje_npc,
      contenido: INICIO + RESTO,
      // La intensidad final (ajustada por la severidad) reemplaza a la de la etiqueta.
      emocion: 'triste',
      intensidad: 3,
      latencia_ms: 2500,
      enCurso: false,
    });
    expect(conversacion.mensajes[1]).not.toHaveProperty('sinGuardar');
    // La latencia se cuenta una sola vez, al completarse la respuesta.
    expect(metricas).toMatchObject({ latencias: [2500], tokensEntrada: 500, tokensSalida: 20 });
  });

  it('la emoción llega antes que el texto y el paciente la muestra desde la primera palabra', async () => {
    const store = storeListo();
    let alEmpezar: unknown;
    await enviarMensaje(store, 'Hola', {
      fetch: vi.fn(async () =>
        flujoDeEventos([
          evento('emocion', { emocion: 'ansioso', intensidad: 2 }),
          evento('fragmento', { texto: INICIO }),
          () => (alEmpezar = store.getState().conversacion.mensajes.at(-1)),
          evento('fin', finOk),
        ])
      ),
      ahora,
    });
    expect(alEmpezar).toMatchObject({ emocion: 'ansioso', intensidad: 2, enCurso: true });
  });

  it('una respuesta corta aparece completa al final, sin burbuja a medias', async () => {
    const store = storeListo();
    const fin = { respuesta: { ...finOk.respuesta, respuesta_npc: 'No sé.' } };
    await enviarMensaje(store, 'Hola', {
      fetch: vi.fn(async () =>
        flujoDeEventos([evento('fragmento', { texto: 'No sé.' }), evento('fin', fin)])
      ),
      ahora,
    });
    const { conversacion, npc } = store.getState();
    expect(conversacion.mensajes.map(m => m.contenido)).toEqual(['Hola', 'No sé.']);
    expect(npc.estado).toBe('respondiendo');
  });

  it('avisa de la espera mientras el servidor aguarda cupo y la borra al llegar el texto', async () => {
    const store = storeListo();
    let espera: unknown;
    await enviarMensaje(store, 'Hola', {
      fetch: vi.fn(async () =>
        flujoDeEventos([
          evento('espera', { segundos: 12 }),
          () => (espera = store.getState().conversacion.espera),
          evento('fragmento', { texto: INICIO }),
          evento('fin', finOk),
        ])
      ),
      ahora,
    });
    expect(espera).toMatchObject({ desde: expect.any(Number), hasta: expect.any(Number) });
    const { desde, hasta } = espera as { desde: number; hasta: number };
    expect(hasta - desde).toBeGreaterThanOrEqual(12_000);
    expect(store.getState().conversacion.espera).toBeNull();
  });

  it('con «reinicio» descarta lo mostrado: otro proveedor responde desde cero', async () => {
    const store = storeListo();
    let trasReinicio: unknown;
    await enviarMensaje(store, 'Hola', {
      fetch: vi.fn(async () =>
        flujoDeEventos([
          evento('fragmento', { texto: 'Texto de un intento que falló a medias. ' }),
          evento('reinicio'),
          () => (trasReinicio = store.getState().conversacion.mensajes.at(-1)?.contenido),
          evento('fragmento', { texto: INICIO + RESTO }),
          evento('fin', finOk),
        ])
      ),
      ahora,
    });
    expect(trasReinicio).toBe('');
    expect(store.getState().conversacion.mensajes.at(-1)?.contenido).toBe(INICIO + RESTO);
  });

  it.each([
    [
      'un evento de error (p. ej. la respuesta copiaba las instrucciones)',
      [
        evento('fragmento', { texto: INICIO }),
        evento('error', {
          status: 502,
          error: 'El servicio de IA devolvió una respuesta inválida.',
        }),
      ],
      MENSAJE_NO_DISPONIBLE,
    ],
    [
      'un flujo que se corta sin terminar',
      [evento('fragmento', { texto: INICIO })],
      MENSAJE_NO_DISPONIBLE,
    ],
    [
      'el límite del paciente (429): muestra cuánto esperar',
      [
        evento('espera', { segundos: 20 }),
        evento('error', {
          status: 429,
          error: 'El paciente necesita unos segundos. Inténtalo en 14 s.',
          espera_s: 14,
        }),
      ],
      'El paciente necesita unos segundos. Inténtalo en 14 s.',
    ],
  ])('ante %s quita lo que había llegado y deja reintentar', async (_, pasos, motivo) => {
    const store = storeListo();
    const resultado = await enviarMensaje(store, 'Hola', {
      fetch: vi.fn(async () => flujoDeEventos(pasos)),
      ahora,
    });

    expect(resultado).toEqual({ ok: false, motivo });
    const { conversacion, npc } = store.getState();
    expect(npc.estado).toBe('error_comunicacion');
    expect(conversacion.mensajes.map(m => m.contenido)).toEqual(['Hola']);
    expect(conversacion.pendiente?.contenido).toBe('Hola');
    expect(conversacion.espera).toBeNull();
  });

  it('si el paciente cierra la consulta, queda anotado y no se envía nada más', async () => {
    const store = storeListo();
    const fin = { respuesta: { ...finOk.respuesta, cierre: 'crisis' } };
    const hacerFetch = vi.fn(async () =>
      flujoDeEventos([evento('fragmento', { texto: INICIO + RESTO }), evento('fin', fin)])
    );
    await enviarMensaje(store, 'Hola', { fetch: hacerFetch, ahora });

    expect(store.getState().conversacion.cierre).toBe('crisis');
    store.getState().npc.actualizarEstadoNPC('esperando_input');
    const otro = await enviarMensaje(store, 'Otra cosa', { fetch: hacerFetch, ahora });
    expect(otro).toEqual({ ok: false, motivo: 'La práctica ya terminó.' });
    expect(hacerFetch).toHaveBeenCalledOnce();
  });

  it('ignora eventos desconocidos o ilegibles sin romper la respuesta', async () => {
    const store = storeListo();
    const resultado = await enviarMensaje(store, 'Hola', {
      fetch: vi.fn(async () =>
        flujoDeEventos([
          ': latido\n\n',
          evento('novedad', { algo: 1 }),
          'event: fragmento\ndata: {no es json\n\n',
          evento('fragmento', { texto: INICIO + RESTO }),
          evento('fin', finOk),
        ])
      ),
      ahora,
    });
    expect(resultado).toEqual({ ok: true });
    expect(store.getState().conversacion.mensajes.at(-1)?.contenido).toBe(INICIO + RESTO);
  });
});
