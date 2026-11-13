import { obtenerSesionUsuario } from '@/lib/auth/dal';
import { type EmocionNpc, esEmocionNpc } from '@/lib/conversacion/emociones';
import {
  contarIntervenciones,
  historialDesdeFilas,
  MAX_INTERVENCIONES_POR_SESION,
  respuestaYaGuardada,
} from '@/lib/ia/historial';
import {
  MENSAJE_PRACTICA_TERMINADA,
  mensajeTope,
  responderIntercambio,
} from '@/lib/ia/intercambio';
import { log } from '@/lib/log';
import { idPeticion } from '@/lib/observabilidad/peticion';
import { leerSesionIa, type SesionIa } from '@/lib/orquestador/datos';
import { barrerDespues } from '@/lib/orquestador/diferido';
import { crearPlazo } from '@/lib/orquestador/turno';
import { leerEscenarioDeSesion, leerPromptDeSesion } from '@/lib/sesiones/datos-privados';
import { codificarEventoSse } from '@/lib/sse';
import { createClient } from '@/lib/supabase/server';
import {
  type EventoChat,
  type NpcChatError,
  npcChatRequestSchema,
  type NpcChatResponse,
} from '@/schemas/npc-chat.schema';

/**
 * Límite de ejecución de la función en Vercel. La petición tiene su propio plazo (55 s, ver
 * `lib/orquestador/turno.ts`), menor que este, para responder siempre con un error controlado:
 * el primer turno del orquestador puede tardar 20 s y, si falla, todavía debe responder Gemini.
 */
export const maxDuration = 60;

const SIN_CACHE = { 'Cache-Control': 'no-store' } as const;

/** Cada cuánto se envía un comentario para que ningún intermediario corte un flujo en silencio. */
const LATIDO_MS = 15_000;

function responderError(
  status: number,
  error: string,
  extra: { campos?: NpcChatError['campos']; esperaS?: number } = {}
) {
  const cuerpo: NpcChatError = extra.campos ? { error, campos: extra.campos } : { error };
  return Response.json(cuerpo, {
    status,
    headers: extra.esperaS ? { ...SIN_CACHE, 'Retry-After': String(extra.esperaS) } : SIN_CACHE,
  });
}

/**
 * Respuesta por partes (Server-Sent Events): el nombre de cada evento es su `tipo` y `data` lleva
 * el resto en JSON. El turno no depende de quien lee: si el navegador se desconecta a mitad, la
 * respuesta se termina de recibir y se guarda igual (el proveedor ya la tiene en su historial).
 */
function responderPorPartes(eventos: AsyncGenerator<EventoChat, void, void>): Response {
  const codificador = new TextEncoder();
  const flujo = new ReadableStream<Uint8Array>({
    start(controlador) {
      let abierto = true;
      const enviar = (texto: string) => {
        if (!abierto) return;
        try {
          controlador.enqueue(codificador.encode(texto));
        } catch {
          abierto = false;
        }
      };
      const latido = setInterval(() => enviar(': latido\n\n'), LATIDO_MS);

      void (async () => {
        try {
          for await (const { tipo, ...datos } of eventos) {
            enviar(codificarEventoSse(tipo, datos));
          }
        } finally {
          clearInterval(latido);
          if (abierto) {
            try {
              controlador.close();
            } catch {
              // El navegador ya había cerrado la conexión.
            }
          }
        }
      })();
    },
  });
  return new Response(flujo, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-store, no-transform',
      // Sin esto, algunos proxies acumulan la respuesta y la entregan de una sola vez.
      'X-Accel-Buffering': 'no',
    },
  });
}

/**
 * HU-12 — Route Handler del paciente.
 *
 * 1. Verifica la sesión del estudiante (401/403): solo él conversa con el paciente.
 * 2. Valida el cuerpo con Zod (400 con el detalle por campo).
 * 3. Carga la práctica con RLS: debe ser del estudiante (404), seguir en curso y haber comenzado
 *    (409) y corresponder al paciente indicado (404). El prompt, el caso y el proveedor de IA de
 *    la práctica se leen con la clave secreta porque el estudiante no puede verlos.
 * 4. Si es un reintento de un intercambio que ya se guardó, devuelve lo guardado. Si no, comprueba
 *    el tope de intervenciones y reserva un turno del límite de mensajes por minuto del estudiante
 *    (429 si se agotó, RNF-03.7).
 * 5. Pide la respuesta al proveedor de la práctica: el orquestador de NPC o Gemini, que además es
 *    su respaldo (`lib/ia/turno.ts`). Limpia la respuesta, pasa el filtro de fuga y guarda el
 *    intercambio (solo el servidor escribe en `mensaje`).
 *
 * Responde un JSON con la respuesta completa o, con `por_partes`, un flujo de eventos para que el
 * texto aparezca mientras llega. Los errores anteriores al turno son siempre un JSON con su código.
 */
export async function POST(request: Request): Promise<Response> {
  const plazo = crearPlazo();
  const peticion = idPeticion(request);
  const usuario = await obtenerSesionUsuario();
  if (usuario.estado === 'sin-sesion') {
    return responderError(401, 'Tu sesión expiró. Vuelve a iniciar sesión.');
  }
  if (usuario.estado === 'sin-permiso' || usuario.perfil.rol !== 'estudiante') {
    return responderError(403, 'Solo el estudiante de la sesión puede conversar con el paciente.');
  }

  let cuerpo: unknown;
  try {
    cuerpo = await request.json();
  } catch {
    return responderError(400, 'El cuerpo de la petición debe ser JSON válido.');
  }

  const datos = npcChatRequestSchema.safeParse(cuerpo);
  if (!datos.success) {
    const campos = datos.error.flatten().fieldErrors as Record<string, string[]>;
    return responderError(400, 'Los datos de la petición no son válidos.', { campos });
  }
  const { sesion_id, npc_id, mensaje_usuario, reintento, por_partes } = datos.data;

  const supabase = await createClient();
  const { data: sesion, error: errorSesion } = await supabase
    .from('sesion')
    .select('estado, comenzada, escenario_id')
    .eq('id', sesion_id)
    .maybeSingle();

  if (errorSesion) {
    log.error('npc_chat.sesion_no_leida', { peticion, codigo: errorSesion.code });
    return responderError(500, 'No pudimos cargar la sesión.');
  }
  if (!sesion) {
    return responderError(404, 'La práctica no existe.');
  }
  if (sesion.estado !== 'en_curso') {
    return responderError(409, MENSAJE_PRACTICA_TERMINADA);
  }
  // HU-23: no se conversa hasta que el estudiante confirma las instrucciones del caso.
  if (!sesion.comenzada) {
    return responderError(409, 'La práctica aún no ha comenzado.');
  }

  let npc: { id: string; nombre: string } | undefined;
  let promptSistema: string | null;
  let sesionIa: SesionIa | null;
  try {
    // RLS ya verificó que la práctica es del estudiante: el caso, el prompt y el proveedor de IA
    // se leen con la clave secreta.
    const [escenario, prompt, proveedor] = await Promise.all([
      leerEscenarioDeSesion(sesion.escenario_id),
      leerPromptDeSesion(sesion_id),
      leerSesionIa(sesion_id),
    ]);
    npc = escenario?.npc;
    promptSistema = prompt;
    sesionIa = proveedor;
  } catch {
    log.error('npc_chat.caso_no_leido', { peticion, sesion_id });
    return responderError(500, 'No pudimos cargar la sesión.');
  }
  if (!npc || npc.id !== npc_id || !promptSistema) {
    return responderError(404, 'El paciente no pertenece a esta práctica.');
  }

  // LLM01: el contexto sale de lo que el servidor guardó, no del historial que mande el navegador
  // (podría traer turnos del paciente fabricados). LLM10: tope de intervenciones por práctica.
  const { data: filas, error: errorHistorial } = await supabase
    .from('mensaje')
    .select(
      'id, remitente, contenido, descartado_en, emocion, creado_en, tokens_entrada, tokens_salida'
    )
    .eq('sesion_id', sesion_id)
    .order('creado_en')
    .order('remitente');
  if (errorHistorial) {
    log.error('npc_chat.historial_no_leido', { peticion, codigo: errorHistorial.code, sesion_id });
    return responderError(500, 'No pudimos cargar la sesión.');
  }
  const mensajesGuardados = filas;

  // Reintento de un intercambio que sí se guardó (la respuesta se perdió en la red): se devuelve
  // lo guardado, sin otra llamada a la IA ni un intercambio duplicado en la transcripción.
  const repetido = reintento ? respuestaYaGuardada(mensajesGuardados, mensaje_usuario) : null;
  if (repetido) {
    log.info('npc_chat.reintento_ya_guardado', { peticion, sesion_id });
    const { estudiante, npc: respuestaGuardada } = repetido;
    const cuerpoRepetido: NpcChatResponse = {
      respuesta_npc: respuestaGuardada.contenido,
      emocion_npc:
        respuestaGuardada.emocion && esEmocionNpc(respuestaGuardada.emocion)
          ? respuestaGuardada.emocion
          : null,
      intensidad_npc: null,
      timestamp_respuesta: new Date(respuestaGuardada.creado_en).toISOString(),
      tokens_entrada: respuestaGuardada.tokens_entrada,
      tokens_salida: respuestaGuardada.tokens_salida,
      id_mensaje_estudiante: estudiante.id,
      id_mensaje_npc: respuestaGuardada.id,
      // Tras un cierre automático no se guardan más intercambios: el último es el del cierre.
      cierre: sesionIa?.cierreMotivo ?? null,
    };
    return Response.json(cuerpoRepetido, { status: 200, headers: SIN_CACHE });
  }
  // El paciente dio por terminada la consulta (crisis o trato inapropiado): no hay más turnos.
  if (sesionIa?.cierreMotivo) {
    return responderError(409, MENSAJE_PRACTICA_TERMINADA);
  }
  if (contarIntervenciones(mensajesGuardados) >= MAX_INTERVENCIONES_POR_SESION) {
    log.info('npc_chat.tope_de_sesion', { peticion, sesion_id });
    return responderError(429, mensajeTope());
  }

  // RNF-03.7: cada intervención es una llamada a la IA; la base de datos cuenta las del último
  // minuto de este estudiante. Si el conteo falla, la práctica sigue (queda en el log). El cupo
  // por cuenta del orquestador es otro límite y se reserva aparte, al pedir el turno.
  const { data: esperaS, error: errorLimite } = await supabase.rpc('reservar_peticion_ia');
  if (errorLimite) {
    log.error('npc_chat.limite_no_verificado', { peticion, codigo: errorLimite.code, sesion_id });
  } else if (esperaS > 0) {
    log.info('npc_chat.limite_alcanzado', { peticion, sesion_id, espera_s: esperaS });
    return responderError(
      429,
      `Estás enviando mensajes muy seguido. Espera ${esperaS} s antes de volver a escribir.`,
      { esperaS }
    );
  }

  const vigentes = mensajesGuardados.filter(fila => fila.descartado_en === null);
  const intercambios = vigentes.filter(fila => fila.remitente === 'estudiante').length;
  const ultimaEmocion = vigentes.findLast(fila => fila.remitente === 'npc')?.emocion;
  const emocionAnterior: EmocionNpc | null =
    ultimaEmocion && esEmocionNpc(ultimaEmocion) ? ultimaEmocion : null;

  // Al empezar una práctica se aprovecha para cerrar en el orquestador las que quedaron abiertas.
  if (intercambios === 0) barrerDespues();

  const eventos = responderIntercambio({
    peticion,
    sesionId: sesion_id,
    escenarioId: sesion.escenario_id,
    promptSistema,
    nombrePaciente: npc.nombre,
    historial: historialDesdeFilas(mensajesGuardados),
    mensaje: mensaje_usuario,
    reintento: reintento === true,
    intercambios,
    hayDescartados: vigentes.length !== mensajesGuardados.length,
    emocionAnterior,
    sesionIa,
    plazo,
  });

  if (por_partes) return responderPorPartes(eventos);

  for await (const evento of eventos) {
    if (evento.tipo === 'fin') {
      return Response.json(evento.respuesta, { status: 200, headers: SIN_CACHE });
    }
    if (evento.tipo === 'error') {
      return responderError(evento.status, evento.error, { esperaS: evento.espera_s });
    }
  }
  return responderError(502, 'El servicio de IA no está disponible.');
}
