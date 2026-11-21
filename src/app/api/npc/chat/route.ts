import { obtenerSesionUsuario } from '@/lib/auth/dal';
import { ESPERA_CONTADOR_IA_S, esperaDeCuota, MENSAJE_CONTADOR_IA } from '@/lib/ia/cuota';
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
import { leerSesionIa, soltarTurno, type SesionIa, tomarTurno } from '@/lib/orquestador/datos';
import { barrerDespues, cerrarDespues } from '@/lib/orquestador/diferido';
import { crearPlazo } from '@/lib/orquestador/turno';
import { leerEscenarioDeSesion, leerPromptDeSesion } from '@/lib/sesiones/datos-privados';
import { leerTiempoDeConsulta, resolverVencimiento } from '@/lib/sesiones/consulta';
import { debeNotarElTiempo, faseDeConsulta, TEXTO_TIEMPO } from '@/lib/sesiones/tiempo-consulta';
import { NOTA_TIEMPO_CUMPLIDO } from '@/lib/ia/reglas';
import { FIN_POR_TIEMPO } from '@/lib/conversacion/cierre';
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

/** Lo que se sugiere esperar cuando otra petición todavía responde un turno de la práctica. */
const ESPERA_TURNO_OCUPADO_S = 5;

/** Cada cuánto se envía un comentario para que ningún intermediario corte un flujo en silencio. */
const LATIDO_MS = 15_000;

function responderError(
  status: number,
  error: string,
  extra: { campos?: NpcChatError['campos']; esperaS?: number; fin?: NpcChatError['fin'] } = {}
) {
  const cuerpo: NpcChatError = {
    error,
    ...(extra.campos && { campos: extra.campos }),
    ...(extra.fin && { fin: extra.fin }),
  };
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
 * 4. Si es un reintento de un intercambio que ya se guardó, devuelve lo guardado (también cuando
 *    ese intercambio cerró la práctica). Si no, comprueba el tope de intervenciones y reserva un
 *    turno del límite de mensajes por minuto del estudiante (429 si se agotó, RNF-03.7).
 * 5. Toma el turno de la práctica (`turno_ia`): si otra petición todavía lo está respondiendo,
 *    409; si el anterior terminó sin guardarse, el proveedor concilia su historial antes de enviar.
 * 6. Pide la respuesta al proveedor de la práctica: el orquestador de NPC o Gemini, que además es
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
  const { sesion_id, npc_id, mensaje_usuario, reintento, por_partes, turno_id } = datos.data;

  const supabase = await createClient();
  const { data: sesion, error: errorSesion } = await supabase
    .from('sesion')
    .select('estado, comenzada, escenario_id, fin_motivo')
    .eq('id', sesion_id)
    .maybeSingle();

  if (errorSesion) {
    log.error('npc_chat.sesion_no_leida', { peticion, codigo: errorSesion.code });
    return responderError(500, 'No pudimos cargar la sesión.');
  }
  if (!sesion) {
    return responderError(404, 'La práctica no existe.');
  }
  // La práctica ya terminó. Si fue al cumplirse el tiempo, el navegador muestra el aviso neutro.
  const terminada = sesion.estado !== 'en_curso';
  const responderTerminada = () =>
    responderError(
      409,
      sesion.fin_motivo === FIN_POR_TIEMPO ? TEXTO_TIEMPO.vencida : MENSAJE_PRACTICA_TERMINADA,
      { fin: sesion.fin_motivo === FIN_POR_TIEMPO ? FIN_POR_TIEMPO : 'cerrada' }
    );
  // Un reintento sigue adelante aunque haya terminado: si lo que se perdió fue la respuesta del
  // intercambio que la cerró (el servidor la termina al guardarlo), se devuelve lo guardado.
  if (terminada && !reintento && !turno_id) {
    return responderTerminada();
  }
  // HU-23: no se conversa hasta que el estudiante confirma las instrucciones del caso.
  if (!sesion.comenzada) {
    return responderError(409, 'La práctica aún no ha comenzado.');
  }

  let npc: { id: string; nombre: string } | undefined;
  let promptSistema: string | null;
  try {
    // RLS ya verificó que la práctica es del estudiante: el caso y el prompt son privados.
    const [escenario, prompt] = await Promise.all([
      leerEscenarioDeSesion(sesion.escenario_id),
      leerPromptDeSesion(sesion_id),
    ]);
    npc = escenario?.npc;
    promptSistema = prompt;
  } catch {
    log.error('npc_chat.caso_no_leido', { peticion, sesion_id });
    return responderError(500, 'No pudimos cargar la sesión.');
  }
  if (!npc || npc.id !== npc_id || !promptSistema) {
    return responderError(404, 'El paciente no pertenece a esta práctica.');
  }

  // Un turno a la vez por práctica. Dos pestañas enviando a la vez dejaban los intercambios en un
  // orden en PsySim y en otro en el orquestador; y si el turno anterior no llegó a guardarse, el
  // orquestador puede tener un intercambio que la transcripción no tiene.
  const turnoTomado = await tomarTurno(sesion_id, turno_id ?? null);
  if (turnoTomado.resultado === 'no_disponible') {
    return responderError(503, 'No pudimos preparar tu turno. Inténtalo de nuevo.');
  }
  if (turnoTomado.resultado === 'ocupado') {
    log.info('npc_chat.turno_ocupado', { peticion, sesion_id });
    return responderError(
      409,
      'El paciente todavía está respondiendo tu mensaje anterior. Espera unos segundos.',
      { esperaS: ESPERA_TURNO_OCUPADO_S }
    );
  }
  if (turnoTomado.resultado === 'pendiente') {
    log.info('npc_chat.turno_pendiente', { peticion, sesion_id });
  }

  const marca = 'marca' in turnoTomado ? turnoTomado.marca : null;
  let respondera = false;
  try {
    let sesionIa: SesionIa | null;
    try {
      sesionIa = await leerSesionIa(sesion_id);
    } catch {
      log.error('npc_chat.ia_no_leida', { peticion, sesion_id });
      return responderError(503, 'No pudimos preparar tu turno. Inténtalo de nuevo.');
    }
    // LLM01: el contexto sale de lo que el servidor guardó, no del historial que mande el navegador
    // (podría traer turnos del paciente fabricados). LLM10: tope de intervenciones por práctica.
    const { data: filas, error: errorHistorial } = await supabase
      .from('mensaje')
      .select(
        'id, remitente, contenido, descartado_en, emocion, creado_en, tokens_entrada, tokens_salida, latencia_ms'
      )
      .eq('sesion_id', sesion_id)
      .order('creado_en')
      .order('remitente');
    if (errorHistorial) {
      log.error('npc_chat.historial_no_leido', {
        peticion,
        codigo: errorHistorial.code,
        sesion_id,
      });
      return responderError(500, 'No pudimos cargar la sesión.');
    }
    const mensajesGuardados = filas;
    const tiempo = await leerTiempoDeConsulta(supabase, sesion_id);
    const tiempoLeidoEn = performance.now();

    const recuperacion = turnoTomado.resultado === 'guardado' ? turnoTomado : null;
    const estudianteGuardado =
      recuperacion && mensajesGuardados.find(fila => fila.id === recuperacion.ids.estudiante);
    const npcGuardado =
      recuperacion && mensajesGuardados.find(fila => fila.id === recuperacion.ids.npc);
    const repetido = recuperacion
      ? estudianteGuardado && npcGuardado && { estudiante: estudianteGuardado, npc: npcGuardado }
      : turnoTomado.resultado === 'guardado_anterior' || (!turno_id && reintento)
        ? respuestaYaGuardada(mensajesGuardados, mensaje_usuario)
        : null;
    if ((recuperacion || turnoTomado.resultado === 'guardado_anterior') && !repetido) {
      return responderError(503, 'No pudimos recuperar tu turno guardado. Inténtalo de nuevo.');
    }
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
        cierre: recuperacion ? recuperacion.cierre : (sesionIa?.cierreMotivo ?? null),
        historial_recuperado: mensajesGuardados
          .filter(fila => fila.descartado_en === null)
          .map(fila => ({
            id: fila.id,
            remitente: fila.remitente,
            contenido: fila.contenido,
            timestamp: new Date(fila.creado_en).toISOString(),
            ...(typeof fila.latencia_ms === 'number' && { latencia_ms: fila.latencia_ms }),
            ...(fila.emocion && esEmocionNpc(fila.emocion) && { emocion: fila.emocion }),
          })),
        consulta: tiempo && {
          duracion_s: tiempo.duracionS,
          transcurrido_s: tiempo.transcurridoS ?? 0,
        },
      };
      return Response.json(cuerpoRepetido, { status: 200, headers: SIN_CACHE });
    }
    if (terminada || !marca) {
      return responderTerminada();
    }
    // El paciente dio por terminada la consulta (crisis o trato inapropiado): no hay más turnos.
    if (sesionIa?.cierreMotivo) {
      return responderError(409, MENSAJE_PRACTICA_TERMINADA, { fin: sesionIa.cierreMotivo });
    }
    // Pasado el tiempo de la consulta y su margen de cierre no se conversa más. La práctica termina
    // aquí, con el motivo neutro (no es una falta del estudiante): si dependiera del navegador y el
    // estudiante cerrara la pestaña, quedaría interrumpida y sin ese motivo.
    if (tiempo && faseDeConsulta(tiempo) === 'vencida') {
      log.info('npc_chat.tiempo_cumplido', { peticion, sesion_id });
      const cierre = await resolverVencimiento(supabase, sesion_id);
      if (!cierre || !('fin' in cierre)) {
        return responderError(503, 'No pudimos comprobar el cierre. Inténtalo de nuevo.');
      }
      cerrarDespues(sesion_id);
      return responderError(
        409,
        cierre.fin === FIN_POR_TIEMPO ? TEXTO_TIEMPO.vencida : MENSAJE_PRACTICA_TERMINADA,
        { fin: cierre.fin }
      );
    }
    if (contarIntervenciones(mensajesGuardados) >= MAX_INTERVENCIONES_POR_SESION) {
      log.info('npc_chat.tope_de_sesion', { peticion, sesion_id });
      return responderError(429, mensajeTope());
    }

    // RNF-03.7: cada intervención es una llamada a la IA; la base de datos cuenta las del último
    // minuto de este estudiante. El cupo por cuenta del orquestador se reserva aparte.
    const { data: reserva, error: errorLimite } = await supabase.rpc('reservar_peticion_ia');
    const esperaS = esperaDeCuota(reserva);
    if (errorLimite || esperaS === null) {
      log.error('npc_chat.limite_no_verificado', {
        peticion,
        codigo: errorLimite?.code,
        sesion_id,
      });
      return responderError(503, MENSAJE_CONTADOR_IA, { esperaS: ESPERA_CONTADOR_IA_S });
    }
    if (esperaS > 0) {
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
    // Opción B: el primer turno con el tiempo ya cumplido, el paciente puede notarlo (solo Gemini).
    const ultimaRespuesta = vigentes.findLast(fila => fila.remitente === 'npc');
    const desdeLaUltimaRespuestaS = ultimaRespuesta
      ? Math.max(0, (Date.now() - Date.parse(ultimaRespuesta.creado_en)) / 1000)
      : null;
    const notaDeEscena =
      tiempo && debeNotarElTiempo(tiempo, desdeLaUltimaRespuestaS) ? NOTA_TIEMPO_CUMPLIDO : null;

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
      // Con el turno anterior sin guardar, el orquestador revisa su historial igual que en un
      // reintento: si lo tiene con este mismo texto lo aprovecha; si tiene otro, pasa a Gemini.
      reintento: reintento === true || turnoTomado.resultado === 'pendiente',
      marcaDeTurno: marca,
      intercambios,
      hayDescartados: vigentes.length !== mensajesGuardados.length,
      emocionAnterior,
      sesionIa,
      plazo,
      notaDeEscena,
      consulta: tiempo && { tiempo, leidoEn: tiempoLeidoEn },
    });

    respondera = true;
    if (por_partes) return responderPorPartes(eventos);

    for await (const evento of eventos) {
      if (evento.tipo === 'fin') {
        return Response.json(evento.respuesta, { status: 200, headers: SIN_CACHE });
      }
      if (evento.tipo === 'error') {
        return responderError(evento.status, evento.error, {
          esperaS: evento.espera_s,
          fin: evento.fin,
        });
      }
    }
    return responderError(502, 'El servicio de IA no está disponible.');
  } finally {
    if (marca && !respondera)
      await soltarTurno(
        sesion_id,
        marca,
        turnoTomado.resultado === 'libre' ? 'sin_enviar' : undefined
      );
  }
}
