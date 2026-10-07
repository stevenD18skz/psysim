'use client';

import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import {
  type AmbientLight,
  Color,
  type DirectionalLight,
  type HemisphereLight,
  type PointLight,
} from 'three';

import { useEfectosAmbiente } from '@/hooks/use-efectos-ambiente';
import { type Escena } from '@/schemas/escena.schema';

/** Resolución del mapa de sombras: 1024 es suficiente para una sala y ligera para una iGPU. */
const RESOLUCION_SOMBRAS = 1024;

/** Tono hacia el que se templa la luz con la calma (sol de tarde) o el malestar (día nublado). */
const LUZ_CALIDA = new Color('#ffc98f');
const LUZ_FRIA = new Color('#8ea6c4');
/** Rapidez de las transiciones del ambiente (1/s): unos 4 s, para que se sienta y no salte. */
export const RAPIDEZ_AMBIENTE = 0.7;

function templar(destino: Color, base: Color, calidez: number) {
  destino.copy(base);
  if (calidez > 0) destino.lerp(LUZ_CALIDA, calidez * 0.35);
  else destino.lerp(LUZ_FRIA, -calidez * 0.6);
}

/**
 * HU-08 · T02 — Iluminación base de la escena:
 * - `AmbientLight` y `HemisphereLight` aportan la luz global (cielo cálido / rebote del suelo).
 * - `DirectionalLight` simula la luz natural que entra por la ventana y proyecta sombras suaves.
 * - Luces puntuales opcionales (lámparas), sin sombras para no penalizar el rendimiento.
 *
 * Ambiente dinámico: la intensidad y la temperatura de todas las luces (y el fondo) siguen el
 * clima emocional de la conversación (`useEfectosAmbiente`). Con el clima neutro la escena queda
 * exactamente como la describe su JSON. Las transiciones se hacen en `useFrame`, sin re-renders.
 */
export function Iluminacion({ iluminacion }: { iluminacion: Escena['iluminacion'] }) {
  const { ambiental, hemisferica, direccional, puntuales, fondo } = iluminacion;
  const efectos = useEfectosAmbiente();

  const ambiente = useRef<AmbientLight>(null);
  const hemisfera = useRef<HemisphereLight>(null);
  const sol = useRef<DirectionalLight>(null);
  const lamparas = useRef<(PointLight | null)[]>([]);
  const actual = useRef({ brillo: 1, calidez: 0, niebla: 0 });

  // Colores base del JSON (no se mutan) y el fondo, que sí se ajusta en cada fotograma.
  const base = useMemo(
    () => ({
      ambiental: new Color(ambiental.color),
      cielo: new Color(hemisferica.cielo),
      suelo: new Color(hemisferica.suelo),
      direccional: new Color(direccional.color),
      puntuales: puntuales.map(luz => new Color(luz.color)),
      fondo: new Color(fondo),
    }),
    [ambiental.color, hemisferica.cielo, hemisferica.suelo, direccional.color, puntuales, fondo]
  );
  const colorFondo = useMemo(() => new Color(fondo), [fondo]);

  useFrame((_, delta) => {
    const t = 1 - Math.exp(-RAPIDEZ_AMBIENTE * Math.min(delta, 0.1));
    const a = actual.current;
    a.brillo += (efectos.brillo - a.brillo) * t;
    a.calidez += (efectos.calidez - a.calidez) * t;
    a.niebla += (efectos.niebla - a.niebla) * t;

    if (ambiente.current) {
      ambiente.current.intensity = ambiental.intensidad * a.brillo;
      templar(ambiente.current.color, base.ambiental, a.calidez);
    }
    if (hemisfera.current) {
      hemisfera.current.intensity = hemisferica.intensidad * a.brillo;
      templar(hemisfera.current.color, base.cielo, a.calidez);
      templar(hemisfera.current.groundColor, base.suelo, a.calidez);
    }
    if (sol.current) {
      // El sol de la ventana es lo que más cambia: se nubla con el malestar.
      sol.current.intensity = direccional.intensidad * a.brillo ** 1.6;
      templar(sol.current.color, base.direccional, a.calidez);
    }
    lamparas.current.forEach((lampara, i) => {
      if (!lampara) return;
      lampara.intensity = puntuales[i]!.intensidad * a.brillo;
      templar(lampara.color, base.puntuales[i]!, a.calidez);
    });
    templar(colorFondo, base.fondo, a.calidez);
    colorFondo.lerp(LUZ_FRIA, a.niebla * 0.25).multiplyScalar(Math.min(1, a.brillo));
  });

  return (
    <>
      <primitive attach="background" object={colorFondo} />
      <ambientLight ref={ambiente} intensity={ambiental.intensidad} color={ambiental.color} />
      <hemisphereLight
        ref={hemisfera}
        intensity={hemisferica.intensidad}
        color={hemisferica.cielo}
        groundColor={hemisferica.suelo}
      />
      <directionalLight
        ref={sol}
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
          ref={lampara => {
            lamparas.current[i] = lampara;
          }}
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
