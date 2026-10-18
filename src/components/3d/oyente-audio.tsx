'use client';

import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import { Vector3 } from 'three';
import { createStore } from 'zustand/vanilla';

import { medidasPacienteStore } from '@/components/3d/medidas-paciente';
import { type PosicionesAudio } from '@/lib/audio/motor-audio';
import { type Escena } from '@/schemas/escena.schema';

/**
 * Puente entre la escena 3D y el motor de sonido: la simulación registra aquí cómo posicionar el
 * audio, y la escena (que conoce la cámara y al paciente) lo llama. Así el motor no depende de
 * React Three Fiber.
 */
export const audioEspacialStore = createStore<{
  posicionar: ((posiciones: PosicionesAudio) => void) | null;
}>(() => ({ posicionar: null }));

/** Unas 10 veces por segundo: las transiciones del motor son suaves. */
const INTERVALO_S = 0.1;

/**
 * Coloca al oyente en la cámara (los oídos del estudiante) y la voz en la cabeza del paciente,
 * para que el paciente suene desde su silla y cambie al girar la cabeza.
 */
export function OyenteAudio({ npc }: { npc: Escena['npc'] }) {
  const acumulado = useRef(0);
  const vectores = useMemo(
    () => ({ posicion: new Vector3(), frente: new Vector3(), arriba: new Vector3() }),
    []
  );

  useFrame(({ camera }, delta) => {
    acumulado.current += delta;
    if (acumulado.current < INTERVALO_S) return;
    acumulado.current = 0;
    const { posicionar } = audioEspacialStore.getState();
    if (!posicionar) return;

    const { posicion, frente, arriba } = vectores;
    camera.getWorldPosition(posicion);
    camera.getWorldDirection(frente);
    arriba.copy(camera.up).applyQuaternion(camera.quaternion).normalize();
    const alturaOjos = medidasPacienteStore.getState().alturaOjos ?? npc.posicion[1] + 1.1;

    posicionar({
      oyente: { x: posicion.x, y: posicion.y, z: posicion.z },
      frente: { x: frente.x, y: frente.y, z: frente.z },
      arriba: { x: arriba.x, y: arriba.y, z: arriba.z },
      voz: { x: npc.posicion[0], y: alturaOjos, z: npc.posicion[2] },
    });
  });

  return null;
}
