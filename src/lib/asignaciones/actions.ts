'use server';

import { redirect } from 'next/navigation';

import { CODIGO_PG, type ResultadoAccion } from '@/lib/acciones';
import { calcularVencimiento, generarCodigoAcceso } from '@/lib/asignaciones/codigo';
import { requerirDocente, requerirEstudiante } from '@/lib/auth/dal';
import { log } from '@/lib/log';
import { createClient } from '@/lib/supabase/server';
import { canjearCodigoSchema, idAsignacionSchema } from '@/schemas/asignacion.schema';
import { generarAsignacionSchema } from '@/schemas/configuracion.schema';

const MENSAJE_DATOS_INVALIDOS = 'Revisa los datos del formulario.';
const MAX_INTENTOS_CODIGO = 5;

/**
 * El docente asigna la simulación configurada (caso + comportamiento del paciente) a uno de sus
 * estudiantes y obtiene un código de acceso de un solo uso para enviárselo.
 *
 * RLS exige que el estudiante sea del docente y tenga cuenta, y que el caso esté activo. El prompt
 * se guarda como copia: editar el caso después no cambia lo que practicará el estudiante.
 */
export async function generarAsignacion(
  valores: unknown
): Promise<ResultadoAccion<{ id: string; codigo: string; expiraEn: string }>> {
  await requerirDocente();

  const datos = generarAsignacionSchema.safeParse(valores);
  if (!datos.success) {
    return { ok: false, error: MENSAJE_DATOS_INVALIDOS };
  }
  const { escenarioId, promptSistema, estudianteId, vigenciaDias } = datos.data;

  const supabase = await createClient();
  const { data: estudiante, error: errorEstudiante } = await supabase
    .from('estudiante')
    .select('usuario_id')
    .eq('id', estudianteId)
    .maybeSingle();
  if (errorEstudiante || !estudiante) {
    if (errorEstudiante)
      log.error('asignacion.estudiante_no_leido', { codigo: errorEstudiante.code });
    return { ok: false, error: 'El estudiante seleccionado ya no está disponible.' };
  }
  if (!estudiante.usuario_id) {
    return {
      ok: false,
      error: 'Ese estudiante aún no tiene cuenta. Agrega su correo institucional en Estudiantes.',
    };
  }

  const expiraEn = calcularVencimiento(vigenciaDias).toISOString();
  for (let intento = 0; intento < MAX_INTENTOS_CODIGO; intento++) {
    const { data, error } = await supabase
      .from('asignacion')
      .insert({
        estudiante_id: estudianteId,
        escenario_id: escenarioId,
        prompt_sistema: promptSistema,
        codigo: generarCodigoAcceso(),
        expira_en: expiraEn,
      })
      .select('id, codigo, expira_en')
      .single();

    if (!error) {
      return { ok: true, datos: { id: data.id, codigo: data.codigo, expiraEn: data.expira_en } };
    }
    // Un código repetido (muy improbable) se reintenta con otro.
    if (error.code !== CODIGO_PG.UNIQUE_VIOLATION) {
      log.error('asignacion.no_creada', { codigo: error.code });
      if (error.code === CODIGO_PG.FOREIGN_KEY_VIOLATION) {
        return { ok: false, error: 'El caso seleccionado ya no está disponible.' };
      }
      return { ok: false, error: 'No fue posible generar el código. Inténtalo de nuevo.' };
    }
  }
  return { ok: false, error: 'No fue posible generar el código. Inténtalo de nuevo.' };
}

/** El docente anula un código que aún no se ha usado (p. ej. lo envió a quien no era). */
export async function anularAsignacion(valores: unknown): Promise<ResultadoAccion<{ id: string }>> {
  await requerirDocente();

  const datos = idAsignacionSchema.safeParse(valores);
  if (!datos.success) {
    return { ok: false, error: MENSAJE_DATOS_INVALIDOS };
  }

  // La hora real de anulación la fija la base de datos (trigger `asignacion_marcar_anulada`).
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('asignacion')
    .update({ anulada_en: new Date().toISOString() })
    .eq('id', datos.data.id)
    .is('sesion_id', null)
    .is('anulada_en', null)
    .select('id')
    .maybeSingle();

  if (error) {
    log.error('asignacion.no_anulada', { codigo: error.code });
    return { ok: false, error: 'No fue posible anular el código. Inténtalo de nuevo.' };
  }
  if (!data) {
    return { ok: false, error: 'Ese código ya se usó o ya estaba anulado.' };
  }
  return { ok: true, datos: { id: data.id } };
}

const MENSAJE_CODIGO_INVALIDO =
  'Ese código no existe o no es para tu cuenta. Revísalo o pídele uno nuevo a tu docente.';

/** Mensajes para el estudiante según lo que responde `canjear_codigo`. */
const MENSAJES_CANJE: Partial<Record<string, string>> = {
  invalido: MENSAJE_CODIGO_INVALIDO,
  vencido: 'Ese código ya venció. Pídele a tu docente que genere uno nuevo.',
  anulado: 'Tu docente anuló ese código. Pídele uno nuevo si aún debes practicar.',
  usado: 'Ya usaste ese código: la simulación terminó. Puedes revisarla en Mis prácticas.',
};

/**
 * El estudiante canjea su código: la base de datos crea la sesión con la configuración del docente
 * (o devuelve la misma si ya la había empezado) y se entra a la simulación.
 */
export async function canjearCodigo(valores: unknown): Promise<{ error: string }> {
  await requerirEstudiante();

  const datos = canjearCodigoSchema.safeParse(valores);
  if (!datos.success) {
    return { error: datos.error.issues[0]?.message ?? 'Revisa el código.' };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc('canjear_codigo', { p_codigo: datos.data.codigo });
  const fila = Array.isArray(data) ? data[0] : null;

  if (error || !fila) {
    if (error) log.error('asignacion.canje_fallido', { codigo: error.code });
    return { error: 'No fue posible validar el código. Inténtalo de nuevo.' };
  }
  if (fila.resultado !== 'ok' || !fila.sesion_id) {
    return { error: MENSAJES_CANJE[fila.resultado] ?? MENSAJE_CODIGO_INVALIDO };
  }

  redirect(`/simulacion?sesion=${fila.sesion_id}`);
}
