import { obtenerSesionUsuario } from '@/lib/auth/dal';
import { log } from '@/lib/log';
import { createClient } from '@/lib/supabase/server';
import {
  type MetricsSaveError,
  metricsSaveRequestSchema,
  type MetricsSaveResponse,
} from '@/schemas/metrics.schema';

const SIN_CACHE = { 'Cache-Control': 'no-store' } as const;

function responderError(status: number, error: string, campos?: MetricsSaveError['campos']) {
  const cuerpo: MetricsSaveError = campos ? { error, campos } : { error };
  return Response.json(cuerpo, { status, headers: SIN_CACHE });
}

/**
 * HU-19 — Route Handler de persistencia de métricas.
 *
 * 1. Verifica la sesión del estudiante (401/403): solo quien practicó termina su práctica.
 * 2. Valida el cuerpo con Zod (400 con el detalle por campo).
 * 3. Comprueba con RLS que la sesión es suya (404) y sigue en curso (409): las métricas no se
 *    guardan dos veces ni sobre una práctica cerrada por inactividad.
 * 4. Llama a `guardar_metricas_cierre`, que inserta en `metrica` y marca la sesión como
 *    finalizada en una sola transacción (HU-19 · T02). Si falla, responde 500 sin detalles
 *    internos y la sesión sigue en curso, así que el estudiante puede reintentar.
 */
export async function POST(request: Request): Promise<Response> {
  const usuario = await obtenerSesionUsuario();
  if (usuario.estado === 'sin-sesion') {
    return responderError(401, 'Tu sesión expiró. Vuelve a iniciar sesión.');
  }
  if (usuario.estado === 'sin-permiso' || usuario.perfil.rol !== 'estudiante') {
    return responderError(403, 'Solo el estudiante de la sesión puede terminar su práctica.');
  }

  let cuerpo: unknown;
  try {
    cuerpo = await request.json();
  } catch {
    return responderError(400, 'El cuerpo de la petición debe ser JSON válido.');
  }

  const datos = metricsSaveRequestSchema.safeParse(cuerpo);
  if (!datos.success) {
    const campos = datos.error.flatten().fieldErrors as Record<string, string[]>;
    return responderError(400, 'Los datos de la petición no son válidos.', campos);
  }
  const { sesion_id, total_mensajes, latencia_promedio_ms, latencia_maxima_ms, indicadores } =
    datos.data;

  const supabase = await createClient();
  const { data: sesion, error: errorSesion } = await supabase
    .from('sesion')
    .select('estado')
    .eq('id', sesion_id)
    .maybeSingle();

  if (errorSesion) {
    log.error('metrics_save.sesion_no_leida', { codigo: errorSesion.code, sesion_id });
    return responderError(500, 'No fue posible guardar los resultados de la práctica.');
  }
  if (!sesion) {
    return responderError(404, 'La sesión de simulación no existe.');
  }
  if (sesion.estado !== 'en_curso') {
    return responderError(409, 'La práctica ya terminó.');
  }

  // Los nulos se omiten: la función de la base de datos los toma por defecto.
  const { data: metricaId, error } = await supabase.rpc('guardar_metricas_cierre', {
    p_sesion_id: sesion_id,
    p_total_mensajes: total_mensajes,
    p_latencia_promedio_ms: latencia_promedio_ms ?? undefined,
    p_latencia_maxima_ms: latencia_maxima_ms ?? undefined,
    p_indicadores: indicadores ?? undefined,
  });

  if (error) {
    // 55000: otra pestaña la cerró entre la lectura y el guardado.
    if (error.code === '55000') return responderError(409, 'La práctica ya terminó.');
    log.error('metrics_save.no_guardadas', { codigo: error.code, sesion_id });
    return responderError(500, 'No fue posible guardar los resultados de la práctica.');
  }

  log.info('metrics_save.guardadas', { sesion_id, total_mensajes });
  const respuesta: MetricsSaveResponse = { sesion_id, metrica_id: metricaId };
  return Response.json(respuesta, { status: 200, headers: SIN_CACHE });
}
