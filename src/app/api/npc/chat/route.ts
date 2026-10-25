import { obtenerSesionUsuario } from '@/lib/auth/dal';
import {
  contarIntervenciones,
  type FilaMensaje,
  historialDesdeFilas,
  MAX_INTERVENCIONES_POR_SESION,
} from '@/lib/ia/historial';
import { ErrorIA, generarRespuestaPaciente, type TipoErrorIA } from '@/lib/ia/paciente';
import { log } from '@/lib/log';
import { leerEscenarioDeSesion, leerPromptDeSesion } from '@/lib/sesiones/datos-privados';
import { createClient } from '@/lib/supabase/server';
import {
  type NpcChatError,
  npcChatRequestSchema,
  type NpcChatResponse,
} from '@/schemas/npc-chat.schema';

/**
 * Límite de ejecución de la función en Vercel. La llamada a la IA tiene su propio tiempo
 * máximo (25 s), menor que este, para responder siempre con un 504 controlado.
 */
export const maxDuration = 30;

const SIN_CACHE = { 'Cache-Control': 'no-store' } as const;

function responderError(status: number, error: string, campos?: NpcChatError['campos']) {
  const cuerpo: NpcChatError = campos ? { error, campos } : { error };
  return Response.json(cuerpo, { status, headers: SIN_CACHE });
}

/** HU-16 · T01 — Código HTTP y mensaje para cada tipo de fallo de la IA (sin detalles internos). */
const ERRORES_IA: Record<TipoErrorIA, { status: number; mensaje: string }> = {
  tiempo_agotado: { status: 504, mensaje: 'El paciente virtual tardó demasiado en responder.' },
  autenticacion: { status: 502, mensaje: 'El servicio de IA no está disponible.' },
  limite: { status: 503, mensaje: 'El servicio de IA está saturado. Inténtalo en unos segundos.' },
  respuesta_invalida: {
    status: 502,
    mensaje: 'El servicio de IA devolvió una respuesta inválida.',
  },
  // Al estudiante no le explicamos por qué: se le pide reintentar como ante cualquier respuesta rara.
  fuga_de_instrucciones: {
    status: 502,
    mensaje: 'El servicio de IA devolvió una respuesta inválida.',
  },
  proveedor: { status: 502, mensaje: 'El servicio de IA no está disponible.' },
};

/**
 * HU-12 — Route Handler del paciente virtual.
 *
 * 1. Verifica la sesión del estudiante (401/403): solo él conversa con el paciente.
 * 2. Valida el cuerpo con Zod (400 con el detalle por campo).
 * 3. Carga la sesión de simulación con RLS: debe ser del estudiante (404), seguir en curso (409)
 *    y corresponder al NPC indicado (404). El prompt del sistema es el que configuró el docente
 *    al generar el código; se lee con la clave secreta porque el estudiante no puede verlo.
 * 4. Reserva un turno del límite de mensajes por minuto (429 si se agotó, RNF-03.7) y llama a la
 *    IA con el prompt, el historial y el mensaje (504/502/503 si falla).
 * 5. Guarda el intercambio en `mensaje` y devuelve la respuesta con su emoción (para el
 *    lenguaje no verbal del paciente 3D) y el consumo de tokens.
 */
export async function POST(request: Request): Promise<Response> {
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
    return responderError(400, 'Los datos de la petición no son válidos.', campos);
  }
  const { sesion_id, npc_id, mensaje_usuario } = datos.data;

  const supabase = await createClient();
  const { data: sesion, error: errorSesion } = await supabase
    .from('sesion')
    .select('estado, comenzada, escenario_id')
    .eq('id', sesion_id)
    .maybeSingle();

  if (errorSesion) {
    log.error('npc_chat.sesion_no_leida', { codigo: errorSesion.code });
    return responderError(500, 'No fue posible cargar la sesión.');
  }
  if (!sesion) {
    return responderError(404, 'La sesión de simulación no existe.');
  }
  if (sesion.estado !== 'en_curso') {
    return responderError(409, 'La sesión de simulación ya finalizó.');
  }
  // HU-23: no se conversa hasta que el estudiante confirma las instrucciones del caso.
  if (!sesion.comenzada) {
    return responderError(409, 'La simulación aún no ha comenzado.');
  }

  let npc: { id: string; nombre: string } | undefined;
  let promptSistema: string | null;
  try {
    // RLS ya verificó que la sesión es del estudiante: el caso y el prompt se leen con la clave secreta.
    const [escenario, prompt] = await Promise.all([
      leerEscenarioDeSesion(sesion.escenario_id),
      leerPromptDeSesion(sesion_id),
    ]);
    npc = escenario?.npc;
    promptSistema = prompt;
  } catch {
    log.error('npc_chat.caso_no_leido', { sesion_id });
    return responderError(500, 'No fue posible cargar la sesión.');
  }
  if (!npc || npc.id !== npc_id || !promptSistema) {
    return responderError(404, 'El paciente virtual no pertenece a esta sesión.');
  }

  // LLM01: el contexto sale de lo que el servidor guardó, no del historial que mande el navegador
  // (podría traer turnos del paciente fabricados). LLM10: tope de intervenciones por práctica.
  const { data: filas, error: errorHistorial } = await supabase
    .from('mensaje')
    .select('remitente, contenido, descartado_en')
    .eq('sesion_id', sesion_id)
    .order('creado_en')
    .order('remitente');
  if (errorHistorial) {
    log.error('npc_chat.historial_no_leido', { codigo: errorHistorial.code, sesion_id });
    return responderError(500, 'No fue posible cargar la sesión.');
  }
  const mensajesGuardados: FilaMensaje[] = filas;
  if (contarIntervenciones(mensajesGuardados) >= MAX_INTERVENCIONES_POR_SESION) {
    log.info('npc_chat.tope_de_sesion', { sesion_id });
    return responderError(
      429,
      `Llegaste al máximo de ${MAX_INTERVENCIONES_POR_SESION} intervenciones en esta práctica. Termínala para que tu docente la revise.`
    );
  }

  // RNF-03.7: cada intervención es una llamada a la IA; la base de datos cuenta las del último
  // minuto de este estudiante. Si el conteo falla, la práctica sigue (queda en el log).
  const { data: esperaS, error: errorLimite } = await supabase.rpc('reservar_peticion_ia');
  if (errorLimite) {
    log.error('npc_chat.limite_no_verificado', { codigo: errorLimite.code, sesion_id });
  } else if (esperaS > 0) {
    log.info('npc_chat.limite_alcanzado', { sesion_id, espera_s: esperaS });
    const cuerpoLimite: NpcChatError = {
      error: `Estás enviando mensajes muy seguido. Espera ${esperaS} s antes de volver a escribir.`,
    };
    return Response.json(cuerpoLimite, {
      status: 429,
      headers: { ...SIN_CACHE, 'Retry-After': String(esperaS) },
    });
  }

  const inicio = performance.now();
  let respuesta: Awaited<ReturnType<typeof generarRespuestaPaciente>>;
  try {
    respuesta = await generarRespuestaPaciente({
      promptSistema,
      historial: historialDesdeFilas(mensajesGuardados),
      mensaje: mensaje_usuario,
      nombrePaciente: npc.nombre,
    });
  } catch (error) {
    const tipo = error instanceof ErrorIA ? error.tipo : 'proveedor';
    log.error('npc_chat.ia_fallo', { tipo, sesion_id });
    const { status, mensaje } = ERRORES_IA[tipo];
    return responderError(status, mensaje);
  }
  const latenciaMs = Math.round(performance.now() - inicio);
  const timestampRespuesta = new Date().toISOString();

  // Ambos mensajes en una sola inserción (atómica). Si falla, la conversación continúa: el
  // estudiante ya tiene la respuesta y el error queda registrado para revisarlo.
  const { data: guardados, error: errorGuardado } = await supabase
    .from('mensaje')
    .insert([
      { sesion_id, remitente: 'estudiante', contenido: mensaje_usuario },
      {
        sesion_id,
        remitente: 'npc',
        contenido: respuesta.texto,
        emocion: respuesta.emocion,
        latencia_ms: latenciaMs,
        tokens_entrada: respuesta.tokensEntrada,
        tokens_salida: respuesta.tokensSalida,
      },
    ])
    .select('id, remitente');
  if (errorGuardado) {
    log.error('npc_chat.mensajes_no_guardados', { codigo: errorGuardado.code, sesion_id });
  }
  const idGuardado = (remitente: 'estudiante' | 'npc') =>
    guardados?.find(fila => fila.remitente === remitente)?.id ?? null;

  // HU-12 · T05: el consumo se registra para monitoreo (sin el contenido de la conversación).
  log.info('npc_chat.respuesta', {
    sesion_id,
    modelo: respuesta.modelo,
    latencia_ms: latenciaMs,
    tokens_entrada: respuesta.tokensEntrada,
    tokens_salida: respuesta.tokensSalida,
  });

  const cuerpoRespuesta: NpcChatResponse = {
    respuesta_npc: respuesta.texto,
    emocion_npc: respuesta.emocion,
    intensidad_npc: respuesta.intensidad,
    timestamp_respuesta: timestampRespuesta,
    tokens_entrada: respuesta.tokensEntrada,
    tokens_salida: respuesta.tokensSalida,
    id_mensaje_estudiante: idGuardado('estudiante'),
    id_mensaje_npc: idGuardado('npc'),
  };
  return Response.json(cuerpoRespuesta, { status: 200, headers: SIN_CACHE });
}
