'use client';

import { PerformanceMonitor } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { Component, type ReactNode, useReducer } from 'react';
import { ACESFilmicToneMapping, PCFShadowMap } from 'three';

import { ContextoCalidadEscena } from '@/components/3d/calidad-escena-contexto';
import { MonitorRendimiento } from '@/components/3d/monitor-rendimiento';
import { ajustarCalidad, CALIDAD_INICIAL, DPR_REDUCIDO } from '@/lib/escena/calidad';

interface SceneCanvasProps {
  children: ReactNode;
  onFallo?: () => void;
  /** Se llama cuando WebGL está listo y se ha renderizado el primer fotograma. */
  onListo?: () => void;
}

const AVISO_SIN_WEBGL = 'Tu navegador no puede mostrar gráficos 3D (WebGL).';

/**
 * Si el navegador tiene canvas pero no logra crear el contexto WebGL (aceleración desactivada, GPU
 * en la lista negra), R3F lanza el error hacia afuera y el `fallback` del Canvas nunca se ve: sin
 * este límite, la práctica queda inaccesible cuando el navegador no puede abrir el consultorio.
 */
class LimiteErrorWebGL extends Component<
  { children: ReactNode; onFallo?: () => void },
  { fallo: boolean }
> {
  state = { fallo: false };

  static getDerivedStateFromError() {
    return { fallo: true };
  }

  componentDidCatch() {
    this.props.onFallo?.();
  }

  render() {
    if (!this.state.fallo) return this.props.children;
    if (this.props.onFallo) return null;
    return (
      <p role="alert" className="absolute inset-0 grid place-items-center bg-background p-6">
        {AVISO_SIN_WEBGL}
      </p>
    );
  }
}

/** El contenedor padre debe tener un alto definido para que R3F calcule el aspecto del lienzo. */
export function SceneCanvas(props: SceneCanvasProps) {
  return (
    <LimiteErrorWebGL onFallo={props.onFallo}>
      <LienzoEscena {...props} />
    </LimiteErrorWebGL>
  );
}

function LienzoEscena({ children, onListo }: SceneCanvasProps) {
  // Resolución y sombras según el rendimiento (sección 4.4 y auditoría P4-02): ver
  // `lib/escena/calidad.ts`.
  const [calidad, avisar] = useReducer(ajustarCalidad, CALIDAD_INICIAL);

  return (
    <Canvas
      className="absolute! inset-0"
      dpr={[DPR_REDUCIDO, calidad.dpr]}
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
      fallback={AVISO_SIN_WEBGL}
    >
      <PerformanceMonitor onDecline={() => avisar('baja')} onIncline={() => avisar('sube')}>
        <MonitorRendimiento />
        <ContextoCalidadEscena value={calidad}>{children}</ContextoCalidadEscena>
      </PerformanceMonitor>
    </Canvas>
  );
}
