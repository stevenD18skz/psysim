import { act, renderHook } from '@testing-library/react';
import { type ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { registrarActividad } from '@/lib/escenarios/actions';
import { AppStoreProvider, useAppStoreApi } from '@/store/app-store-provider';

import {
  AVISO_INACTIVIDAD_MS,
  INTERVALO_LATIDO_MS,
  LIMITE_INACTIVIDAD_MS,
  segundosParaCierre,
  useInactividad,
} from './use-inactividad';

vi.mock('@/lib/escenarios/actions', () => ({ registrarActividad: vi.fn() }));

const SESION_ID = '44444444-4444-4444-8444-444444444444';

function envoltorio({ children }: { children: ReactNode }) {
  return <AppStoreProvider>{children}</AppStoreProvider>;
}

function montar(alVencer = vi.fn(async () => true), activo = true) {
  const hook = renderHook(
    ({ activo }) => useInactividad({ sesionId: SESION_ID, activo, alVencer }),
    { wrapper: envoltorio, initialProps: { activo } }
  );
  return { ...hook, alVencer };
}

/** Avanza el reloj y deja que se resuelvan las promesas pendientes (latidos). */
async function avanzar(ms: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

describe('segundosParaCierre', () => {
  it.each([
    [0, null],
    [AVISO_INACTIVIDAD_MS - 1, null],
    [AVISO_INACTIVIDAD_MS, 60],
    [LIMITE_INACTIVIDAD_MS - 1500, 2],
    [LIMITE_INACTIVIDAD_MS, 0],
    [LIMITE_INACTIVIDAD_MS * 3, 0],
  ])('%i ms sin interacción → %s', (inactivo, esperado) => {
    expect(segundosParaCierre(inactivo)).toBe(esperado);
  });
});

describe('useInactividad', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.mocked(registrarActividad).mockResolvedValue({ ok: true, datos: { enCurso: true } });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('registra actividad al abrir la simulación', async () => {
    montar();
    await avanzar(0);
    expect(registrarActividad).toHaveBeenCalledExactlyOnceWith({ sesionId: SESION_ID });
  });

  it('avisa en el último minuto y cierra la sesión a los 10 minutos sin interacción', async () => {
    const { result, alVencer } = montar();

    await avanzar(AVISO_INACTIVIDAD_MS - 1000);
    expect(result.current).toBeNull();

    await avanzar(1000);
    expect(result.current).toBe(60);
    expect(alVencer).not.toHaveBeenCalled();

    await avanzar(60_000);
    expect(result.current).toBe(0);
    expect(alVencer).toHaveBeenCalledOnce();
    // Sin interacción no hay latidos: solo el de la apertura.
    expect(registrarActividad).toHaveBeenCalledOnce();
  });

  it('cualquier interacción descarta el aviso y envía un latido', async () => {
    const { result, alVencer } = montar();
    await avanzar(AVISO_INACTIVIDAD_MS + 5000);
    expect(result.current).not.toBeNull();

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }));
    await avanzar(1000);

    expect(result.current).toBeNull();
    expect(registrarActividad).toHaveBeenCalledTimes(2);
    await avanzar(AVISO_INACTIVIDAD_MS - 5000);
    expect(alVencer).not.toHaveBeenCalled();
  });

  it('agrupa la interacción continua en un latido cada 30 s', async () => {
    montar();
    await avanzar(0);
    for (let s = 0; s < 90; s++) {
      window.dispatchEvent(new Event('pointermove'));
      await avanzar(1000);
    }
    // Apertura + 3 latidos (a los 30, 60 y 90 s).
    expect(registrarActividad).toHaveBeenCalledTimes(1 + 90_000 / INTERVALO_LATIDO_MS);
  });

  it('esperar la respuesta del paciente cuenta como actividad', async () => {
    const alVencer = vi.fn(async () => true);
    const { result } = renderHook(
      () => ({
        store: useAppStoreApi(),
        restantes: useInactividad({ sesionId: SESION_ID, activo: true, alVencer }),
      }),
      { wrapper: envoltorio }
    );
    act(() => {
      const { npc } = result.current.store.getState();
      npc.actualizarEstadoNPC('esperando_input');
      npc.actualizarEstadoNPC('procesando');
    });

    await avanzar(LIMITE_INACTIVIDAD_MS * 2);
    expect(result.current.restantes).toBeNull();
    expect(alVencer).not.toHaveBeenCalled();
  });

  it('si la base de datos ya cerró la sesión, muestra el cierre al instante', async () => {
    vi.mocked(registrarActividad).mockResolvedValue({ ok: true, datos: { enCurso: false } });
    const { alVencer } = montar();
    await avanzar(0);
    expect(alVencer).toHaveBeenCalledOnce();
  });

  it('reintenta el cierre si falla', async () => {
    const alVencer = vi.fn(async () => false);
    montar(alVencer);
    await avanzar(LIMITE_INACTIVIDAD_MS);
    expect(alVencer).toHaveBeenCalledOnce();
    await avanzar(15_000);
    expect(alVencer).toHaveBeenCalledTimes(2);
  });

  it('inactivo, no vigila ni envía latidos', async () => {
    const { result, alVencer } = montar(undefined, false);
    await avanzar(LIMITE_INACTIVIDAD_MS * 2);
    expect(result.current).toBeNull();
    expect(alVencer).not.toHaveBeenCalled();
    expect(registrarActividad).not.toHaveBeenCalled();
  });
});
