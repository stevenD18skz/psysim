'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

/**
 * Mientras haya una simulación en progreso, vuelve a pedir los datos al servidor cada cierto
 * tiempo: así el docente ve cuándo el estudiante termina sin recargar la página. Se pausa con la
 * pestaña oculta.
 */
export function RefrescoAutomatico({
  activo,
  segundos = 20,
}: {
  activo: boolean;
  segundos?: number;
}) {
  const router = useRouter();

  useEffect(() => {
    if (!activo) return;
    const intervalo = setInterval(() => {
      if (document.visibilityState === 'visible') router.refresh();
    }, segundos * 1000);
    return () => clearInterval(intervalo);
  }, [activo, segundos, router]);

  return null;
}
