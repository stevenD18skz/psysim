import 'server-only';

import { CODIGO_PG, type ResultadoAccion } from '@/lib/acciones';
import { log } from '@/lib/log';
import { createAdminClient } from '@/lib/supabase/admin';

const MENSAJE_GENERICO = 'No pudimos crear la cuenta del estudiante. Inténtalo de nuevo.';

interface DatosCuenta {
  correo: string;
  nombre: string;
  codigo: string;
}

/**
 * Garantiza que exista la cuenta del estudiante (perfil `usuario` con rol `estudiante`) para que
 * pueda entrar con Google. Requiere la clave secreta: el registro abierto está desactivado, así
 * que el docente "crea" la cuenta al registrarlo.
 *
 * - Si ya tiene cuenta (p. ej. lo registró otro docente), no hace nada.
 * - Si no, crea el usuario de Auth con el correo confirmado y sin contraseña: al iniciar sesión
 *   con Google, Supabase enlaza esa identidad a esta cuenta porque el correo coincide.
 * - Si el usuario de Auth ya existía sin perfil, solo le crea el perfil.
 *
 * Debe llamarse solo después de verificar que quien registra es un docente.
 */
export async function asegurarCuentaEstudiante({
  correo,
  nombre,
  codigo,
}: DatosCuenta): Promise<ResultadoAccion<{ usuarioId: string }>> {
  const admin = createAdminClient();

  const { data: existente, error: errorBusqueda } = await admin
    .from('usuario')
    .select('id, rol')
    .eq('correo', correo)
    .maybeSingle();
  if (errorBusqueda) {
    log.error('estudiante.cuenta_no_consultada', { codigo: errorBusqueda.code });
    return { ok: false, error: MENSAJE_GENERICO };
  }
  if (existente) {
    return existente.rol === 'estudiante'
      ? { ok: true, datos: { usuarioId: existente.id } }
      : { ok: false, error: 'Ese correo pertenece a la cuenta de un docente.' };
  }

  let usuarioId: string;
  let creada = false;
  const { data: creado, error: errorCreacion } = await admin.auth.admin.createUser({
    email: correo,
    email_confirm: true,
    user_metadata: { nombre },
  });
  if (!errorCreacion) {
    usuarioId = creado.user.id;
    creada = true;
  } else if (errorCreacion.code === 'email_exists') {
    const { data: id, error } = await admin.rpc('id_cuenta_por_correo', { p_correo: correo });
    if (error || !id) {
      log.error('estudiante.cuenta_existente_no_encontrada', { codigo: error?.code });
      return { ok: false, error: MENSAJE_GENERICO };
    }
    usuarioId = id;
  } else {
    log.error('estudiante.cuenta_no_creada', { codigo: errorCreacion.code });
    return { ok: false, error: MENSAJE_GENERICO };
  }

  const { error: errorPerfil } = await admin.from('usuario').insert({
    id: usuarioId,
    nombre,
    correo,
    codigo_institucional: codigo,
    rol: 'estudiante',
  });
  if (errorPerfil) {
    // Dos registros simultáneos del mismo correo: el otro ya creó el perfil de esta cuenta. Borrar
    // la cuenta aquí se llevaría también ese perfil (`on delete cascade`).
    if (errorPerfil.code === CODIGO_PG.UNIQUE_VIOLATION) {
      const { data: ganador } = await admin
        .from('usuario')
        .select('rol')
        .eq('id', usuarioId)
        .maybeSingle();
      if (ganador?.rol === 'estudiante') return { ok: true, datos: { usuarioId } };
    }
    // Sin perfil la cuenta no sirve: se deshace para poder intentarlo de nuevo.
    if (creada) await admin.auth.admin.deleteUser(usuarioId);
    if (errorPerfil.code === CODIGO_PG.UNIQUE_VIOLATION) {
      return { ok: false, error: 'Ese código institucional ya pertenece a otra cuenta.' };
    }
    log.error('estudiante.perfil_no_creado', { codigo: errorPerfil.code });
    return { ok: false, error: MENSAJE_GENERICO };
  }

  return { ok: true, datos: { usuarioId } };
}

/**
 * Antes de corregir el correo de un registro, borra la cuenta del correo anterior si solo la usaba
 * ese registro. Sin esto, la cuenta nueva no se puede crear: el código institucional es único en
 * `usuario` y lo sigue teniendo la cuenta del correo equivocado.
 *
 * Si otro registro (de otro docente) usa la cuenta anterior, no se toca y se avisa: ese docente
 * tiene que corregir el correo también. Debe llamarse solo después de verificar que el registro no
 * tiene prácticas.
 */
export async function liberarCuentaAnterior({
  correoAnterior,
  registroId,
}: {
  correoAnterior: string;
  registroId: string;
}): Promise<ResultadoAccion<null>> {
  const admin = createAdminClient();

  const { data: cuenta, error } = await admin
    .from('usuario')
    .select('id, rol')
    .eq('correo', correoAnterior)
    .maybeSingle();
  if (error) {
    log.error('estudiante.cuenta_anterior_no_consultada', { codigo: error.code });
    return { ok: false, error: MENSAJE_GENERICO };
  }
  if (!cuenta || cuenta.rol !== 'estudiante') return { ok: true, datos: null };

  const { count, error: errorConteo } = await admin
    .from('estudiante')
    .select('id', { count: 'exact', head: true })
    .eq('usuario_id', cuenta.id)
    .neq('id', registroId);
  if (errorConteo) {
    log.error('estudiante.registros_no_contados', { codigo: errorConteo.code });
    return { ok: false, error: MENSAJE_GENERICO };
  }
  if ((count ?? 0) > 0) {
    return {
      ok: false,
      error:
        'Otro docente también registró a este estudiante con el correo anterior. Para cambiarlo, ese docente debe corregirlo primero.',
    };
  }

  const { error: errorBorrado } = await admin.auth.admin.deleteUser(cuenta.id);
  if (errorBorrado) {
    log.error('estudiante.cuenta_anterior_no_eliminada', { codigo: errorBorrado.code });
    return { ok: false, error: MENSAJE_GENERICO };
  }
  return { ok: true, datos: null };
}
