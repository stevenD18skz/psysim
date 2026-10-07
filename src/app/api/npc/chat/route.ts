import { obtenerSesionDocente } from '@/lib/auth/dal';
import { ErrorIA, generarRespuestaPaciente, type TipoErrorIA } from '@/lib/ia/paciente';
import { log } from '@/lib/log';
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
  proveedor: { status: 502, mensaje: 'El servicio de IA no está disponible.' },
};

/**
 * HU-12 — Route Handler del paciente virtual.
 *
 * 1. Verifica la sesión del docente (401/403).
 * 2. Valida el cuerpo con Zod (400 con el detalle por campo).
 * 3. Carga la sesión de simulación con RLS: debe ser del docente (404), seguir en curso (409)
 *    y corresponder al NPC indicado (404). El prompt del sistema es el de la sesión (el del NPC,
 *    o el personalizado por el docente al configurarla).
 * 4. Llama a la IA con el prompt, el historial y el mensaje (504/502/503 si falla).
 * 5. Guarda el intercambio en `mensaje` y devuelve la respuesta con su emoción (para el
 *    lenguaje no verbal del paciente 3D) y el consumo de tokens.
 */
export async function POST(request: Request): Promise<Response> {
  const docente = await obtenerSesionDocente();
  if (docente.estado === 'sin-sesion') {
    return responderError(401, 'Tu sesión expiró. Vuelve a iniciar sesión.');
  }
  if (docente.estado === 'sin-permiso') {
    return responderError(403, 'No tienes permiso para usar el simulador.');
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
  const { sesion_id, npc_id, mensaje_usuario, historial } = datos.data;

  const supabase = await createClient();
  const { data: sesion, error: errorSesion } = await supabase
    .from('sesion')
    .select('estado, comenzada, prompt_sistema, escenario ( npc ( id, nombre ) )')
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
  const npc = sesion.escenario?.npc;
  if (!npc || npc.id !== npc_id) {
    return responderError(404, 'El paciente virtual no pertenece a esta sesión.');
  }

  const inicio = performance.now();
  let respuesta: Awaited<ReturnType<typeof generarRespuestaPaciente>>;
  try {
    respuesta = await generarRespuestaPaciente({
      promptSistema: sesion.prompt_sistema,
      historial,
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
  const { error: errorGuardado } = await supabase.from('mensaje').insert([
    { sesion_id, remitente: 'estudiante', contenido: mensaje_usuario },
    {
      sesion_id,
      remitente: 'npc',
      contenido: respuesta.texto,
      latencia_ms: latenciaMs,
      tokens_entrada: respuesta.tokensEntrada,
      tokens_salida: respuesta.tokensSalida,
    },
  ]);
  if (errorGuardado) {
    log.error('npc_chat.mensajes_no_guardados', { codigo: errorGuardado.code, sesion_id });
  }

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
    timestamp_respuesta: timestampRespuesta,
    tokens_entrada: respuesta.tokensEntrada,
    tokens_salida: respuesta.tokensSalida,
  };
  return Response.json(cuerpoRespuesta, { status: 200, headers: SIN_CACHE });
}
