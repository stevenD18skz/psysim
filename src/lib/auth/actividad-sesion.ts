'use server';

import { obtenerSesionUsuario } from '@/lib/auth/dal';
import { createClient } from '@/lib/supabase/server';

/** La pestaña solo puede registrar actividad en la sesión y cuenta que tiene abiertas. */
export async function comprobarActividadSesion(
  cuentaId: string,
  registrar: boolean
): Promise<number | null> {
  const sesion = await obtenerSesionUsuario();
  if (sesion.estado !== 'autorizado' || sesion.perfil.id !== cuentaId) return null;
  if (registrar !== true) return sesion.segundosRestantes;

  const supabase = await createClient();
  const { data, error } = await supabase.rpc('registrar_actividad_cuenta');
  if (error) throw new Error('No pudimos registrar la actividad de la cuenta.', { cause: error });
  return data && data > 0 ? data : null;
}
