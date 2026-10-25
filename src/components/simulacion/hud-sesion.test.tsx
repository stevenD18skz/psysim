import { act, render, renderHook, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { AppStoreProvider, useAppStoreApi } from '@/store/app-store-provider';

import { SESION_ACTIVA } from '../../../test/fixtures';

import { HudSesion } from './hud-sesion';

type Props = React.ComponentProps<typeof HudSesion>;

function renderizar(props: Partial<Props> = {}) {
  return render(
    <AppStoreProvider>
      <HudSesion sesion={SESION_ACTIVA} {...props} />
    </AppStoreProvider>
  );
}

/** El HUD y un hook que expone el store del mismo provider, para cambiar el estado del paciente. */
function renderizarConStore() {
  const envoltorio = ({ children }: { children: React.ReactNode }) => (
    <AppStoreProvider>
      <HudSesion sesion={SESION_ACTIVA} />
      {children}
    </AppStoreProvider>
  );
  return renderHook(() => useAppStoreApi(), { wrapper: envoltorio }).result;
}

describe('HudSesion (HU-17)', () => {
  it('muestra el caso, el paciente y el estado del paciente', () => {
    renderizar();

    expect(screen.getByRole('complementary', { name: 'Datos de la práctica' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Duelo y pérdida' })).toBeInTheDocument();
    expect(screen.getByText('Marta Lucía')).toBeInTheDocument();
    expect(screen.getByText(/58 años/)).toBeInTheDocument();
    expect(screen.getByTestId('estado-npc-hud')).toHaveTextContent('Esperando que te acerques');
  });

  it('el estado del paciente es una región de estado para los lectores de pantalla', () => {
    renderizar();
    expect(screen.getByRole('status')).toHaveTextContent('Esperando que te acerques');
  });

  it('el estado sigue los cambios del paciente', () => {
    const store = renderizarConStore();
    const estado = screen.getByTestId('estado-npc-hud');

    for (const [nuevo, texto] of [
      ['esperando_input', 'Escuchando'],
      ['procesando', 'Pensando…'],
      ['respondiendo', 'Respondiendo'],
      ['sesion_finalizada', 'Práctica terminada'],
    ] as const) {
      act(() => void store.current.getState().npc.actualizarEstadoNPC(nuevo));
      expect(estado).toHaveTextContent(texto);
    }
  });

  it('el cronómetro se detiene en la duración final de la práctica terminada', () => {
    renderizar({ duracionFinalSegundos: 125 });
    expect(screen.getByLabelText('Duración total de la práctica')).toHaveTextContent('02:05');
  });

  it('antes de comenzar el cronómetro dice «Sin iniciar»', () => {
    renderizar({ sesion: { ...SESION_ACTIVA, comenzada: false } });
    expect(screen.getByText('Sin iniciar')).toBeInTheDocument();
  });

  it('compacto (mientras se conversa) deja solo el caso y el tiempo', () => {
    renderizar({ duracionFinalSegundos: 61, compacto: true });
    expect(screen.getByRole('heading', { level: 1, name: 'Duelo y pérdida' })).toBeInTheDocument();
    expect(screen.queryByTestId('estado-npc-hud')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Duración total de la práctica')).toHaveTextContent('01:01');
  });
});
