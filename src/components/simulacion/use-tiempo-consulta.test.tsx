import { act, render, renderHook, screen } from '@testing-library/react';
import { type ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { consultarTiempo } from '@/lib/escenarios/actions';
import { GRACIA_CONSULTA_S } from '@/lib/sesiones/tiempo-consulta';
import { AppStoreProvider, useAppStoreApi } from '@/store/app-store-provider';

import { IndicadorConsulta } from './hud-sesion';
import { useFinPorTiempo } from './use-tiempo-consulta';

vi.mock('@/lib/escenarios/actions', () => ({ consultarTiempo: vi.fn() }));

const SESION_ID = '44444444-4444-4444-8444-444444444444';
const QUINCE_MIN = 15 * 60;

/** El componente (o el hook) y el store del mismo provider, para fijar el tiempo de consulta. */
function montar({ indicador = false, activo = true } = {}) {
  const envoltorio = ({ children }: { children: ReactNode }) => (
    <AppStoreProvider>
      {indicador && <IndicadorConsulta />}
      {children}
    </AppStoreProvider>
  );
  return renderHook(
    ({ activo }) => {
      useFinPorTiempo({ sesionId: SESION_ID, activo: !indicador && activo });
      return useAppStoreApi();
    },
    { wrapper: envoltorio, initialProps: { activo } }
  );
}

/** El servidor informa cuánto lleva la consulta, medido «ahora» con el reloj falso. */
function fijar(store: ReturnType<typeof useAppStoreApi>, transcurridoS: number | null) {
  act(() => {
    store
      .getState()
      .conversacion.actualizarConsulta({ duracionS: QUINCE_MIN, transcurridoS }, performance.now());
  });
}

async function avanzar(ms: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

beforeEach(() => {
  vi.useFakeTimers({
    toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date', 'performance'],
  });
  vi.mocked(consultarTiempo).mockReset();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('IndicadorConsulta', () => {
  it('antes de la primera intervención dice cuánto dura la consulta', () => {
    const { result } = montar({ indicador: true });
    fijar(result.current, null);
    expect(screen.getByTestId('tiempo-consulta')).toHaveTextContent('Consulta de 15 minutos');
  });

  it('avisa a los 3 minutos del final e invita a cerrar al cumplirse, sin cuenta de segundos', async () => {
    const { result } = montar({ indicador: true });
    fijar(result.current, QUINCE_MIN - 200);
    const indicador = () => screen.getByTestId('tiempo-consulta');
    expect(indicador()).toHaveTextContent('Quedan 4 minutos de consulta');
    expect(indicador()).toHaveAttribute('data-fase', 'en_curso');

    // El reloj monotónico avanza: a los 3 minutos del final, el aviso sobrio.
    await avanzar(20_000);
    expect(indicador()).toHaveAttribute('data-fase', 'por_terminar');
    expect(screen.getByRole('status')).toHaveTextContent('Quedan 3 minutos de consulta');

    await avanzar(180_000);
    expect(indicador()).toHaveAttribute('data-fase', 'cumplida');
    expect(indicador()).toHaveTextContent('Es momento de cerrar la consulta');
    expect(indicador()).not.toHaveTextContent(/\d+:\d+|segundos/);
  });

  it('sin dato del servidor no muestra nada', () => {
    render(
      <AppStoreProvider>
        <IndicadorConsulta />
      </AppStoreProvider>
    );
    expect(screen.queryByTestId('tiempo-consulta')).not.toBeInTheDocument();
  });
});

describe('useFinPorTiempo', () => {
  it('pasado el margen, termina la práctica por tiempo cuando el servidor lo confirma', async () => {
    vi.mocked(consultarTiempo).mockResolvedValue({
      ok: true,
      datos: {
        duracionS: QUINCE_MIN,
        transcurridoS: QUINCE_MIN + GRACIA_CONSULTA_S + 1,
        fin: 'tiempo',
      },
    });
    const { result } = montar();
    fijar(result.current, QUINCE_MIN + GRACIA_CONSULTA_S - 2);
    expect(consultarTiempo).not.toHaveBeenCalled();

    await avanzar(3000);
    expect(consultarTiempo).toHaveBeenCalledWith({ sesionId: SESION_ID });
    expect(result.current.getState().conversacion.cierre).toBe('tiempo');
  });

  it('el reloj del navegador no decide: si el servidor dice que aún queda, la práctica sigue', async () => {
    vi.mocked(consultarTiempo).mockResolvedValue({
      ok: true,
      datos: { duracionS: QUINCE_MIN, transcurridoS: QUINCE_MIN },
    });
    const { result } = montar();
    fijar(result.current, QUINCE_MIN + GRACIA_CONSULTA_S + 60);

    await avanzar(10);
    expect(consultarTiempo).toHaveBeenCalledOnce();
    const { conversacion } = result.current.getState();
    expect(conversacion.cierre).toBeNull();
    // Se corrige lo que se muestra con el dato del servidor.
    expect(conversacion.consulta).toMatchObject({ transcurridoS: QUINCE_MIN });
  });

  it('si no puede preguntar, lo vuelve a intentar más tarde sin terminar la práctica', async () => {
    vi.mocked(consultarTiempo)
      .mockRejectedValueOnce(new Error('sin conexión'))
      .mockResolvedValue({
        ok: true,
        datos: {
          duracionS: QUINCE_MIN,
          transcurridoS: QUINCE_MIN + GRACIA_CONSULTA_S + 20,
          fin: 'tiempo',
        },
      });
    const { result } = montar();
    fijar(result.current, QUINCE_MIN + GRACIA_CONSULTA_S);

    await avanzar(10);
    expect(result.current.getState().conversacion.cierre).toBeNull();
    await avanzar(15_000);
    expect(consultarTiempo).toHaveBeenCalledTimes(2);
    expect(result.current.getState().conversacion.cierre).toBe('tiempo');
  });

  it('fuera de la consulta (instrucciones, resultados o cierre) no pregunta', async () => {
    const { result } = montar({ activo: false });
    fijar(result.current, QUINCE_MIN + GRACIA_CONSULTA_S + 60);
    await avanzar(30_000);
    expect(consultarTiempo).not.toHaveBeenCalled();
  });
});
