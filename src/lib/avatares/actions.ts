'use server';

import { type ResultadoAccion } from '@/lib/acciones';
import { debeCambiarContrasena, obtenerSesionUsuario } from '@/lib/auth/dal';
import { esAvatarId, type AvatarId } from '@/lib/avatares/catalogo';
import { log } from '@/lib/log';
import { createAdminClient } from '@/lib/supabase/admin';

export async function guardarAvatar(
  avatarId: unknown,
  cuentaAbierta: string
): Promise<ResultadoAccion<AvatarId | null>> {
  if (avatarId !== null && !esAvatarId(avatarId)) {
    return { ok: false, error: 'Elige un avatar del catálogo o usa tus iniciales.' };
  }

  const sesion = await obtenerSesionUsuario();
  if (
    sesion.estado !== 'autorizado' ||
    sesion.perfil.id !== cuentaAbierta ||
    debeCambiarContrasena(sesion.perfil)
  ) {
    return { ok: false, error: 'Vuelve a entrar en tu cuenta para cambiar el avatar.' };
  }

  const { perfil } = sesion;
  const { data, error } = await createAdminClient()
    .from('usuario')
    .update({ avatar_id: avatarId })
    .eq('id', perfil.id)
    .eq('activo', true)
    .eq('rol', perfil.rol)
    .eq('contrasena_temporal', perfil.contrasenaTemporal)
    .select('id')
    .maybeSingle();

  if (error || !data) {
    if (error) log.error('cuenta.avatar_no_guardado', { codigo: error.code });
    return { ok: false, error: 'No pudimos guardar el avatar. Inténtalo de nuevo.' };
  }

  return { ok: true, datos: avatarId };
}
