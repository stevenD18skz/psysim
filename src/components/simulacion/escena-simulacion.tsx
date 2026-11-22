'use client';

import { SceneCanvas } from '@/components/3d/scene-canvas';
import { SceneLoader } from '@/components/3d/scene-loader';
import { type Escena } from '@/schemas/escena.schema';

interface EscenaSimulacionProps {
  escena: Escena;
  onListo: () => void;
  onBloqueoCambia: (bloqueado: boolean) => void;
  onFallo?: () => void;
}

/**
 * Todo lo que depende de Three.js vive en este módulo, que se importa con `next/dynamic`
 * y `ssr: false`: así no se ejecuta en el servidor y queda en un chunk aparte que solo se
 * descarga en /simulacion.
 */
export default function EscenaSimulacion({
  escena,
  onListo,
  onBloqueoCambia,
  onFallo,
}: EscenaSimulacionProps) {
  return (
    <SceneCanvas onListo={onListo} onFallo={onFallo}>
      <SceneLoader escena={escena} onBloqueoCambia={onBloqueoCambia} />
    </SceneCanvas>
  );
}
