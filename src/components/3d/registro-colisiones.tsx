'use client';

import { createContext, type ReactNode, use, useLayoutEffect, useRef, useState } from 'react';
import { Box3, type Group } from 'three';

import { type CajaXZ } from '@/lib/escena/colisiones';

/**
 * Registro de obstáculos de la escena. Se guarda en un `Map` mutable (no en estado de React)
 * porque lo lee el bucle de render en cada fotograma y no debe provocar re-renderizados.
 */
export interface RegistroColisiones {
  obstaculos: Map<string, CajaXZ>;
}

const RegistroContext = createContext<RegistroColisiones | null>(null);

export function RegistroColisionesProvider({ children }: { children: ReactNode }) {
  const [registro] = useState<RegistroColisiones>(() => ({ obstaculos: new Map() }));
  return <RegistroContext value={registro}>{children}</RegistroContext>;
}

export function useRegistroColisiones(): RegistroColisiones {
  const registro = use(RegistroContext);
  if (!registro) {
    throw new Error('useRegistroColisiones debe usarse dentro de <RegistroColisionesProvider>.');
  }
  return registro;
}

/** Holgura añadida a cada caja para que el estudiante no roce visualmente los muebles. */
const MARGEN = 0.05;

interface ColisionableProps {
  id: string;
  activo?: boolean;
  children: ReactNode;
}

/**
 * Envuelve un objeto de la escena y registra su caja delimitadora en el plano XZ, calculada
 * con su geometría real en coordenadas del mundo (sirve igual para piezas procedurales y GLB).
 * Debe montarse cuando el contenido ya está cargado (dentro del mismo `Suspense`).
 */
export function Colisionable({ id, activo = true, children }: ColisionableProps) {
  const grupo = useRef<Group>(null);
  const { obstaculos } = useRegistroColisiones();

  useLayoutEffect(() => {
    const objeto = grupo.current;
    if (!activo || !objeto) return;

    objeto.updateWorldMatrix(true, true);
    const caja = new Box3().setFromObject(objeto);
    if (caja.isEmpty()) return;

    obstaculos.set(id, {
      minX: caja.min.x - MARGEN,
      maxX: caja.max.x + MARGEN,
      minZ: caja.min.z - MARGEN,
      maxZ: caja.max.z + MARGEN,
    });
    return () => {
      obstaculos.delete(id);
    };
  }, [id, activo, obstaculos]);

  return <group ref={grupo}>{children}</group>;
}
