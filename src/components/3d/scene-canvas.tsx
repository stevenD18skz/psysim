'use client';

import { PerformanceMonitor } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { type ReactNode, useState } from 'react';
import { ACESFilmicToneMapping, PCFShadowMap } from 'three';

import { MonitorRendimiento } from '@/components/3d/monitor-rendimiento';

/**
 * Límite del devicePixelRatio (sección 4.4): en pantallas HiDPI renderizar a 2× o 3× multiplica
 * el coste en una iGPU sin una mejora visible. Si el rendimiento cae, se baja a 1.
 */
const DPR_MAXIMO = 1.5;
const DPR_REDUCIDO = 1;

interface SceneCanvasProps {
  children: ReactNode;
  /** Se llama cuando WebGL está listo y se ha renderizado el primer fotograma. */
  onListo?: () => void;
}

/**
 * HU-08 · T01 — Canvas de React Three Fiber configurado para la simulación.
 *
 * Se importa con `next/dynamic` y `ssr: false` (Three.js necesita el DOM). El contenedor
 * padre DEBE tener un alto definido (p. ej. `h-dvh`): si mide 0 px antes
 * de la hidratación, el canvas no puede calcular su relación de aspecto.
 */
export function SceneCanvas({ children, onListo }: SceneCanvasProps) {
  const [dpr, setDpr] = useState<number>(DPR_MAXIMO);

  return (
    <Canvas
      className="absolute! inset-0"
      dpr={[1, dpr]}
      shadows={{ type: PCFShadowMap }}
      gl={{
        antialias: true,
        powerPreference: 'high-performance',
        toneMapping: ACESFilmicToneMapping,
        toneMappingExposure: 1.05,
      }}
      camera={{ fov: 60, near: 0.05, far: 60, position: [0, 1.6, 3] }}
      onCreated={({ gl }) => {
        // Espera a que se pinte el primer fotograma antes de retirar la pantalla de carga.
        requestAnimationFrame(() => requestAnimationFrame(() => onListo?.()));
        gl.domElement.setAttribute('aria-label', 'Escena 3D de la simulación');
        gl.domElement.setAttribute('role', 'img');
      }}
      fallback={
        <div className="flex h-full items-center justify-center p-6 text-center text-muted-foreground">
          Tu navegador no puede mostrar gráficos 3D (WebGL). Prueba con una versión reciente de
          Chrome, Edge o Firefox con la aceleración por hardware activada.
        </div>
      }
    >
      <PerformanceMonitor
        onDecline={() => setDpr(DPR_REDUCIDO)}
        onIncline={() => setDpr(DPR_MAXIMO)}
      >
        <MonitorRendimiento />
        {children}
      </PerformanceMonitor>
    </Canvas>
  );
}
