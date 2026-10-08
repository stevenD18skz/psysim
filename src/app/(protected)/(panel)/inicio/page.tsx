import { redirect } from 'next/navigation';

import { requerirUsuario } from '@/lib/auth/dal';
import { RUTA_INICIO } from '@/lib/auth/routes';

// La pantalla principal llega en el Sprint 5 (HU-22). Mientras tanto, /inicio lleva a la ruta de
// inicio de cada rol.
export default async function InicioPage() {
  const perfil = await requerirUsuario();
  redirect(RUTA_INICIO[perfil.rol]);
}
