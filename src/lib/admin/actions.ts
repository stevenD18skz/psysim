'use server';

import { CODIGO_PG, type ResultadoAccion } from '@/lib/acciones';
import { generarContrasenaTemporal } from '@/lib/admin/contrasena';
import { requerirSuperadmin } from '@/lib/auth/dal';
import { log } from '@/lib/log';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  actualizarDocenteSchema,
  cambiarEstadoDocenteSchema,
  crearDocenteSchema,
  idDocenteSchema,
} from '@/schemas/admin.schema';

/*
 * Gestión de las cuentas del equipo docente. Solo el Administrador: cada acción lo verifica y
 * después usa la clave secreta (crear, editar y bloquear cuentas de Auth no es posible con RLS).
 *
 * El Administrador no puede quitarse el rol, desactivarse ni eliminarse a sí mismo: así siempre
 * queda al menos un Administrador activo.
 */

const MENSAJE_DATOS_INVALIDOS = 'Revisa los datos del docente.';
const MENSAJE_GENERICO = 'No fue posible completar la operación. Inténtalo de nuevo.';
const MENSAJE_NO_DISPONIBLE = 'Esa cuenta ya no está disponible. Recarga la página.';
const MENSAJE_CORREO_EN_USO = 'Ya existe una cuenta con ese correo.';
const MENSAJE_CODIGO_EN_USO = 'Ese código institucional ya pertenece a otra cuenta.';
const MENSAJE_SOBRE_SI_MISMO = 'No puedes hacer esto con tu propia cuenta.';

/** Duración del bloqueo en Supabase Auth de una cuenta desactivada (~100 años). */
const BLOQUEO_INDEFINIDO = '876000h';

type ClienteAdmin = ReturnType<typeof createAdminClient>;

/** La cuenta debe existir y ser del equipo docente (nunca de un estudiante). */
async function cuentaDelEquipo(admin: ClienteAdmin, id: string) {
  const { data, error } = await admin
    .from('usuario')
    .select('id, correo, rol')
    .eq('id', id)
    .maybeSingle();
  if (error) log.error('admin.cuenta_no_consultada', { codigo: error.code });
  return data && data.rol !== 'estudiante' ? data : null;
}

/**
 * Crea la cuenta de un docente (o de otro Administrador). Si entra con Google, no necesita
 * contraseña: Supabase enlaza su cuenta de Google por el correo. Si no, se genera una contraseña
 * temporal que se muestra una sola vez y que el docente cambia al entrar.
 */
export async function crearDocente(
  valores: unknown
): Promise<ResultadoAccion<{ id: string; contrasena: string | null }>> {
  await requerirSuperadmin();

  const datos = crearDocenteSchema.safeParse(valores);
  if (!datos.success) {
    return { ok: false, error: MENSAJE_DATOS_INVALIDOS };
  }
  const { nombre, correo, codigo, rol, acceso } = datos.data;
  const contrasena = acceso === 'contrasena' ? generarContrasenaTemporal() : null;

  const admin = createAdminClient();
  const [porCorreo, porCodigo] = await Promise.all([
    admin.from('usuario').select('rol').eq('correo', correo).maybeSingle(),
    admin.from('usuario').select('id').eq('codigo_institucional', codigo).maybeSingle(),
  ]);
  if (porCorreo.error || porCodigo.error) {
    log.error('admin.docente_no_verificado', {
      codigo: porCorreo.error?.code ?? porCodigo.error?.code,
    });
    return { ok: false, error: MENSAJE_GENERICO };
  }
  if (porCorreo.data) {
    return {
      ok: false,
      error:
        porCorreo.data.rol === 'estudiante'
          ? 'Ese correo pertenece a la cuenta de un estudiante.'
          : MENSAJE_CORREO_EN_USO,
    };
  }
  if (porCodigo.data) {
    return { ok: false, error: MENSAJE_CODIGO_EN_USO };
  }

  let id: string;
  let creada = false;
  const { data: creado, error: errorCreacion } = await admin.auth.admin.createUser({
    email: correo,
    email_confirm: true,
    ...(contrasena && { password: contrasena }),
    user_metadata: { nombre },
  });
  if (!errorCreacion) {
    id = creado.user.id;
    creada = true;
  } else if (errorCreacion.code === 'email_exists') {
    // Usuario de Auth sin perfil (p. ej. creado a mano en Supabase): se le da el perfil.
    const { data: existente, error } = await admin.rpc('id_cuenta_por_correo', {
      p_correo: correo,
    });
    if (error || !existente) {
      log.error('admin.cuenta_existente_no_encontrada', { codigo: error?.code });
      return { ok: false, error: MENSAJE_GENERICO };
    }
    id = existente;
    if (contrasena) {
      const { error: errorClave } = await admin.auth.admin.updateUserById(id, {
        password: contrasena,
      });
      if (errorClave) {
        log.error('admin.contrasena_no_asignada', { codigo: errorClave.code });
        return { ok: false, error: MENSAJE_GENERICO };
      }
    }
  } else {
    log.error('admin.cuenta_no_creada', { codigo: errorCreacion.code });
    return { ok: false, error: MENSAJE_GENERICO };
  }

  const { error: errorPerfil } = await admin.from('usuario').insert({
    id,
    nombre,
    correo,
    codigo_institucional: codigo,
    rol,
    contrasena_temporal: contrasena !== null,
  });
  if (errorPerfil) {
    // Sin perfil la cuenta no sirve: se deshace para poder intentarlo de nuevo.
    if (creada) await admin.auth.admin.deleteUser(id);
    if (errorPerfil.code === CODIGO_PG.UNIQUE_VIOLATION) {
      return { ok: false, error: 'El correo o el código ya pertenecen a otra cuenta.' };
    }
    log.error('admin.perfil_no_creado', { codigo: errorPerfil.code });
    return { ok: false, error: MENSAJE_GENERICO };
  }

  log.info('admin.docente_creado', { rol, acceso });
  return { ok: true, datos: { id, contrasena } };
}

/**
 * Corrige el nombre, el correo, el código o el rol de una cuenta del equipo docente. Si el correo
 * cambia, también cambia en Supabase Auth (con él entra con Google o con contraseña).
 */
export async function actualizarDocente(
  valores: unknown
): Promise<ResultadoAccion<{ id: string }>> {
  const yo = await requerirSuperadmin();

  const datos = actualizarDocenteSchema.safeParse(valores);
  if (!datos.success) {
    return { ok: false, error: MENSAJE_DATOS_INVALIDOS };
  }
  const { id, nombre, correo, codigo, rol } = datos.data;
  if (id === yo.id && rol !== 'superadmin') {
    return { ok: false, error: 'No puedes quitarte el rol de Administrador.' };
  }

  const admin = createAdminClient();
  const actual = await cuentaDelEquipo(admin, id);
  if (!actual) {
    return { ok: false, error: MENSAJE_NO_DISPONIBLE };
  }

  if (actual.correo !== correo) {
    const { error } = await admin.auth.admin.updateUserById(id, {
      email: correo,
      email_confirm: true,
    });
    if (error) {
      if (error.code === 'email_exists') return { ok: false, error: MENSAJE_CORREO_EN_USO };
      log.error('admin.correo_no_actualizado', { codigo: error.code });
      return { ok: false, error: MENSAJE_GENERICO };
    }
  }

  const { error } = await admin
    .from('usuario')
    .update({ nombre, correo, codigo_institucional: codigo, rol })
    .eq('id', id);
  if (error) {
    if (error.code === CODIGO_PG.UNIQUE_VIOLATION) {
      return { ok: false, error: 'El correo o el código ya pertenecen a otra cuenta.' };
    }
    log.error('admin.docente_no_actualizado', { codigo: error.code });
    return { ok: false, error: MENSAJE_GENERICO };
  }

  return { ok: true, datos: { id } };
}

/**
 * Desactiva (o reactiva) una cuenta. Desactivada no puede entrar: Supabase Auth la bloquea y la
 * aplicación le niega el acceso de inmediato aunque tuviera una sesión abierta. Conserva sus
 * estudiantes, casos y sesiones.
 */
export async function cambiarEstadoDocente(
  valores: unknown
): Promise<ResultadoAccion<{ id: string; activo: boolean }>> {
  const yo = await requerirSuperadmin();

  const datos = cambiarEstadoDocenteSchema.safeParse(valores);
  if (!datos.success) {
    return { ok: false, error: MENSAJE_DATOS_INVALIDOS };
  }
  const { id, activo } = datos.data;
  if (id === yo.id) {
    return { ok: false, error: MENSAJE_SOBRE_SI_MISMO };
  }

  const admin = createAdminClient();
  if (!(await cuentaDelEquipo(admin, id))) {
    return { ok: false, error: MENSAJE_NO_DISPONIBLE };
  }

  const { error: errorAuth } = await admin.auth.admin.updateUserById(id, {
    ban_duration: activo ? 'none' : BLOQUEO_INDEFINIDO,
  });
  if (errorAuth) {
    log.error('admin.bloqueo_no_aplicado', { codigo: errorAuth.code });
    return { ok: false, error: MENSAJE_GENERICO };
  }

  const { error } = await admin.from('usuario').update({ activo }).eq('id', id);
  if (error) {
    log.error('admin.estado_no_actualizado', { codigo: error.code });
    return { ok: false, error: MENSAJE_GENERICO };
  }

  return { ok: true, datos: { id, activo } };
}

/**
 * Genera una contraseña temporal nueva (p. ej. si el docente olvidó la suya). Se muestra una sola
 * vez; el docente la cambia al entrar.
 */
export async function restablecerContrasenaDocente(
  valores: unknown
): Promise<ResultadoAccion<{ contrasena: string }>> {
  const yo = await requerirSuperadmin();

  const datos = idDocenteSchema.safeParse(valores);
  if (!datos.success) {
    return { ok: false, error: MENSAJE_DATOS_INVALIDOS };
  }
  const { id } = datos.data;
  if (id === yo.id) {
    return { ok: false, error: 'Cambia tu propia contraseña desde el menú de tu cuenta.' };
  }

  const admin = createAdminClient();
  if (!(await cuentaDelEquipo(admin, id))) {
    return { ok: false, error: MENSAJE_NO_DISPONIBLE };
  }

  const contrasena = generarContrasenaTemporal();
  const { error: errorAuth } = await admin.auth.admin.updateUserById(id, { password: contrasena });
  if (errorAuth) {
    log.error('admin.contrasena_no_restablecida', { codigo: errorAuth.code });
    return { ok: false, error: MENSAJE_GENERICO };
  }

  const { error } = await admin.from('usuario').update({ contrasena_temporal: true }).eq('id', id);
  if (error) log.error('admin.marca_temporal_no_guardada', { codigo: error.code });

  return { ok: true, datos: { contrasena } };
}

/**
 * Elimina una cuenta del equipo docente que aún no tiene historial (estudiantes, casos, códigos
 * ni sesiones). Con historial hay que desactivarla: así no se pierden las prácticas de nadie.
 */
export async function eliminarDocente(valores: unknown): Promise<ResultadoAccion<{ id: string }>> {
  const yo = await requerirSuperadmin();

  const datos = idDocenteSchema.safeParse(valores);
  if (!datos.success) {
    return { ok: false, error: MENSAJE_DATOS_INVALIDOS };
  }
  const { id } = datos.data;
  if (id === yo.id) {
    return { ok: false, error: MENSAJE_SOBRE_SI_MISMO };
  }

  const admin = createAdminClient();
  if (!(await cuentaDelEquipo(admin, id))) {
    return { ok: false, error: MENSAJE_NO_DISPONIBLE };
  }

  const contar = (tabla: 'estudiante' | 'escenario' | 'asignacion') =>
    admin.from(tabla).select('id', { count: 'exact', head: true }).eq('docente_id', id);
  const [estudiantes, casos, codigos, sesiones] = await Promise.all([
    contar('estudiante'),
    contar('escenario'),
    contar('asignacion'),
    admin.from('sesion').select('id', { count: 'exact', head: true }).eq('usuario_id', id),
  ]);
  const fallo = [estudiantes, casos, codigos, sesiones].find(r => r.error);
  if (fallo?.error) {
    log.error('admin.historial_no_consultado', { codigo: fallo.error.code });
    return { ok: false, error: MENSAJE_GENERICO };
  }
  const historial = [estudiantes, casos, codigos, sesiones].some(r => (r.count ?? 0) > 0);
  if (historial) {
    return {
      ok: false,
      error:
        'Esta cuenta ya tiene estudiantes, casos o sesiones. Desactívala para conservar su historial.',
    };
  }

  const { error } = await admin.auth.admin.deleteUser(id);
  if (error) {
    log.error('admin.cuenta_no_eliminada', { codigo: error.code });
    return { ok: false, error: MENSAJE_GENERICO };
  }

  return { ok: true, datos: { id } };
}
