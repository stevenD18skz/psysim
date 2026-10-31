'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { type ResultadoAccion } from '@/lib/acciones';
import { estadoAsignacion } from '@/lib/asignaciones/codigo';
import { requerirDocente, requerirEstudiante } from '@/lib/auth/dal';
import { RUTA_LOGIN } from '@/lib/auth/routes';
import {
  COOKIE_ENTREGA,
  COOKIE_EQUIPO_COMPARTIDO,
  DURACION_ENTREGA_S,
  RUTA_ENTREGA,
  RUTA_FIN_ENTREGA,
  serializarEntrega,
  usaGoogle,
} from '@/lib/equipo-compartido/entrega';
import { log } from '@/lib/log';
import { createClient } from '@/lib/supabase/server';
import { idAsignacionSchema } from '@/schemas/asignacion.schema';

const OPCIONES_COOKIE = {
  path: '/',
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  maxAge: DURACION_ENTREGA_S,
} as const;

/** Quita las marcas de la entrega (al cancelarla, al terminar o cuando el docente vuelve a entrar). */
export async function olvidarEntrega(): Promise<void> {
  const almacen = await cookies();
  almacen.delete(COOKIE_ENTREGA);
  almacen.delete(COOKIE_EQUIPO_COMPARTIDO);
}

/**
 * Modo presencial: el docente entrega su computador al estudiante de un código sin usar.
 *
 * Comprueba que el código sea del docente (RLS) y siga vigente, guarda para quién es el equipo,
 * cierra la sesión del docente en este navegador y lleva a la pantalla de entrega. Si todo va bien
 * redirige y no devuelve nada.
 */
export async function entregarEquipo(valores: unknown): Promise<ResultadoAccion<null>> {
  await requerirDocente();

  const datos = idAsignacionSchema.safeParse(valores);
  if (!datos.success) {
    return { ok: false, error: 'Revisa los datos del código.' };
  }

  const supabase = await createClient();
  const { data: asignacion, error } = await supabase
    .from('asignacion')
    .select('codigo, expira_en, anulada_en, sesion_id, estudiante ( nombre ), escenario ( titulo )')
    .eq('id', datos.data.id)
    .maybeSingle();

  if (error) {
    log.error('entrega.asignacion_no_leida', { codigo: error.code });
    return { ok: false, error: 'No pudimos preparar el equipo. Inténtalo de nuevo.' };
  }
  const estado =
    asignacion &&
    estadoAsignacion({
      sesionId: asignacion.sesion_id,
      anuladaEn: asignacion.anulada_en,
      expiraEn: asignacion.expira_en,
    });
  if (!asignacion?.estudiante || !asignacion.escenario || estado !== 'pendiente') {
    return {
      ok: false,
      error: 'Ese código ya se usó, se anuló o venció. Genera uno nuevo para practicar aquí.',
    };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const almacen = await cookies();
  almacen.set(
    COOKIE_ENTREGA,
    serializarEntrega({
      codigo: asignacion.codigo,
      estudiante: asignacion.estudiante.nombre,
      caso: asignacion.escenario.titulo,
      docenteConGoogle: usaGoogle(user?.app_metadata),
    }),
    { ...OPCIONES_COOKIE, httpOnly: true }
  );
  // Legible en el navegador: la práctica la usa para terminar cerrando la sesión.
  almacen.set(COOKIE_EQUIPO_COMPARTIDO, '1', { ...OPCIONES_COOKIE, httpOnly: false });

  const { error: errorSalida } = await supabase.auth.signOut({ scope: 'local' });
  if (errorSalida) {
    // signOut elimina las cookies locales aunque falle la revocación remota.
    log.error('entrega.sesion_docente_no_revocada', { codigo: errorSalida.code });
  }

  redirect(RUTA_ENTREGA);
}

/** El docente se arrepiente antes de que el estudiante entre: vuelve al acceso. */
export async function cancelarEntrega(): Promise<void> {
  await olvidarEntrega();
  redirect(`${RUTA_LOGIN}?docente=1`);
}

/**
 * Fin de la práctica en un equipo compartido: cierra la sesión del estudiante, quita las marcas
 * de la entrega y lleva a la pantalla que pide cerrar también la sesión de Google.
 */
export async function cerrarSesionEquipoCompartido(): Promise<void> {
  await requerirEstudiante();

  const supabase = await createClient();
  const { error } = await supabase.auth.signOut({ scope: 'local' });
  if (error) log.error('entrega.sesion_estudiante_no_revocada', { codigo: error.code });

  await olvidarEntrega();
  redirect(RUTA_FIN_ENTREGA);
}
