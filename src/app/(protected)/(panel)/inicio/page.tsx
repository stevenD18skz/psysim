import { redirect } from 'next/navigation';

import { RUTA_INICIO_DOCENTE } from '@/lib/auth/routes';

// La pantalla principal del docente llega en el Sprint 5 (HU-22). Mientras tanto,
// /inicio lleva a la ruta de inicio actual.
export default function InicioPage() {
  redirect(RUTA_INICIO_DOCENTE);
}
