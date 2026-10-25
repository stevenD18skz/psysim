import { act, renderHook } from '@testing-library/react';
import { type ReactNode } from 'react';
import { toast } from 'sonner';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { guardarMetricas } from '@/lib/conversacion/guardar-metricas';
import { finalizarSesion } from '@/lib/escenarios/actions';
import { AppStoreProvider, useAppStoreApi } from '@/store/app-store-provider';

import { SESION_ACTIVA } from '../../../test/fixtures';

import { useFinalizarSesion } from './use-finalizar-sesion';

const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
  unstable_rethrow: vi.fn(),
}));
vi.mock('sonner', () => ({ toast: { error: vi.fn() } }));
vi.mock('@/lib/conversacion/guardar-metricas', () => ({ guardarMetricas: vi.fn() }));
vi.mock('@/lib/escenarios/actions', () => ({
  finalizarSesion: vi.fn(),
  cerrarSesionPorInactividad: vi.fn(),
}));

function envoltorio({ children }: { children: ReactNode }) {
  return (
    <AppStoreProvider estadoInicial={{ sesion: { activa: SESION_ACTIVA } }}>
      {children}
    </AppStoreProvider>
  );
}

function montar() {
  return renderHook(() => ({ cierre: useFinalizarSesion(), store: useAppStoreApi() }), {
    wrapper: envoltorio,
  });
}

const CIERRE_OK = {
  ok: true as const,
  datos: { inicio: '2026-10-20T15:00:00.000Z', fin: '2026-10-20T15:05:00.000Z' },
};

describe('useFinalizarSesion · finalizar (HU-20)', () => {
  beforeEach(() => {
    vi.mocked(guardarMetricas).mockResolvedValue({ estado: 'guardadas' });
    vi.mocked(finalizarSesion).mockResolvedValue(CIERRE_OK);
  });

  it('guarda las métricas, pasa el paciente a «sesion_finalizada» y abre los resultados', async () => {
    const { result } = montar();
    act(() => void result.current.store.getState().npc.actualizarEstadoNPC('esperando_input'));

    await act(async () => result.current.cierre.finalizar());

    expect(guardarMetricas).toHaveBeenCalledTimes(1);
    expect(finalizarSesion).not.toHaveBeenCalled();
    expect(result.current.store.getState().npc.estado).toBe('sesion_finalizada');
    expect(push).toHaveBeenCalledWith(`/resultados?sesion=${SESION_ACTIVA.id}`);
  });

  it('si ya estaba terminada (409) igual lleva a los resultados', async () => {
    vi.mocked(guardarMetricas).mockResolvedValue({ estado: 'ya_terminada' });
    const { result } = montar();

    await act(async () => result.current.cierre.finalizar());

    expect(finalizarSesion).not.toHaveBeenCalled();
    expect(push).toHaveBeenCalledWith(`/resultados?sesion=${SESION_ACTIVA.id}`);
  });

  it('si no se pueden guardar las métricas cierra la sesión sin ellas', async () => {
    vi.mocked(guardarMetricas).mockResolvedValue({ estado: 'fallo', motivo: 'sin conexión' });
    const { result } = montar();

    await act(async () => result.current.cierre.finalizar());

    expect(finalizarSesion).toHaveBeenCalledWith({ sesionId: SESION_ACTIVA.id });
    expect(push).toHaveBeenCalledWith(`/resultados?sesion=${SESION_ACTIVA.id}`);
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('si tampoco se puede cerrar, avisa y deja la práctica abierta', async () => {
    vi.mocked(guardarMetricas).mockResolvedValue({ estado: 'fallo', motivo: 'x' });
    vi.mocked(finalizarSesion).mockResolvedValue({ ok: false, error: 'No fue posible cerrar.' });
    const { result } = montar();

    await act(async () => result.current.cierre.finalizar());

    expect(toast.error).toHaveBeenCalledWith('No fue posible cerrar.');
    expect(push).not.toHaveBeenCalled();
    expect(result.current.store.getState().npc.estado).not.toBe('sesion_finalizada');
  });

  it('si la acción de cierre lanza (sin red) avisa de la conexión', async () => {
    vi.mocked(guardarMetricas).mockResolvedValue({ estado: 'fallo', motivo: 'x' });
    vi.mocked(finalizarSesion).mockRejectedValue(new Error('network'));
    const { result } = montar();

    await act(async () => result.current.cierre.finalizar());

    expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('revisa tu conexión'));
    expect(push).not.toHaveBeenCalled();
  });

  it('nunca cierra con una respuesta de la IA en camino', async () => {
    const { result } = montar();
    act(() => {
      const { npc } = result.current.store.getState();
      npc.actualizarEstadoNPC('esperando_input');
      npc.actualizarEstadoNPC('procesando');
    });

    await act(async () => result.current.cierre.finalizar());

    expect(guardarMetricas).not.toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
  });

  it('no cierra dos veces una práctica ya terminada', async () => {
    const { result } = montar();
    act(() => void result.current.store.getState().npc.actualizarEstadoNPC('sesion_finalizada'));

    await act(async () => result.current.cierre.finalizar());

    expect(guardarMetricas).not.toHaveBeenCalled();
  });

  it('sin sesión activa no hace nada', async () => {
    const { result } = renderHook(() => useFinalizarSesion(), {
      wrapper: ({ children }: { children: ReactNode }) => (
        <AppStoreProvider>{children}</AppStoreProvider>
      ),
    });

    await act(async () => result.current.finalizar());

    expect(guardarMetricas).not.toHaveBeenCalled();
  });
});
