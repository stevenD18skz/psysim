'use client';

import { useAnimations } from '@react-three/drei';
import { type ThreeEvent, useFrame } from '@react-three/fiber';
import { Suspense, useEffect, useMemo, useRef } from 'react';
import { type AnimationAction, type Group, LoopRepeat, MathUtils } from 'three';

import { iniciarConversacion, NOMBRE_OBJETO_NPC } from '@/components/3d/interaccion-paciente';
import { LimiteErrorModelo, useModeloGLB } from '@/components/3d/modelo-glb';
import { PacienteProcedural } from '@/components/3d/paciente-procedural';
import { Colisionable } from '@/components/3d/registro-colisiones';
import { clipParaEstado, DURACION_FUNDIDO_S } from '@/lib/escena/animaciones';
import { type Escena } from '@/schemas/escena.schema';
import { useAppStore, useAppStoreApi } from '@/store/app-store-provider';

type ConfigNpc = Escena['npc'];

/**
 * HU-11 · T01/T03, HU-14 · T03, HU-15 — Paciente GLB con esqueleto.
 *
 * Reproduce en bucle el clip que corresponde al estado del NPC (reposo, pensando, hablando) y
 * cambia entre ellos con `crossFadeTo` de 0,3 s. Los cambios se hacen en un `useEffect` que
 * escucha el estado de Zustand, nunca durante el render. Si el GLB no trae animaciones, respira
 * de forma procedural (escala suave en Y).
 */
function NpcGlbAnimado({ npc, ruta }: { npc: ConfigNpc; ruta: string }) {
  const { copia, escala, desplazamiento, animaciones } = useModeloGLB(ruta, npc.ajuste);
  const raiz = useMemo(() => ({ current: copia }), [copia]);
  const { actions, names } = useAnimations(animaciones, raiz);
  const estado = useAppStore(state => state.npc.estado);
  const actual = useRef<AnimationAction | null>(null);
  const respiracion = useRef<Group>(null);

  useEffect(() => {
    const nombre = clipParaEstado(estado, names, npc.animaciones);
    const siguiente = nombre ? actions[nombre] : null;
    if (!siguiente || siguiente === actual.current) return;

    siguiente.reset().setLoop(LoopRepeat, Infinity).play();
    if (actual.current) actual.current.crossFadeTo(siguiente, DURACION_FUNDIDO_S, false);
    actual.current = siguiente;
  }, [estado, actions, names, npc.animaciones]);

  useFrame(({ clock }) => {
    if (names.length > 0 || !respiracion.current) return;
    const fase = Math.sin((clock.elapsedTime * 2 * Math.PI) / 4.2);
    respiracion.current.scale.y = 1 + fase * 0.006;
  });

  return (
    <group ref={respiracion}>
      <group scale={escala} position={desplazamiento}>
        <primitive object={copia} />
      </group>
    </group>
  );
}

/**
 * Paciente virtual posicionado según el JSON de la escena (HU-11 · T02). Usa el GLB si está
 * definido y, si no (o si falla), la figura procedural. Un clic sobre él, estando cerca, inicia
 * la conversación (HU-13 · T01).
 */
export function NPCModel({ npc }: { npc: ConfigNpc }) {
  const store = useAppStoreApi();
  const puedeConversar = useAppStore(state => state.npc.estado === 'inactivo');

  const procedural = (
    <Colisionable id="npc">
      <PacienteProcedural npc={npc} />
    </Colisionable>
  );

  const alHacerClic = (evento: ThreeEvent<MouseEvent>) => {
    evento.stopPropagation();
    iniciarConversacion(store);
  };

  return (
    <group
      name={NOMBRE_OBJETO_NPC}
      position={npc.posicion}
      rotation-y={MathUtils.degToRad(npc.rotacion)}
      scale={npc.escala}
      onClick={alHacerClic}
      onPointerOver={() => {
        if (puedeConversar) document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        document.body.style.cursor = '';
      }}
    >
      {npc.modelo ? (
        <LimiteErrorModelo ruta={npc.modelo} fallback={procedural}>
          <Suspense fallback={null}>
            {/* Dentro del Suspense: la colisión se calcula cuando el GLB ya está cargado. */}
            <Colisionable id="npc">
              <NpcGlbAnimado npc={npc} ruta={npc.modelo} />
            </Colisionable>
          </Suspense>
        </LimiteErrorModelo>
      ) : (
        procedural
      )}
    </group>
  );
}
