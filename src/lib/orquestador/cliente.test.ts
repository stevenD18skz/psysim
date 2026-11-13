import { describe, expect, it, vi } from 'vitest';

import { crearClienteOrquestador } from './cliente';
import { ErrorOrquestador } from './errores';
import { type EventoOrquestador } from './tipos';

const URL_BASE = 'https://orquestador.test';
const DOCENTE = { correo: 'docente@correounivalle.edu.co', contrasena: 'secreta-1' };
const GRUPO_1 = { correo: 'grupo1@psysim.test', contrasena: 'secreta-2' };
const ID = '11111111-1111-4111-8111-111111111111';
const TIEMPOS = { tiempoInicioMs: 1_000, tiempoSilencioMs: 1_000 };

type Manejador = (ruta: string, init: RequestInit) => Response | Promise<Response>;

const json = (cuerpo: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(cuerpo), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });

const login = (token = 'token-1', segundos = 3600) =>
  json({ access_token: token, token_type: 'bearer', expires_in: segundos, refresh_token: 'r' });

/** Flujo SSE con los trozos tal como los partiría la red. */
function flujo(trozos: string[], { cortar = false } = {}): Response {
  const codificador = new TextEncoder();
  const cuerpo = new ReadableStream<Uint8Array>({
    start(control) {
      for (const trozo of trozos) control.enqueue(codificador.encode(trozo));
      if (cortar) control.error(new TypeError('terminated'));
      else control.close();
    },
  });
  return new Response(cuerpo, { status: 200, headers: { 'Content-Type': 'text/event-stream' } });
}

function montar(manejador: Manejador, ahora = () => 1_000_000) {
  const llamadas: { ruta: string; init: RequestInit }[] = [];
  const hacerFetch = vi.fn(async (entrada: RequestInfo | URL, init: RequestInit = {}) => {
    const ruta = String(entrada).replace(URL_BASE, '');
    llamadas.push({ ruta, init });
    return manejador(ruta, init);
  });
  const cliente = crearClienteOrquestador({ url: URL_BASE, fetch: hacerFetch, ahora });
  const rutas = () => llamadas.map(({ ruta, init }) => `${init.method} ${ruta}`);
  return { cliente, llamadas, rutas };
}

const autorizacion = (init: RequestInit) =>
  (init.headers as Record<string, string>).Authorization ?? null;

async function recoger(generador: AsyncGenerator<EventoOrquestador>): Promise<EventoOrquestador[]> {
  const eventos: EventoOrquestador[] = [];
  for await (const evento of generador) eventos.push(evento);
  return eventos;
}

describe('inicio de sesión y caché de tokens', () => {
  it('inicia sesión una vez por cuenta y reutiliza el token', async () => {
    const { cliente, llamadas, rutas } = montar(ruta =>
      ruta === '/auth/login' ? login() : json({ id: ID, email: 'x', role: 'teacher' })
    );
    await cliente.yo(DOCENTE);
    await cliente.yo(DOCENTE);

    expect(rutas()).toEqual(['POST /auth/login', 'GET /admin/me', 'GET /admin/me']);
    expect(JSON.parse(String(llamadas[0]!.init.body))).toEqual({
      email: DOCENTE.correo,
      password: DOCENTE.contrasena,
    });
    expect(autorizacion(llamadas[1]!.init)).toBe('Bearer token-1');
  });

  it('cada cuenta tiene su propio token', async () => {
    const { cliente, llamadas } = montar((ruta, init) => {
      if (ruta !== '/auth/login') return json({ id: ID, email: 'x', role: 'student' });
      const { email } = JSON.parse(String(init.body)) as { email: string };
      return login(`token-de-${email}`);
    });
    await cliente.yo(DOCENTE);
    await cliente.yo(GRUPO_1);

    const usados = llamadas.filter(l => l.ruta === '/admin/me').map(l => autorizacion(l.init));
    expect(usados).toEqual([
      `Bearer token-de-${DOCENTE.correo}`,
      `Bearer token-de-${GRUPO_1.correo}`,
    ]);
  });

  it('peticiones simultáneas sin token comparten un solo inicio de sesión', async () => {
    const { cliente, rutas } = montar(ruta =>
      ruta === '/auth/login' ? login() : json({ id: ID, email: 'x', role: 'teacher' })
    );
    await Promise.all([cliente.yo(DOCENTE), cliente.yo(DOCENTE), cliente.yo(DOCENTE)]);
    expect(rutas().filter(r => r === 'POST /auth/login')).toHaveLength(1);
  });

  it('renueva el token un minuto antes de que venza', async () => {
    let reloj = 0;
    const { cliente, rutas } = montar(
      ruta =>
        ruta === '/auth/login' ? login('t', 3600) : json({ id: ID, email: 'x', role: 'teacher' }),
      () => reloj
    );
    await cliente.yo(DOCENTE);
    reloj = 3_539_000;
    await cliente.yo(DOCENTE);
    expect(rutas().filter(r => r === 'POST /auth/login')).toHaveLength(1);
    reloj = 3_541_000;
    await cliente.yo(DOCENTE);
    expect(rutas().filter(r => r === 'POST /auth/login')).toHaveLength(2);
  });

  it('ante un 401 inicia sesión otra vez y repite la petición una sola vez', async () => {
    let logins = 0;
    const { cliente, llamadas, rutas } = montar((ruta, init) => {
      if (ruta === '/auth/login') return login(`token-${++logins}`);
      return autorizacion(init) === 'Bearer token-1'
        ? json({ detail: 'Token vencido' }, 401)
        : json({ id: ID, email: 'x', role: 'teacher' });
    });
    await expect(cliente.yo(DOCENTE)).resolves.toMatchObject({ role: 'teacher' });
    expect(rutas()).toEqual([
      'POST /auth/login',
      'GET /admin/me',
      'POST /auth/login',
      'GET /admin/me',
    ]);
    expect(autorizacion(llamadas[3]!.init)).toBe('Bearer token-2');
  });

  it('si el 401 sigue después de volver a entrar, falla como autenticación', async () => {
    const { cliente, rutas } = montar(ruta =>
      ruta === '/auth/login' ? login() : json({ detail: 'no' }, 401)
    );
    await expect(cliente.yo(DOCENTE)).rejects.toMatchObject({ tipo: 'autenticacion', estado: 401 });
    expect(rutas()).toHaveLength(4);
  });

  it('credenciales rechazadas en el login: autenticación, sin reintentos', async () => {
    const { cliente, rutas } = montar(() => json({ detail: 'Credenciales incorrectas' }, 401));
    await expect(cliente.yo(DOCENTE)).rejects.toMatchObject({ tipo: 'autenticacion' });
    expect(rutas()).toEqual(['POST /auth/login']);
  });

  it('un login con cuerpo inesperado es una respuesta inválida', async () => {
    const { cliente } = montar(() => json({ ok: true }));
    await expect(cliente.yo(DOCENTE)).rejects.toMatchObject({ tipo: 'respuesta_invalida' });
  });
});

describe('errores de las peticiones', () => {
  const conSesion =
    (respuesta: () => Response | Promise<Response>): Manejador =>
    ruta =>
      ruta === '/auth/login' ? login() : respuesta();

  it('clasifica los códigos y lee Retry-After del 429', async () => {
    const { cliente } = montar(conSesion(() => json({}, 429, { 'Retry-After': '9' })));
    await expect(cliente.historial(DOCENTE, ID)).rejects.toMatchObject({
      tipo: 'limite',
      estado: 429,
      esperaS: 9,
    });
  });

  it('un fallo de red o un tiempo agotado no exponen el error original', async () => {
    const red = montar(conSesion(() => Promise.reject(new TypeError('fetch failed'))));
    const fallo = await red.cliente.yo(DOCENTE).catch((e: unknown) => e);
    expect(fallo).toBeInstanceOf(ErrorOrquestador);
    expect(fallo).toMatchObject({ tipo: 'red' });

    const lento = montar(
      conSesion(() => Promise.reject(new DOMException('tardó', 'TimeoutError')))
    );
    await expect(lento.cliente.yo(DOCENTE)).rejects.toMatchObject({ tipo: 'tiempo_agotado' });
  });

  it('un 2xx que no cumple el contrato es una respuesta inválida', async () => {
    const { cliente } = montar(conSesion(() => json({ id: 'no-es-uuid' })));
    await expect(cliente.yo(DOCENTE)).rejects.toMatchObject({ tipo: 'respuesta_invalida' });
  });
});

describe('gestión de perfiles, escenarios y sesiones', () => {
  const perfil = {
    name: '-3D- Ana',
    description: 'Paciente',
    traits: { edad: 30 },
    behavior: { behavior_min: 1, behavior_max: 4, triggers: [], regulators: [] },
  };
  const escenario = {
    name: '-3D- E-01',
    context: 'Contexto',
    severity: 2,
    risk_flags: [],
    constraints: {},
  };

  it('crea y actualiza con las rutas del OpenAPI', async () => {
    const { cliente, llamadas, rutas } = montar(ruta =>
      ruta === '/auth/login' ? login() : json({ id: ID, name: 'x' }, 201)
    );
    await expect(cliente.crearPerfil(DOCENTE, perfil)).resolves.toBe(ID);
    await expect(cliente.crearEscenario(DOCENTE, escenario)).resolves.toBe(ID);
    await cliente.actualizarPerfil(DOCENTE, ID, perfil);
    await cliente.actualizarEscenario(DOCENTE, ID, escenario);

    expect(rutas().slice(1)).toEqual([
      'POST /profiles/create',
      'POST /scenarios/create',
      `PATCH /profiles/${ID}/update`,
      `PATCH /scenarios/${ID}/update`,
    ]);
    expect(JSON.parse(String(llamadas[2]!.init.body))).toEqual(escenario);
  });

  it('abre la sesión para otra cuenta solo si se indica', async () => {
    const { cliente, llamadas } = montar(ruta =>
      ruta === '/auth/login'
        ? login()
        : json({ id: ID, status: 'active', current_severity: 2 }, 201)
    );
    await cliente.abrirSesion(DOCENTE, { perfilId: ID, escenarioId: ID });
    await cliente.abrirSesion(DOCENTE, { perfilId: ID, escenarioId: ID, usuarioId: ID });

    expect(JSON.parse(String(llamadas[1]!.init.body))).toEqual({ profile_id: ID, scenario_id: ID });
    expect(JSON.parse(String(llamadas[2]!.init.body))).toEqual({
      profile_id: ID,
      scenario_id: ID,
      user_id: ID,
    });
  });

  it('reporta el tiempo en tramos de 600 s como máximo', async () => {
    const { cliente, llamadas } = montar(ruta => (ruta === '/auth/login' ? login() : json({})));
    await cliente.reportarTiempo(DOCENTE, ID, 1_450.4);
    const tramos = llamadas
      .filter(l => l.ruta.endsWith('/time'))
      .map(l => (JSON.parse(String(l.init.body)) as { delta_seconds: number }).delta_seconds);
    expect(tramos).toEqual([600, 600, 250]);
  });

  it('no reporta nada si la duración es cero o negativa', async () => {
    const { cliente, rutas } = montar(() => login());
    await cliente.reportarTiempo(DOCENTE, ID, 0);
    await cliente.reportarTiempo(DOCENTE, ID, -20);
    expect(rutas()).toEqual([]);
  });

  it('cerrar una sesión ya cerrada (400) no es un error; otros fallos sí', async () => {
    const cerrada = montar(ruta => (ruta === '/auth/login' ? login() : json({}, 400)));
    await expect(cerrada.cliente.cerrarSesion(DOCENTE, ID, 'success')).resolves.toBeUndefined();

    const ajena = montar(ruta => (ruta === '/auth/login' ? login() : json({}, 403)));
    await expect(ajena.cliente.cerrarSesion(DOCENTE, ID, 'crisis')).rejects.toMatchObject({
      tipo: 'permiso',
    });
    expect(JSON.parse(String(ajena.llamadas[1]!.init.body))).toEqual({ closing_kind: 'crisis' });
  });
});

describe('conversar', () => {
  const conFlujo =
    (respuesta: () => Response): Manejador =>
    ruta =>
      ruta === '/auth/login' ? login() : respuesta();

  it('entrega los fragmentos y termina con el fin del turno', async () => {
    const { cliente, llamadas } = montar(
      conFlujo(() =>
        flujo([
          'event: chunk\ndata: {"chunk":"[triste 2] No"}\n\nevent: ch',
          'unk\ndata: {"chunk":" sé…"}\n\n',
          'event: done\ndata: {"done":true,"severity":2.5,"should_close":false,"closing_kind":null,"metrics":{}}\n\n',
        ])
      )
    );
    const eventos = await recoger(cliente.conversar(GRUPO_1, ID, 'Hola', TIEMPOS));

    expect(eventos).toEqual([
      { tipo: 'fragmento', texto: '[triste 2] No' },
      { tipo: 'fragmento', texto: ' sé…' },
      expect.objectContaining({ tipo: 'fin', severidad: 2.5, debeCerrar: false, cierre: null }),
    ]);
    expect(llamadas[1]!.ruta).toBe(`/conversation/${ID}/stream`);
    expect(JSON.parse(String(llamadas[1]!.init.body))).toEqual({ content: 'Hola' });
  });

  it('entrega el evento de error del orquestador y deja de leer', async () => {
    const { cliente } = montar(
      conFlujo(() =>
        flujo([
          'event: chunk\ndata: {"chunk":"No"}\n\n',
          'event: error\ndata: {"error":"IA caída","discarded":false}\n\n',
          'event: chunk\ndata: {"chunk":"ya no se lee"}\n\n',
        ])
      )
    );
    const eventos = await recoger(cliente.conversar(GRUPO_1, ID, 'Hola', TIEMPOS));
    expect(eventos).toEqual([
      { tipo: 'fragmento', texto: 'No' },
      { tipo: 'error', descartado: false },
    ]);
  });

  it('si el flujo se cierra sin fin ni error, es un fallo de red', async () => {
    const { cliente } = montar(conFlujo(() => flujo(['event: chunk\ndata: {"chunk":"No"}\n\n'])));
    await expect(recoger(cliente.conversar(GRUPO_1, ID, 'Hola', TIEMPOS))).rejects.toMatchObject({
      tipo: 'red',
    });
  });

  it('si la conexión se corta a medias, es un fallo de red', async () => {
    const { cliente } = montar(
      conFlujo(() => flujo(['event: chunk\ndata: {"chunk":"No"}\n\n'], { cortar: true }))
    );
    await expect(recoger(cliente.conversar(GRUPO_1, ID, 'Hola', TIEMPOS))).rejects.toMatchObject({
      tipo: 'red',
    });
  });

  it('los códigos de error llegan antes del flujo: 429 con su espera y 500 en duda', async () => {
    const limite = montar(conFlujo(() => json({}, 429, { 'Retry-After': '20' })));
    await expect(
      recoger(limite.cliente.conversar(GRUPO_1, ID, 'Hola', TIEMPOS))
    ).rejects.toMatchObject({ tipo: 'limite', esperaS: 20 });

    const duda = montar(conFlujo(() => json({}, 500)));
    await expect(
      recoger(duda.cliente.conversar(GRUPO_1, ID, 'Hola', TIEMPOS))
    ).rejects.toMatchObject({
      tipo: 'descarte_incierto',
    });
  });

  it('corta la espera si la respuesta no empieza a tiempo', async () => {
    const { cliente } = montar((ruta, init) => {
      if (ruta === '/auth/login') return login();
      return new Promise<Response>((_, rechazar) => {
        init.signal?.addEventListener('abort', () =>
          rechazar(new DOMException('abortada', 'AbortError'))
        );
      });
    });
    await expect(
      recoger(cliente.conversar(GRUPO_1, ID, 'Hola', { tiempoInicioMs: 20, tiempoSilencioMs: 20 }))
    ).rejects.toMatchObject({ tipo: 'tiempo_agotado' });
  });

  it('corta la espera si el flujo se queda en silencio', async () => {
    const { cliente } = montar((ruta, init) => {
      if (ruta === '/auth/login') return login();
      const codificador = new TextEncoder();
      const cuerpo = new ReadableStream<Uint8Array>({
        start(control) {
          control.enqueue(codificador.encode('event: chunk\ndata: {"chunk":"No"}\n\n'));
          init.signal?.addEventListener('abort', () =>
            control.error(new DOMException('abortada', 'AbortError'))
          );
        },
      });
      return new Response(cuerpo, { status: 200 });
    });
    const eventos: EventoOrquestador[] = [];
    const lectura = (async () => {
      for await (const evento of cliente.conversar(GRUPO_1, ID, 'Hola', {
        tiempoInicioMs: 1_000,
        tiempoSilencioMs: 20,
      })) {
        eventos.push(evento);
      }
    })();
    await expect(lectura).rejects.toMatchObject({ tipo: 'tiempo_agotado' });
    expect(eventos).toEqual([{ tipo: 'fragmento', texto: 'No' }]);
  });
});
