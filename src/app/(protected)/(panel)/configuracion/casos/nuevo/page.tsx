import type { Metadata } from 'next';

import { ConstructorCaso } from '@/components/casos/constructor-caso';
import { EncabezadoCaso } from '@/components/casos/encabezado-caso';
import { requerirDocente } from '@/lib/auth/dal';

export const metadata: Metadata = {
  title: 'Nuevo caso',
};

export default async function NuevoCasoPage() {
  await requerirDocente();

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-10 sm:px-6">
      <EncabezadoCaso
        sobretitulo="Mis casos"
        titulo="Crea un caso nuevo"
        descripcion="Completa los campos y el prompt del paciente se arma solo. Puedes probarlo antes de guardar."
      />
      <ConstructorCaso />
    </div>
  );
}
