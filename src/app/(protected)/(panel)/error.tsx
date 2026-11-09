'use client';

import { ContenidoError } from '@/app/error';

/**
 * Error de una página del panel. Sin este límite, el error subía hasta `src/app/error.tsx` y
 * reemplazaba también el menú lateral.
 */
export default function ErrorPanel(props: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return <ContenidoError {...props} envoltorio="div" />;
}
