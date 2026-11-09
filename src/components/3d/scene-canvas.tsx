'use client';

import { PerformanceMonitor } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import Link from 'next/link';
import { Component, type ReactNode, useState } from 'react';
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
const MENSAJE_SIN_WEBGL =
  'Tu navegador no puede mostrar gráficos 3D (WebGL). Prueba con una versión reciente de Chrome, Edge o Firefox con la aceleración por hardware activada.';

/**
 * Si el navegador tiene canvas pero no logra crear el contexto WebGL (aceleración desactivada, GPU
 * en la lista negra), R3F lanza el error hacia afuera y el `fallback` del Canvas nunca se ve: sin
 * este límite, el estudiante veía «No pudimos cargar esta página» y un Reintentar que no sirve.
 * Va por encima de la pantalla de carga, que nunca terminaría.
 */
class LimiteErrorWebGL extends Component<{ children: ReactNode }, { fallo: boolean }> {
  state = { fallo: false };

  static getDerivedStateFromError() {
    return { fallo: true };
  }

  render() {
    if (!this.state.fallo) return this.props.children;
    return (
      <div
        role="alert"
        className="absolute inset-0 z-40 flex flex-col items-center justify-center gap-4 bg-background p-6 text-center"
      >
        <p className="max-w-md text-muted-foreground">{MENSAJE_SIN_WEBGL}</p>
        <p className="max-w-md text-sm text-muted-foreground">
          Tu práctica sigue abierta: puedes retomarla desde otro computador.
        </p>
        <Link href="/practicas" className="font-semibold underline underline-offset-4">
          Ir a Mis prácticas
        </Link>
      </div>
    );
  }
}

export function SceneCanvas(props: SceneCanvasProps) {
  return (
    <LimiteErrorWebGL>
      <LienzoEscena {...props} />
    </LimiteErrorWebGL>
  );
}

function LienzoEscena({ children, onListo }: SceneCanvasProps) {
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
          {MENSAJE_SIN_WEBGL}
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
