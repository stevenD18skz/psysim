'use client';

import { useFrame } from '@react-three/fiber';
import { useMemo } from 'react';
import { Matrix4, Quaternion, Vector3 } from 'three';

import { estaConversando } from '@/lib/conversacion/estados-npc';
import { encuadreConversacion } from '@/lib/escena/encuadre';
import { type Escena } from '@/schemas/escena.schema';
import { useAppStore } from '@/store/app-store-provider';

/** Rapidez de la transición (1/s): ~0,8 s hasta quedar prácticamente en la posición final. */
const RAPIDEZ = 4.5;
const ARRIBA = new Vector3(0, 1, 0);

/**
 * HU-13 · T01 — Transición de cámara al conversar: mientras el paciente está en un estado de
 * conversación, lleva la cámara con suavidad (amortiguación exponencial, independiente de los
 * FPS) hasta el punto frente al paciente y la orienta hacia sus ojos.
 *
 * Se implementa con interpolación propia en lugar de `CameraControls`: convive con
 * `PointerLockControls` sin que dos controladores se disputen la cámara.
 */
export function CamaraConversacion({ npc }: { npc: Escena['npc'] }) {
  const conversando = useAppStore(state => estaConversando(state.npc.estado));

  const objetivo = useMemo(() => {
    const { posicion, mirarA } = encuadreConversacion(npc);
    const destino = new Vector3(...posicion);
    const orientacion = new Quaternion().setFromRotationMatrix(
      new Matrix4().lookAt(destino, new Vector3(...mirarA), ARRIBA)
    );
    return { destino, orientacion };
  }, [npc]);

  useFrame(({ camera }, delta) => {
    if (!conversando) return;
    const t = 1 - Math.exp(-RAPIDEZ * Math.min(delta, 0.1));
    camera.position.lerp(objetivo.destino, t);
    camera.quaternion.slerp(objetivo.orientacion, t);
  });

  return null;
}
