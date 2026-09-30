import { readdirSync } from 'node:fs';
import path from 'node:path';

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { GaleriaModelos } from '@/components/dev/galeria-modelos';

export const metadata: Metadata = { title: 'Galería de modelos (desarrollo)' };

/**
 * Herramienta de desarrollo: muestra todos los GLB de public/models normalizados a 1 m, con
 * una flecha que indica el frente esperado (+Z). Sirve para elegir modelos, detectar su
 * orientación y definir el `ajuste` en los JSON de escena. No existe en producción.
 */
export default async function GaleriaModelosPage({ searchParams }: PageProps<'/dev/modelos'>) {
  if (process.env.NODE_ENV === 'production') notFound();

  const { carpeta, q } = await searchParams;
  // `?q=couch,lamp` filtra por fragmentos del nombre (separados por comas).
  const fragmentos =
    typeof q === 'string'
      ? q
          .toLowerCase()
          .split(',')
          .map(f => f.trim())
          .filter(Boolean)
      : [];
  const raiz = path.join(process.cwd(), 'public/models');
  const modelos = readdirSync(raiz, { withFileTypes: true })
    .filter(entrada => entrada.isDirectory())
    .filter(entrada => typeof carpeta !== 'string' || entrada.name === carpeta)
    .flatMap(entrada =>
      readdirSync(path.join(raiz, entrada.name))
        .filter(archivo => archivo.toLowerCase().endsWith('.glb'))
        .filter(
          archivo =>
            fragmentos.length === 0 || fragmentos.some(f => archivo.toLowerCase().includes(f))
        )
        .map(archivo => ({
          nombre: `${entrada.name}/${archivo}`,
          url: `/models/${entrada.name}/${encodeURIComponent(archivo)}`,
        }))
    );

  return <GaleriaModelos modelos={modelos} />;
}
