'use client';

import { useGLTF } from '@react-three/drei';
import { Component, type ReactNode, useMemo } from 'react';
import { Box3, MathUtils, type Mesh, type Object3D } from 'three';
import { clone as clonarConEsqueleto } from 'three/examples/jsm/utils/SkeletonUtils.js';

import { calcularAjuste } from '@/lib/escena/ajuste';
import { RUTA_DRACO, resolverUrlModelo } from '@/lib/escena/modelos';
import { type AjusteModelo } from '@/schemas/escena.schema';

interface ModeloGLBProps {
  ruta: string;
  ajuste?: AjusteModelo;
}

/**
 * Carga un GLB (comprimido con Draco) con `useGLTF` y devuelve una copia lista para la escena:
 * con sombras y, si se indica, normalizada con `ajuste` (unidades, origen y orientación).
 *
 * `useGLTF` guarda cada archivo en caché: si un modelo se repite, se descarga una sola vez y
 * aquí se clona con `SkeletonUtils` para no romper los modelos con esqueleto (pacientes).
 */
export function useModeloGLB(ruta: string, ajuste?: AjusteModelo) {
  const { scene, animations } = useGLTF(resolverUrlModelo(ruta), RUTA_DRACO);

  const modelo = useMemo(() => {
    const objeto = clonarConEsqueleto(scene);
    objeto.traverse((hijo: Object3D) => {
      if ((hijo as Mesh).isMesh) {
        hijo.castShadow = true;
        hijo.receiveShadow = true;
      }
    });

    if (!ajuste) return { copia: objeto, escala: 1, desplazamiento: [0, 0, 0] as const };

    // Normaliza unidades y origen de modelos de terceros (ver `ajuste` en escena.schema.ts).
    objeto.rotation.y = MathUtils.degToRad(ajuste.girar);
    objeto.updateMatrixWorld(true);
    const caja = new Box3().setFromObject(objeto);
    const resultado = calcularAjuste({ min: caja.min.toArray(), max: caja.max.toArray() }, ajuste);
    return { copia: objeto, ...resultado };
  }, [scene, ajuste]);

  return { ...modelo, animaciones: animations };
}

/** HU-09 · T02 — Modelo GLB estático (muebles, entorno). */
export function ModeloGLB({ ruta, ajuste }: ModeloGLBProps) {
  const { copia, escala, desplazamiento } = useModeloGLB(ruta, ajuste);
  return (
    <group scale={escala} position={desplazamiento}>
      <primitive object={copia} />
    </group>
  );
}

/** Inicia la descarga de un modelo en segundo plano, antes de que se monte (HU-09 · T02). */
export function precargarModelo(ruta: string): void {
  useGLTF.preload(resolverUrlModelo(ruta), RUTA_DRACO);
}

interface LimiteErrorModeloProps {
  /** Contenido alternativo (p. ej. el mueble procedural) si el GLB no se puede cargar. */
  fallback: ReactNode;
  ruta: string;
  children: ReactNode;
}

interface LimiteErrorModeloState {
  fallo: boolean;
}

/**
 * Error boundary por modelo: un GLB ausente o corrupto no tumba la escena completa; se
 * sustituye por su versión procedural y se registra un aviso en consola.
 */
export class LimiteErrorModelo extends Component<LimiteErrorModeloProps, LimiteErrorModeloState> {
  state: LimiteErrorModeloState = { fallo: false };

  static getDerivedStateFromError(): LimiteErrorModeloState {
    return { fallo: true };
  }

  componentDidCatch(error: unknown) {
    console.warn(
      `[escena] No se pudo cargar el modelo "${this.props.ruta}"; se usa la versión procedural.`,
      error
    );
  }

  render() {
    return this.state.fallo ? this.props.fallback : this.props.children;
  }
}
