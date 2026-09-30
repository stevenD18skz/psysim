'use client';

import { useCallback, useEffect, useState } from 'react';

import { precargarModelo } from '@/components/3d/modelo-glb';
import { type Escena, escenaSchema } from '@/schemas/escena.schema';

export type EstadoEscena =
  | { estado: 'cargando' }
  | { estado: 'lista'; escena: Escena }
  | { estado: 'error'; mensaje: string };

/** Todas las rutas de GLB que usa una escena (entorno, muebles y paciente). */
export function rutasModelos(escena: Escena): string[] {
  const rutas = [
    escena.entorno?.modelo,
    escena.npc.modelo,
    ...escena.mobiliario.map(m => m.modelo),
  ].filter((ruta): ruta is string => Boolean(ruta));
  return [...new Set(rutas)];
}

/**
 * Descarga y valida el JSON de la escena (public/scenes/*.json) y, en cuanto se conoce,
 * inicia la precarga de sus modelos para que se descarguen mientras se ve la pantalla de carga.
 */
export function useEscena(ruta: string): { estado: EstadoEscena; reintentar: () => void } {
  const [estado, setEstado] = useState<EstadoEscena>({ estado: 'cargando' });
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    const controlador = new AbortController();

    fetch(`/${ruta}`, { signal: controlador.signal })
      .then(async respuesta => {
        if (!respuesta.ok) throw new Error(`HTTP ${respuesta.status}`);
        const resultado = escenaSchema.safeParse(await respuesta.json());
        if (!resultado.success) {
          console.error('[escena] Configuración inválida:', resultado.error.issues);
          setEstado({ estado: 'error', mensaje: 'La configuración del escenario no es válida.' });
          return;
        }
        rutasModelos(resultado.data).forEach(precargarModelo);
        setEstado({ estado: 'lista', escena: resultado.data });
      })
      .catch((error: unknown) => {
        if (controlador.signal.aborted) return;
        console.error('[escena] No se pudo cargar la configuración:', error);
        setEstado({ estado: 'error', mensaje: 'No fue posible cargar el escenario.' });
      });

    return () => controlador.abort();
  }, [ruta, intento]);

  const reintentar = useCallback(() => {
    setEstado({ estado: 'cargando' });
    setIntento(n => n + 1);
  }, []);

  return { estado, reintentar };
}
