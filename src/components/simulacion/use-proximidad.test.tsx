import { act, renderHook } from '@testing-library/react';
import { type ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AppStoreProvider, useAppStoreApi } from '@/store/app-store-provider';

import { INTERVALO_MUESTREO_MS, useMuestreoProximidad } from './use-proximidad';

// El motor 3D publica la distancia en este store; aquí se controla a mano.
const { interaccionStore } = vi.hoisted(() => {
  const estado = { distancia: Infinity };
  return {
    interaccionStore: {
      getState: () => estado,
      fijar: (metros: number) => {
        estado.distancia = metros;
      },
    },
  };
});
vi.mock('@/components/3d/interaccion-paciente', () => ({ interaccionStore }));

function envoltorio({ children }: { children: ReactNode }) {
  return <AppStoreProvider>{children}</AppStoreProvider>;
}

function montar(activo: boolean) {
  return renderHook(
    ({ activo }) => {
      useMuestreoProximidad(activo);
      return useAppStoreApi();
    },
    { wrapper: envoltorio, initialProps: { activo } }
  );
}

function avanzar(ms: number) {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

describe('useMuestreoProximidad (HU-18 · T03)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    interaccionStore.fijar(Infinity);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('anota la distancia al paciente en cada intervalo', () => {
    const { result } = montar(true);
    interaccionStore.fijar(2);
    avanzar(INTERVALO_MUESTREO_MS);
    interaccionStore.fijar(4);
    avanzar(INTERVALO_MUESTREO_MS);

    expect(result.current.getState().metricas).toMatchObject({
      proximidadSuma: 6,
      proximidadMuestras: 2,
    });
  });

  it('no anota nada antes del primer intervalo', () => {
    const { result } = montar(true);
    interaccionStore.fijar(2);
    avanzar(INTERVALO_MUESTREO_MS - 1);
    expect(result.current.getState().metricas.proximidadMuestras).toBe(0);
  });

  it('mientras la escena no publica una distancia (Infinity) no hay muestras', () => {
    const { result } = montar(true);
    avanzar(INTERVALO_MUESTREO_MS * 3);
    expect(result.current.getState().metricas.proximidadMuestras).toBe(0);
  });

  it('inactivo no mide, y deja de medir al desactivarse', () => {
    const { result, rerender } = montar(false);
    interaccionStore.fijar(2);
    avanzar(INTERVALO_MUESTREO_MS * 2);
    expect(result.current.getState().metricas.proximidadMuestras).toBe(0);

    rerender({ activo: true });
    avanzar(INTERVALO_MUESTREO_MS);
    expect(result.current.getState().metricas.proximidadMuestras).toBe(1);

    rerender({ activo: false });
    avanzar(INTERVALO_MUESTREO_MS * 5);
    expect(result.current.getState().metricas.proximidadMuestras).toBe(1);
  });
});
