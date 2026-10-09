import { requerirSuperadmin } from '@/lib/auth/dal';
import type { Metadata } from 'next';

import { LaboratorioNpc } from '@/components/laboratorio/laboratorio-npc';

export const metadata: Metadata = {
  title: 'NPC · Laboratorio',
};

/** Herramienta de desarrollo: solo para el Administrador. */
export default async function LaboratorioNpcPage() {
  await requerirSuperadmin();
  return <LaboratorioNpc />;
}
