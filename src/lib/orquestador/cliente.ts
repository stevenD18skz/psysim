import 'server-only';

import { type z } from 'zod';

import { type CredencialOrquestador, getOrquestadorEnv } from '@/lib/env/orquestador';
import { crearLectorSse } from '@/lib/sse';

import { clasificarEstado, clasificarExcepcion, ErrorOrquestador, leerRetryAfter } from './errores';
import { interpretarEvento } from './sse';
import {
  type CierreOrquestador,
  type EscenarioOrquestador,
  type EventoOrquestador,
  historialOrquestadorSchema,
  loginSchema,
  type MensajeOrquestador,
  type PerfilOrquestador,
  recursoSchema,
  type SesionOrquestador,
  sesionOrquestadorSchema,
  type UsuarioOrquestador,
  usuarioOrquestadorSchema,
} from './tipos';

/** Tiempo máximo de las llamadas cortas (login, perfiles, escenarios, sesiones). */
export const TIEMPO_GESTION_MS = 10_000;

/** El token se renueva un minuto antes de vencer para no gastar un 401 en cada hora. */
const MARGEN_TOKEN_MS = 60_000;

/** `PATCH /sessions/{id}/time` acepta como máximo 600 segundos por llamada. */
export const MAXIMO_TRAMO_TIEMPO_S = 600;

interface Token {
  valor: string;
  venceEn: number;
}

interface OpcionesPeticion<T extends z.ZodType> {
  cuerpo?: unknown;
  esquema?: T;
  tiempoMs?: number;
  /** Rutas `/conversation/*`: un 500 significa que el turno pudo quedar guardado. */
  enConversacion?: boolean;
}

export interface OpcionesTurno {
  /** Plazo para que empiece a llegar la respuesta (el primer turno de una sesión tarda más). */
  tiempoInicioMs: number;
  /** Plazo entre un fragmento y el siguiente. */
  tiempoSilencioMs: number;
}

interface Dependencias {
  url: string;
  fetch?: typeof fetch;
  /** Reloj de pared en milisegundos (vencimiento de los tokens). */
  ahora?: () => number;
}

/**
 * Cliente HTTP del orquestador. Los tokens viven en la memoria del proceso, uno por cuenta, con
 * su vencimiento: nunca en la base de datos ni en el navegador. No hay endpoint de renovación, así
 * que ante un 401 se vuelve a iniciar sesión y la petición se repite una sola vez.
 */
export function crearClienteOrquestador({
  url,
  fetch: hacerFetch = fetch,
  ahora = () => Date.now(),
}: Dependencias) {
  const tokens = new Map<string, Token>();
  // Varias peticiones que llegan sin token comparten un solo inicio de sesión.
  const iniciando = new Map<string, Promise<string>>();

  async function iniciarSesion(cuenta: CredencialOrquestador): Promise<string> {
    let respuesta: Response;
    try {
      respuesta = await hacerFetch(`${url}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cuenta.correo, password: cuenta.contrasena }),
        signal: AbortSignal.timeout(TIEMPO_GESTION_MS),
      });
    } catch (error) {
      throw new ErrorOrquestador(clasificarExcepcion(error), { cause: error });
    }
    if (!respuesta.ok) {
      throw new ErrorOrquestador(clasificarEstado(respuesta.status), { estado: respuesta.status });
    }
    const datos = loginSchema.safeParse(await respuesta.json().catch(() => null));
    if (!datos.success) throw new ErrorOrquestador('respuesta_invalida');
    tokens.set(cuenta.correo, {
      valor: datos.data.access_token,
      venceEn: ahora() + datos.data.expires_in * 1000 - MARGEN_TOKEN_MS,
    });
    return datos.data.access_token;
  }

  function tokenDe(cuenta: CredencialOrquestador): Promise<string> {
    const guardado = tokens.get(cuenta.correo);
    if (guardado && guardado.venceEn > ahora()) return Promise.resolve(guardado.valor);

    let enCurso = iniciando.get(cuenta.correo);
    if (!enCurso) {
      enCurso = iniciarSesion(cuenta).finally(() => iniciando.delete(cuenta.correo));
      iniciando.set(cuenta.correo, enCurso);
    }
    return enCurso;
  }

  /** `fetch` autenticado: ante un 401 inicia sesión otra vez y repite una sola vez. */
  async function llamar(
    cuenta: CredencialOrquestador,
    metodo: string,
    ruta: string,
    cuerpo: unknown,
    senal: AbortSignal,
    enConversacion: boolean
  ): Promise<Response> {
    for (let intento = 0; ; intento++) {
      const token = await tokenDe(cuenta);
      let respuesta: Response;
      try {
        respuesta = await hacerFetch(`${url}${ruta}`, {
          method: metodo,
          headers: {
            Authorization: `Bearer ${token}`,
            ...(cuerpo === undefined ? {} : { 'Content-Type': 'application/json' }),
          },
          ...(cuerpo === undefined ? {} : { body: JSON.stringify(cuerpo) }),
          signal: senal,
        });
      } catch (error) {
        throw new ErrorOrquestador(clasificarExcepcion(error), { cause: error });
      }
      if (respuesta.ok) return respuesta;

      if (respuesta.status === 401 && intento === 0) {
        // Solo se olvida el token que falló: otra petición pudo renovarlo mientras tanto.
        if (tokens.get(cuenta.correo)?.valor === token) tokens.delete(cuenta.correo);
        await respuesta.body?.cancel().catch(() => undefined);
        continue;
      }
      await respuesta.body?.cancel().catch(() => undefined);
      throw new ErrorOrquestador(clasificarEstado(respuesta.status, enConversacion), {
        estado: respuesta.status,
        esperaS: leerRetryAfter(respuesta.headers.get('Retry-After'), ahora()),
      });
    }
  }

  async function pedir<T extends z.ZodType>(
    cuenta: CredencialOrquestador,
    metodo: string,
    ruta: string,
    { cuerpo, esquema, tiempoMs = TIEMPO_GESTION_MS, enConversacion = false }: OpcionesPeticion<T>
  ): Promise<z.infer<T>> {
    const respuesta = await llamar(
      cuenta,
      metodo,
      ruta,
      cuerpo,
      AbortSignal.timeout(tiempoMs),
      enConversacion
    );
    if (!esquema) {
      await respuesta.body?.cancel().catch(() => undefined);
      return undefined as z.infer<T>;
    }
    let json: unknown;
    try {
      json = await respuesta.json();
    } catch (error) {
      // El cuerpo se cortó a medias o no era JSON.
      throw new ErrorOrquestador('respuesta_invalida', { cause: error });
    }
    const datos = esquema.safeParse(json);
    if (!datos.success) throw new ErrorOrquestador('respuesta_invalida');
    return datos.data;
  }

  return {
    /** Quién es la cuenta para el orquestador (su id y su rol). */
    yo(cuenta: CredencialOrquestador): Promise<UsuarioOrquestador> {
      return pedir(cuenta, 'GET', '/admin/me', { esquema: usuarioOrquestadorSchema });
    },

    async crearPerfil(cuenta: CredencialOrquestador, perfil: PerfilOrquestador): Promise<string> {
      const creado = await pedir(cuenta, 'POST', '/profiles/create', {
        cuerpo: perfil,
        esquema: recursoSchema,
      });
      return creado.id;
    },

    async actualizarPerfil(
      cuenta: CredencialOrquestador,
      id: string,
      perfil: PerfilOrquestador
    ): Promise<void> {
      await pedir(cuenta, 'PATCH', `/profiles/${id}/update`, {
        cuerpo: perfil,
        esquema: recursoSchema,
      });
    },

    async crearEscenario(
      cuenta: CredencialOrquestador,
      escenario: EscenarioOrquestador
    ): Promise<string> {
      const creado = await pedir(cuenta, 'POST', '/scenarios/create', {
        cuerpo: escenario,
        esquema: recursoSchema,
      });
      return creado.id;
    },

    async actualizarEscenario(
      cuenta: CredencialOrquestador,
      id: string,
      escenario: EscenarioOrquestador
    ): Promise<void> {
      await pedir(cuenta, 'PATCH', `/scenarios/${id}/update`, {
        cuerpo: escenario,
        esquema: recursoSchema,
      });
    },

    /** Crea la sesión. Con `usuarioId`, queda asignada a esa cuenta, que es quien conversa. */
    abrirSesion(
      cuenta: CredencialOrquestador,
      datos: { perfilId: string; escenarioId: string; usuarioId?: string }
    ): Promise<SesionOrquestador> {
      return pedir(cuenta, 'POST', '/sessions/start', {
        cuerpo: {
          profile_id: datos.perfilId,
          scenario_id: datos.escenarioId,
          ...(datos.usuarioId ? { user_id: datos.usuarioId } : {}),
        },
        esquema: sesionOrquestadorSchema,
      });
    },

    /** Estado de la sesión en el orquestador (`active`, `completed` o `terminated`). */
    sesion(cuenta: CredencialOrquestador, sesionId: string): Promise<SesionOrquestador> {
      return pedir(cuenta, 'GET', `/sessions/${sesionId}`, { esquema: sesionOrquestadorSchema });
    },

    /** Historial que guardó el orquestador, para conciliar un turno de resultado incierto. */
    historial(cuenta: CredencialOrquestador, sesionId: string): Promise<MensajeOrquestador[]> {
      return pedir(cuenta, 'GET', `/conversation/${sesionId}/history`, {
        esquema: historialOrquestadorSchema,
      });
    },

    /**
     * Suma tiempo de práctica en tramos de 600 s como máximo. Solo lo acepta de la cuenta dueña
     * de la sesión; si ya estaba cerrada, el orquestador lo ignora sin error.
     */
    async reportarTiempo(
      cuenta: CredencialOrquestador,
      sesionId: string,
      segundos: number
    ): Promise<void> {
      for (let resto = Math.max(0, Math.round(segundos)); resto > 0;) {
        const tramo = Math.min(resto, MAXIMO_TRAMO_TIEMPO_S);
        await pedir(cuenta, 'PATCH', `/sessions/${sesionId}/time`, {
          cuerpo: { delta_seconds: tramo },
        });
        resto -= tramo;
      }
    },

    /** Cierra la sesión. Un 400 significa que ya estaba cerrada: no es un error. */
    async cerrarSesion(
      cuenta: CredencialOrquestador,
      sesionId: string,
      cierre: CierreOrquestador
    ): Promise<void> {
      try {
        await pedir(cuenta, 'PATCH', `/sessions/${sesionId}/end`, {
          cuerpo: { closing_kind: cierre },
        });
      } catch (error) {
        if (error instanceof ErrorOrquestador && error.estado === 400) return;
        throw error;
      }
    },

    /**
     * Envía un turno y entrega la respuesta por partes. Termina con un evento `fin` o `error`; si
     * el flujo se corta antes, lanza `ErrorOrquestador` (`red` o `tiempo_agotado`).
     */
    async *conversar(
      cuenta: CredencialOrquestador,
      sesionId: string,
      mensaje: string,
      { tiempoInicioMs, tiempoSilencioMs }: OpcionesTurno
    ): AsyncGenerator<EventoOrquestador, void, void> {
      const control = new AbortController();
      let temporizador = setTimeout(() => control.abort(), tiempoInicioMs);
      const darPlazo = (ms: number) => {
        clearTimeout(temporizador);
        temporizador = setTimeout(() => control.abort(), ms);
      };

      try {
        const respuesta = await llamar(
          cuenta,
          'POST',
          `/conversation/${sesionId}/stream`,
          { content: mensaje },
          control.signal,
          true
        );
        if (!respuesta.body) throw new ErrorOrquestador('respuesta_invalida');

        const lector = crearLectorSse();
        const decodificador = new TextDecoder();
        const cuerpo = respuesta.body.getReader();
        let terminado = false;
        try {
          while (!terminado) {
            let trozo: ReadableStreamReadResult<Uint8Array>;
            try {
              trozo = await cuerpo.read();
            } catch (error) {
              throw new ErrorOrquestador(clasificarExcepcion(error), { cause: error });
            }
            if (trozo.done) break;
            darPlazo(tiempoSilencioMs);
            for (const bruto of lector.alimentar(
              decodificador.decode(trozo.value, { stream: true })
            )) {
              const evento = interpretarEvento(bruto);
              if (evento.tipo === 'ignorado') continue;
              yield evento;
              if (evento.tipo !== 'fragmento') {
                terminado = true;
                break;
              }
            }
          }
        } finally {
          await cuerpo.cancel().catch(() => undefined);
        }
        // El servidor cerró sin `done` ni `error`: la respuesta quedó a medias.
        if (!terminado) throw new ErrorOrquestador('red');
      } finally {
        clearTimeout(temporizador);
      }
    },

    /** Resumen de llamadas de IA del orquestador. Solo responde a cuentas `admin` (403 al resto). */
    async metricasAdmin(cuenta: CredencialOrquestador): Promise<unknown> {
      const respuesta = await llamar(
        cuenta,
        'GET',
        '/admin/metrics/summary',
        undefined,
        AbortSignal.timeout(TIEMPO_GESTION_MS),
        false
      );
      return respuesta.json().catch(() => null);
    },

    /** Usuarios con rol `student`: de aquí salen los id de las cuentas del grupo. */
    async estudiantes(cuenta: CredencialOrquestador): Promise<UsuarioOrquestador[]> {
      return pedir(cuenta, 'GET', '/admin/students', {
        esquema: usuarioOrquestadorSchema.array(),
      });
    },
  };
}

export type ClienteOrquestador = ReturnType<typeof crearClienteOrquestador>;

let compartido: ClienteOrquestador | undefined;

/** Cliente del proceso: comparte la caché de tokens entre todas las peticiones de la instancia. */
export function clienteOrquestador(): ClienteOrquestador {
  compartido ??= crearClienteOrquestador({ url: getOrquestadorEnv().url });
  return compartido;
}
