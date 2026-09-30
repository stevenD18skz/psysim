'use client';

import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import { useStore } from 'zustand';
import { createStore } from 'zustand/vanilla';

/**
 * HU-08 · T02 — Medición de FPS del renderer.
 *
 * El conteo se hace dentro del bucle de render y se publica cada medio segundo en un store
 * ligero, así el indicador HTML se actualiza sin re-renderizar la escena.
 */
interface EstadoRendimiento {
  fps: number;
  /** Promedio acumulado desde que se montó la escena (útil para las pruebas de rendimiento). */
  promedio: number;
  muestras: number;
  /** Posición de la cámara (ojos del estudiante): ayuda a ubicar objetos en los JSON de escena. */
  posicion: [number, number, number];
}

export const rendimientoStore = createStore<EstadoRendimiento>(() => ({
  fps: 0,
  promedio: 0,
  muestras: 0,
  posicion: [0, 0, 0],
}));

const INTERVALO = 0.5;

/** Se monta dentro del `<Canvas>`. */
export function MonitorRendimiento() {
  const acumulado = useRef({ fotogramas: 0, tiempo: 0 });

  useFrame(({ camera }, delta) => {
    const a = acumulado.current;
    a.fotogramas += 1;
    a.tiempo += delta;
    if (a.tiempo < INTERVALO) return;

    const fps = a.fotogramas / a.tiempo;
    a.fotogramas = 0;
    a.tiempo = 0;
    rendimientoStore.setState(({ promedio, muestras }) => ({
      fps,
      promedio: (promedio * muestras + fps) / (muestras + 1),
      muestras: muestras + 1,
      posicion: camera.position.toArray(),
    }));
  });

  return null;
}

/** Indicador de FPS y posición (HTML, fuera del canvas). Se muestra con `?debug=1`. */
export function IndicadorFps() {
  const { fps, promedio, posicion } = useStore(rendimientoStore);
  const [x, y, z] = posicion;
  return (
    <div
      data-testid="indicador-fps"
      data-posicion={posicion.map(v => v.toFixed(2)).join(',')}
      className="pointer-events-none rounded-lg bg-black/60 px-2.5 py-1 font-mono text-xs text-white tabular-nums"
    >
      {fps.toFixed(0)} FPS · prom. {promedio.toFixed(0)} · x {x.toFixed(2)} y {y.toFixed(2)} z{' '}
      {z.toFixed(2)}
    </div>
  );
}
