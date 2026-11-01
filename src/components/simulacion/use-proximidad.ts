'use client';

import { useEffect } from 'react';

import { interaccionStore } from '@/components/3d/interaccion-paciente';
import { useAppStoreApi } from '@/store/app-store-provider';

/** Cada cuánto se anota la distancia al paciente. Suficiente para promediar sin cargar el store. */
export const INTERVALO_MUESTREO_MS = 2000;

/**
 * HU-18 · T03 — Mide en silencio qué tan cerca está el estudiante del paciente: cada
 * `INTERVALO_MUESTREO_MS` toma la distancia que calcula el motor 3D (`interaccionStore`) y la
 * anota en el store de métricas. Solo corre mientras la práctica está abierta (`activo`).
 */
export function useMuestreoProximidad(activo: boolean) {
  const store = useAppStoreApi();

  useEffect(() => {
    if (!activo) return;
    const intervalo = setInterval(() => {
      store.getState().metricas.registrarProximidad(interaccionStore.getState().distancia);
    }, INTERVALO_MUESTREO_MS);
    return () => clearInterval(intervalo);
  }, [activo, store]);
}
