'use client';

import { Suspense } from 'react';
import { MathUtils } from 'three';

import { LimiteErrorModelo, ModeloGLB } from '@/components/3d/modelo-glb';
import { MuebleProcedural } from '@/components/3d/muebles-procedurales';
import { Colisionable } from '@/components/3d/registro-colisiones';
import { type Mueble as MuebleConfig } from '@/schemas/escena.schema';

/**
 * Un mueble de la escena. Si el JSON define `modelo`, se carga el GLB; si no existe o falla,
 * se dibuja la versión procedural del mismo tipo. En ambos casos registra su colisión.
 */
export function Mueble({ mueble }: { mueble: MuebleConfig }) {
  const procedural = (
    <Colisionable id={mueble.id} activo={mueble.colision}>
      <MuebleProcedural tipo={mueble.tipo} color={mueble.color} semilla={mueble.id} />
    </Colisionable>
  );

  return (
    <group
      position={mueble.posicion}
      rotation-y={MathUtils.degToRad(mueble.rotacion)}
      scale={mueble.escala}
    >
      {mueble.modelo ? (
        <LimiteErrorModelo ruta={mueble.modelo} fallback={procedural}>
          <Suspense fallback={null}>
            <Colisionable id={mueble.id} activo={mueble.colision}>
              <ModeloGLB ruta={mueble.modelo} ajuste={mueble.ajuste} />
            </Colisionable>
          </Suspense>
        </LimiteErrorModelo>
      ) : (
        procedural
      )}
    </group>
  );
}
