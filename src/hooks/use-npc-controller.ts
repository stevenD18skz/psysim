'use client';

import { useEffect, useEffectEvent, useState, useSyncExternalStore } from 'react';

import { type AccionNpc } from '@/lib/npc/acciones';
import { type GlbCargado } from '@/lib/npc/cargar-glb';
import { ControladorNpc } from '@/lib/npc/controlador-npc';

export type {
  EjeRotacion,
  EstadoNpc,
  InterruptorNpc,
  ProgresoClip,
} from '@/lib/npc/controlador-npc';

export interface OpcionesControlador {
  /** Se llama cuando termina una acción que no se repite (antes de volver a reposo). */
  onActionEnd?: (accion: AccionNpc) => void;
  /** Atajos de teclado del laboratorio (1–0, Q, W, E, Espacio, S, M, P, G). */
  atajos?: boolean;
}

/**
 * Crea un `ControladorNpc` para el GLB indicado, una vez por montaje (mixer, crossfade, pausa,
 * velocidad, mezcla y pose manual), expone su estado de interfaz con `useSyncExternalStore` y se
 * encarga de la limpieza: listeners de teclado y del mixer, materiales y ayudas.
 */
export function useNpcController(
  glb: GlbCargado,
  { onActionEnd, atajos = true }: OpcionesControlador = {}
) {
  // Para cambiar de NPC se monta un componente nuevo (`key`), no se reutiliza el controlador.
  const [controlador] = useState(() => new ControladorNpc(glb));
  const estado = useSyncExternalStore(
    controlador.suscribir,
    controlador.obtenerEstado,
    controlador.obtenerEstado
  );

  // Siempre llama a la versión más reciente del callback sin reiniciar el controlador.
  const alTerminarAccion = useEffectEvent((accion: AccionNpc) => onActionEnd?.(accion));

  useEffect(() => controlador.montar(accion => alTerminarAccion(accion)), [controlador]);

  useEffect(() => {
    if (!atajos) return;
    return controlador.escucharTeclado();
  }, [controlador, atajos]);

  return { controlador, estado };
}

export type NpcControlador = ReturnType<typeof useNpcController>;
