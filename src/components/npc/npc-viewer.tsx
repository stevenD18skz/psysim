'use client';

import { OrbitControls } from '@react-three/drei';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { type RefObject, useEffect, useRef, useState } from 'react';
import { type DirectionalLight, PCFShadowMap, type PerspectiveCamera } from 'three';

import { type NpcControlador } from '@/hooks/use-npc-controller';
import { type ControlesOrbita } from '@/lib/npc/controlador-npc';

/** Elementos HTML que se actualizan en cada fotograma sin re-renderizar React. */
export interface RefsOverlay {
  globo: RefObject<HTMLDivElement | null>;
  barra: RefObject<HTMLSpanElement | null>;
  meta: RefObject<HTMLSpanElement | null>;
}

/** Encuadra la cámara al montar y cada vez que se pulsa "Centrar personaje y cámara". */
function Encuadre({
  npc,
  luz,
  onSuelo,
}: {
  npc: NpcControlador;
  luz: RefObject<DirectionalLight | null>;
  onSuelo: (y: number) => void;
}) {
  const obtenerEstado = useThree(state => state.get);
  const hayControles = useThree(state => state.controls !== null);
  const { controlador, estado } = npc;

  useEffect(() => {
    const { camera, controls } = obtenerEstado();
    if (!controls) return;
    const suelo = controlador.encuadrar(
      camera as PerspectiveCamera,
      controls as unknown as ControlesOrbita,
      luz.current
    );
    if (suelo !== null) onSuelo(suelo);
  }, [obtenerEstado, hayControles, controlador, luz, onSuelo, estado.versionEncuadre]);

  return null;
}

/** Avanza la animación y pinta el HUD y el globo en cada fotograma. */
function BucleFotograma({
  controlador,
  overlay,
}: {
  controlador: NpcControlador['controlador'];
  overlay: RefsOverlay;
}) {
  useFrame(({ camera, size }, delta) => {
    controlador.avanzar(Math.min(delta, 0.1));
    controlador.pintarOverlay(
      { globo: overlay.globo.current, barra: overlay.barra.current, meta: overlay.meta.current },
      camera,
      size.width,
      size.height
    );
  });
  return null;
}

interface NpcViewerProps {
  npc: NpcControlador;
  overlay: RefsOverlay;
  /** Color de fondo de la escena. */
  fondo?: string;
}

/**
 * Visor 3D del NPC: luces de estudio neutras (hemisférica + principal con sombra + relleno),
 * sombra suave en el suelo, OrbitControls (arrastrar para orbitar, rueda para acercar, clic
 * derecho para desplazar) y encuadre automático.
 */
export function NpcViewer({ npc, overlay, fondo = '#f3efe8' }: NpcViewerProps) {
  const luzPrincipal = useRef<DirectionalLight>(null);
  const [sueloY, setSueloY] = useState(0);
  const { controlador, estado } = npc;

  return (
    <Canvas
      // Sin tone mapping: mantiene exactamente los colores del prototipo.
      flat
      shadows={{ type: PCFShadowMap }}
      dpr={[1, 2]}
      camera={{ fov: 45, near: 0.01, far: 500, position: [3, 2.2, 4] }}
      gl={{ antialias: true }}
      aria-label="Vista 3D del NPC"
      role="img"
    >
      <color attach="background" args={[fondo]} />
      <hemisphereLight args={[0xffffff, 0xd8d2c4, 1]} />
      <directionalLight
        ref={luzPrincipal}
        position={[4, 7, 5]}
        intensity={2.2}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0002}
      />
      <directionalLight position={[-5, 3, -4]} intensity={0.5} color={0xfff4e6} />

      <mesh rotation-x={-Math.PI / 2} position-y={sueloY} receiveShadow>
        <planeGeometry args={[200, 200]} />
        <shadowMaterial opacity={0.18} />
      </mesh>

      <primitive object={controlador.modelo} />
      <primitive object={controlador.esqueletoVisible} />
      <primitive object={controlador.articulaciones} />

      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.08}
        autoRotate={estado.interruptores.autogirar}
        autoRotateSpeed={1.2}
      />
      <Encuadre npc={npc} luz={luzPrincipal} onSuelo={setSueloY} />
      <BucleFotograma controlador={controlador} overlay={overlay} />
    </Canvas>
  );
}
