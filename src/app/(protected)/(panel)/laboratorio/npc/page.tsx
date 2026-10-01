import type { Metadata } from 'next';

import { LaboratorioNpc } from '@/components/laboratorio/laboratorio-npc';

export const metadata: Metadata = {
  title: 'NPC · Laboratorio',
};

export default function LaboratorioNpcPage() {
  return <LaboratorioNpc />;
}
