'use client';

import { type Escena } from '@/schemas/escena.schema';

/** Resolución del mapa de sombras: 1024 es suficiente para una sala y ligera para una iGPU. */
const RESOLUCION_SOMBRAS = 1024;

/**
 * HU-08 · T02 — Iluminación base de la escena:
 * - `AmbientLight` y `HemisphereLight` aportan la luz global (cielo cálido / rebote del suelo).
 * - `DirectionalLight` simula la luz natural que entra por la ventana y proyecta sombras suaves.
 * - Luces puntuales opcionales (lámparas), sin sombras para no penalizar el rendimiento.
 */
export function Iluminacion({ iluminacion }: { iluminacion: Escena['iluminacion'] }) {
  const { ambiental, hemisferica, direccional, puntuales, fondo } = iluminacion;

  return (
    <>
      <color attach="background" args={[fondo]} />
      <ambientLight intensity={ambiental.intensidad} color={ambiental.color} />
      <hemisphereLight
        intensity={hemisferica.intensidad}
        color={hemisferica.cielo}
        groundColor={hemisferica.suelo}
      />
      <directionalLight
        position={direccional.posicion}
        intensity={direccional.intensidad}
        color={direccional.color}
        castShadow
        shadow-mapSize={[RESOLUCION_SOMBRAS, RESOLUCION_SOMBRAS]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.03}
        shadow-radius={4}
        shadow-camera-left={-5}
        shadow-camera-right={5}
        shadow-camera-top={5}
        shadow-camera-bottom={-5}
        shadow-camera-near={0.5}
        shadow-camera-far={20}
      />
      {puntuales.map((luz, i) => (
        <pointLight
          key={i}
          position={luz.posicion}
          color={luz.color}
          intensity={luz.intensidad}
          distance={luz.distancia}
          decay={2}
        />
      ))}
    </>
  );
}
