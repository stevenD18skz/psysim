import 'server-only';

import { CODIGO_PG, type ResultadoAccion } from '@/lib/acciones';
import { log } from '@/lib/log';
import { createAdminClient } from '@/lib/supabase/admin';

const MENSAJE_GENERICO = 'No fue posible crear la cuenta del estudiante. Inténtalo de nuevo.';

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
