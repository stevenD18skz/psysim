import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ESPERA_ATASCADA_MS, LoadingScreen } from './loading-screen';

const progreso = vi.hoisted(() => ({ progress: 0, active: true }));
vi.mock('@react-three/drei', () => ({ useProgress: () => progreso }));

describe('LoadingScreen', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    progreso.progress = 40;
  });
  afterEach(() => vi.useRealTimers());

  it('si la carga no avanza, ofrece recargar o volver a Mis prácticas', () => {
    render(<LoadingScreen visible titulo="Duelo" competencia="Empatía" />);
    expect(screen.queryByRole('alert')).toBeNull();

    act(() => vi.advanceTimersByTime(ESPERA_ATASCADA_MS));
    expect(screen.getByRole('alert')).toHaveTextContent(/tardando más de lo normal/);
    expect(screen.getByRole('button', { name: 'Recargar' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ir a Mis prácticas' })).toHaveAttribute(
      'href',
      '/practicas'
    );
  });

  it('mientras la carga avanza no muestra el aviso', () => {
    const { rerender } = render(<LoadingScreen visible titulo="Duelo" competencia="Empatía" />);
    act(() => vi.advanceTimersByTime(ESPERA_ATASCADA_MS - 1000));
    progreso.progress = 60;
    rerender(<LoadingScreen visible titulo="Duelo" competencia="Empatía" />);
    act(() => vi.advanceTimersByTime(2000));
    expect(screen.queryByRole('alert')).toBeNull();
  });
});
