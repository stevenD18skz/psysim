'use client';

import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import { Raycaster, Vector2 } from 'three';
import { useStore } from 'zustand';
import { createStore } from 'zustand/vanilla';

import { DISTANCIA_INTERACCION, distanciaXZ } from '@/lib/escena/encuadre';
import { type Escena } from '@/schemas/escena.schema';
import { type AppStore } from '@/store/app-store';

/** Nombre del objeto del paciente en la escena (lo asigna `NPCModel`). */
export const NOMBRE_OBJETO_NPC = 'npc';

interface EstadoInteraccion {
  /** El estudiante está lo bastante cerca para conversar. */
  cerca: boolean;
  /** La mira (centro de la pantalla) apunta al paciente. */
  apuntando: boolean;
  /** Distancia al paciente en el plano del suelo (m), con resolución de 0,25 m. */
  distancia: number;
}

const estadoInicial: EstadoInteraccion = { cerca: false, apuntando: false, distancia: Infinity };

/** Estado de la interacción con el paciente, compartido entre la escena 3D y la interfaz. */
export const interaccionStore = createStore<EstadoInteraccion>(() => estadoInicial);

export function useInteraccion<T>(selector: (estado: EstadoInteraccion) => T): T {
  return useStore(interaccionStore, selector);
}

/** Cada cuántos fotogramas se recalcula la interacción (no hace falta en todos). */
const CADA_N_FOTOGRAMAS = 3;
const RESOLUCION_DISTANCIA = 0.25;

/**
 * HU-13 · T01 — Detecta si el estudiante puede iniciar la conversación: calcula la distancia
 * al paciente y lanza un rayo desde el centro de la pantalla (la mira del modo primera persona).
 * Solo publica cambios, así la interfaz no se re-renderiza en cada fotograma.
 */
export function InteraccionPaciente({ npc }: { npc: Escena['npc'] }) {
  const raycaster = useMemo(() => new Raycaster(), []);
  const centro = useMemo(() => new Vector2(0, 0), []);
  const contador = useRef(0);

  useEffect(() => () => interaccionStore.setState(estadoInicial), []);

  useFrame(({ camera, scene }) => {
    contador.current = (contador.current + 1) % CADA_N_FOTOGRAMAS;
    if (contador.current !== 0) return;

    const distancia = distanciaXZ(camera.position.toArray(), npc.posicion);
    const cerca = distancia <= DISTANCIA_INTERACCION;

    let apuntando = false;
    const objeto = cerca ? scene.getObjectByName(NOMBRE_OBJETO_NPC) : undefined;
    if (objeto) {
      raycaster.setFromCamera(centro, camera);
      apuntando = raycaster.intersectObject(objeto, true).length > 0;
    }

    const actual = interaccionStore.getState();
    if (
      actual.cerca !== cerca ||
      actual.apuntando !== apuntando ||
      Math.abs(actual.distancia - distancia) >= RESOLUCION_DISTANCIA
    ) {
      interaccionStore.setState({ cerca, apuntando, distancia });
    }
  });

  return null;
}

/**
 * Inicia la conversación (NPC `inactivo` → `esperando_input`) si el estudiante está cerca del
 * paciente. Devuelve si se inició.
 */
export function iniciarConversacion(store: AppStore): boolean {
  const { npc, sesion } = store.getState();
  if (!sesion.activa?.comenzada) return false;
  if (npc.estado !== 'inactivo' || !interaccionStore.getState().cerca) return false;
  return npc.actualizarEstadoNPC('esperando_input');
}
