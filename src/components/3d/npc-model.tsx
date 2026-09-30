'use client';

import { Suspense } from 'react';
import { MathUtils } from 'three';

import { LimiteErrorModelo, ModeloGLB } from '@/components/3d/modelo-glb';
import { PacienteProcedural } from '@/components/3d/paciente-procedural';
import { Colisionable } from '@/components/3d/registro-colisiones';
import { type Escena } from '@/schemas/escena.schema';

/**
 * Paciente virtual posicionado según el JSON de la escena (HU-09 · T05). Usa el GLB del
 * paciente si está definido y, si no, la figura procedural. Las animaciones del GLB y su
 * sincronización con el ciclo conversacional llegan en el Sprint 3 (HU-11, HU-15).
 */
export function NPCModel({ npc }: { npc: Escena['npc'] }) {
  const procedural = (
    <Colisionable id="npc">
      <PacienteProcedural npc={npc} />
    </Colisionable>
  );

  return (
    <group
      name="npc"
      position={npc.posicion}
      rotation-y={MathUtils.degToRad(npc.rotacion)}
      scale={npc.escala}
    >
      {npc.modelo ? (
        <LimiteErrorModelo ruta={npc.modelo} fallback={procedural}>
          <Suspense fallback={null}>
            {/* Dentro del Suspense: la colisión se calcula cuando el GLB ya está cargado. */}
            <Colisionable id="npc">
              <ModeloGLB ruta={npc.modelo} ajuste={npc.ajuste} />
            </Colisionable>
          </Suspense>
        </LimiteErrorModelo>
      ) : (
        procedural
      )}
    </group>
  );
}
