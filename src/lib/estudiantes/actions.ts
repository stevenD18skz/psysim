'use server';

import { CODIGO_PG, type ResultadoAccion } from '@/lib/acciones';
import { requerirDocente } from '@/lib/auth/dal';
import { asegurarCuentaEstudiante } from '@/lib/estudiantes/cuentas';
import { log } from '@/lib/log';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import {
  actualizarEstudianteSchema,
  eliminarEstudianteSchema,
  registrarEstudianteSchema,
} from '@/schemas/estudiante.schema';

const MENSAJE_DATOS_INVALIDOS = 'Revisa los datos del estudiante.';
const MENSAJE_GENERICO = 'No fue posible guardar al estudiante. Inténtalo de nuevo.';
const MENSAJE_CORREO_REPETIDO = 'Ya registraste a otro estudiante con ese correo.';

/**
 * El docente registra a un estudiante con su código, nombre y correo institucional. Se le crea la
 * cuenta (si no la tenía) para que entre con Google y pueda recibir códigos de acceso.
 *
 * Si el docente ya lo tenía registrado sin correo (de antes de las cuentas, cuando practicaba en el
 * equipo del docente), se completa ese registro: así conserva su historial.
 */
export async function registrarEstudiante(
  valores: unknown
): Promise<ResultadoAccion<{ id: string }>> {
  await requerirDocente();

  const datos = registrarEstudianteSchema.safeParse(valores);
  if (!datos.success) {
    return { ok: false, error: MENSAJE_DATOS_INVALIDOS };
  }
  const { codigo, nombre, correo } = datos.data;

  const supabase = await createClient();
  const { data: previo, error: errorPrevio } = await supabase
    .from('estudiante')
    .select('id, correo')
    .eq('codigo', codigo)
    .maybeSingle();
  if (errorPrevio) {
    log.error('estudiante.registro_no_consultado', { codigo: errorPrevio.code });
    return { ok: false, error: MENSAJE_GENERICO };
  }
  if (previo?.correo) {
    return {
      ok: false,
      error:
        previo.correo === correo
          ? 'Ese estudiante ya está registrado.'
          : 'Ya registraste ese código con otro correo. Edita al estudiante si su correo cambió.',
    };
  }

  const cuenta = await asegurarCuentaEstudiante({ correo, nombre, codigo });
  if (!cuenta.ok) return cuenta;

  // El trigger `estudiante_vincular_cuenta` enlaza el registro con la cuenta por el correo.
  const { data, error } = previo
    ? await supabase
        .from('estudiante')
        .update({ nombre, correo })
        .eq('id', previo.id)
        .select('id')
        .single()
    : await supabase.from('estudiante').insert({ codigo, nombre, correo }).select('id').single();

  if (error) {
    if (error.code === CODIGO_PG.UNIQUE_VIOLATION) {
      return { ok: false, error: MENSAJE_CORREO_REPETIDO };
    }
    log.error('estudiante.no_registrado', { codigo: error.code });
    return { ok: false, error: MENSAJE_GENERICO };
  }

  return { ok: true, datos: { id: data.id } };
}

/**
 * Corrige el nombre o el correo de un estudiante. Si el correo cambia, el registro pasa a la
 * cuenta de ese correo (que se crea si hace falta).
 */
export async function actualizarEstudiante(
  valores: unknown
): Promise<ResultadoAccion<{ id: string }>> {
  await requerirDocente();

  const datos = actualizarEstudianteSchema.safeParse(valores);
  if (!datos.success) {
    return { ok: false, error: MENSAJE_DATOS_INVALIDOS };
  }
  const { id, nombre, correo } = datos.data;

  const supabase = await createClient();
  const { data: actual, error: errorActual } = await supabase
    .from('estudiante')
    .select('codigo')
    .eq('id', id)
    .maybeSingle();
  if (errorActual || !actual) {
    if (errorActual) log.error('estudiante.no_consultado', { codigo: errorActual.code });
    return { ok: false, error: 'Ese estudiante ya no está disponible.' };
  }

  const cuenta = await asegurarCuentaEstudiante({ correo, nombre, codigo: actual.codigo });
  if (!cuenta.ok) return cuenta;

  const { error } = await supabase.from('estudiante').update({ nombre, correo }).eq('id', id);
  if (error) {
    if (error.code === CODIGO_PG.UNIQUE_VIOLATION) {
      return { ok: false, error: MENSAJE_CORREO_REPETIDO };
    }
    log.error('estudiante.no_actualizado', { codigo: error.code });
    return { ok: false, error: MENSAJE_GENERICO };
  }

  return { ok: true, datos: { id } };
}

/**
 * Elimina a un estudiante del docente con todo su historial: sesiones, conversaciones,
 * retroalimentación y códigos de acceso (función `eliminar_estudiante`). Si ningún otro docente
 * lo tiene registrado, también se elimina su cuenta: ya no podría hacer nada en PsySim.
 */
export async function eliminarEstudiante(
  valores: unknown
): Promise<ResultadoAccion<{ id: string }>> {
  await requerirDocente();

  const datos = eliminarEstudianteSchema.safeParse(valores);
  if (!datos.success) {
    return { ok: false, error: MENSAJE_DATOS_INVALIDOS };
  }
  const { id } = datos.data;

  const supabase = await createClient();
  const { data, error } = await supabase.rpc('eliminar_estudiante', { p_estudiante_id: id });
  const fila = Array.isArray(data) ? data[0] : null;
  if (error || !fila?.eliminado) {
    if (error) log.error('estudiante.no_eliminado', { codigo: error.code });
    return { ok: false, error: 'Ese estudiante ya no está disponible. Recarga la página.' };
  }

  if (fila.usuario_id) await eliminarCuentaSinRegistros(fila.usuario_id);
  return { ok: true, datos: { id } };
}

/** Borra la cuenta de un estudiante que ya no está registrado con ningún docente. */
async function eliminarCuentaSinRegistros(usuarioId: string) {
  const admin = createAdminClient();
  const [{ count, error }, { data: cuenta }] = await Promise.all([
    admin
      .from('estudiante')
      .select('id', { count: 'exact', head: true })
      .eq('usuario_id', usuarioId),
    admin.from('usuario').select('rol').eq('id', usuarioId).maybeSingle(),
  ]);
  if (error || count !== 0 || cuenta?.rol !== 'estudiante') return;

  const { error: errorBorrado } = await admin.auth.admin.deleteUser(usuarioId);
  if (errorBorrado) log.error('estudiante.cuenta_no_eliminada', { codigo: errorBorrado.code });
}
