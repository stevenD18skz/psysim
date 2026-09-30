import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { VistaPreviaEscena } from '@/components/dev/vista-previa-escena';
import { AppStoreProvider } from '@/store/app-store-provider';

export const metadata: Metadata = { title: 'Vista previa de escena (desarrollo)' };

/**
 * Herramienta de desarrollo: monta la escena de public/scenes/<archivo>.json sin crear una
 * sesión, para ajustar la distribución del mobiliario. No existe en producción.
 */
export default async function VistaPreviaEscenaPage({
  params,
}: PageProps<'/dev/escena/[archivo]'>) {
  if (process.env.NODE_ENV === 'production') notFound();
  const { archivo } = await params;
  if (!/^e-0[1-6]$/.test(archivo)) notFound();

  // La escena lee el estado del paciente desde el store (fuera de las rutas protegidas).
  return (
    <AppStoreProvider>
      <VistaPreviaEscena ruta={`scenes/${archivo}.json`} />
    </AppStoreProvider>
  );
}
