'use client';

import { Html, OrbitControls, useGLTF } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { Component, type ReactNode, Suspense, useMemo } from 'react';
import { Box3, Vector3 } from 'three';

import { RUTA_DRACO } from '@/lib/escena/modelos';

import { type ModeloGaleria } from './galeria-modelos';

const SEPARACION = 1.8;

function Normalizado({ url }: { url: string }) {
  const { scene } = useGLTF(url, RUTA_DRACO);
  const { objeto, escala, desplazamiento, medidas } = useMemo(() => {
    const copia = scene.clone(true);
    const caja = new Box3().setFromObject(copia);
    const tam = caja.getSize(new Vector3());
    const mayor = Math.max(tam.x, tam.y, tam.z) || 1;
    const e = 1 / mayor;
    const centro = caja.getCenter(new Vector3());
    return {
      objeto: copia,
      escala: e,
      desplazamiento: [-centro.x * e, -caja.min.y * e, -centro.z * e] as [number, number, number],
      medidas: `${tam.x.toFixed(2)}×${tam.y.toFixed(2)}×${tam.z.toFixed(2)}`,
    };
  }, [scene]);

  return (
    <>
      <group scale={escala} position={desplazamiento}>
        <primitive object={objeto} />
      </group>
      <Html position={[0, -0.12, 0.6]} center distanceFactor={6}>
        <span className="font-mono text-[10px] whitespace-nowrap text-stone-500">{medidas}</span>
      </Html>
    </>
  );
}

class LimiteError extends Component<{ children: ReactNode }, { fallo: boolean }> {
  state = { fallo: false };
  static getDerivedStateFromError() {
    return { fallo: true };
  }
  render() {
    return this.state.fallo ? (
      <mesh position-y={0.25}>
        <boxGeometry args={[0.5, 0.5, 0.5]} />
        <meshStandardMaterial color="red" wireframe />
      </mesh>
    ) : (
      this.props.children
    );
  }
}

export default function LienzoGaleria({ modelos }: { modelos: ModeloGaleria[] }) {
  const columnas = Math.ceil(Math.sqrt(modelos.length));

  return (
    <Canvas
      camera={{ position: [columnas, columnas * 1.2, columnas * 1.6], fov: 45 }}
      dpr={[1, 1.5]}
    >
      <color attach="background" args={['#efe6da']} />
      <ambientLight intensity={0.6} />
      <hemisphereLight intensity={0.8} color="#fff4e6" groundColor="#8a6f5a" />
      <directionalLight position={[5, 10, 8]} intensity={1.8} />
      <gridHelper args={[columnas * SEPARACION + 2, columnas + 1, '#b9a58f', '#d8c9b6']} />
      {modelos.map((modelo, i) => {
        const x = ((i % columnas) - (columnas - 1) / 2) * SEPARACION;
        const z = (Math.floor(i / columnas) - (columnas - 1) / 2) * SEPARACION;
        return (
          <group key={modelo.url} position={[x, 0, z]}>
            <LimiteError>
              <Suspense fallback={null}>
                <Normalizado url={modelo.url} />
              </Suspense>
            </LimiteError>
            {/* Flecha que apunta hacia +Z: el frente esperado de cada modelo. */}
            <mesh position={[0, 0.02, 0.62]} rotation-x={Math.PI / 2}>
              <coneGeometry args={[0.06, 0.16, 12]} />
              <meshBasicMaterial color="#d9412b" />
            </mesh>
            <Html position={[0, 1.15, 0]} center distanceFactor={6}>
              <span className="rounded bg-white/85 px-1.5 py-0.5 font-mono text-[11px] whitespace-nowrap text-stone-800 shadow-sm">
                {i}. {modelo.nombre}
              </span>
            </Html>
          </group>
        );
      })}
      <OrbitControls makeDefault target={[0, 0, 0]} />
    </Canvas>
  );
}
