import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import { comprobarActividadSesion } from '@/lib/auth/actividad-sesion';
import { CLAVE_CUENTA_ACTIVA } from '@/lib/datos-locales';

import { VigilarSesion } from './vigilar-sesion';

vi.mock('@/lib/auth/actividad-sesion', () => ({ comprobarActividadSesion: vi.fn() }));

const comprobar = vi.mocked(comprobarActividadSesion);
const cuentaId = 'docente-prueba';

beforeEach(() => {
  vi.useFakeTimers();
  localStorage.clear();
  comprobar.mockReset();
});

afterEach(() => vi.useRealTimers());

async function abrir() {
  render(
    <VigilarSesion cuentaId={cuentaId} segundosRestantes={120}>
      <p>Borrador privado</p>
    </VigilarSesion>
  );
  await act(async () => Promise.resolve());
}

it('al vencer el plazo comprueba la sesión sin extenderla y desmonta el panel', async () => {
  comprobar.mockResolvedValueOnce(120).mockResolvedValueOnce(null);
  await abrir();
  expect(screen.getByText('Borrador privado')).toBeVisible();

  await act(async () => vi.advanceTimersByTimeAsync(120_000));
  expect(comprobar.mock.calls).toEqual([
    [cuentaId, false],
    [cuentaId, false],
  ]);
  expect(screen.queryByText('Borrador privado')).not.toBeInTheDocument();
});

it('desmonta la vista anterior cuando otra pestaña abre una cuenta diferente', async () => {
  comprobar.mockResolvedValue(120);
  await abrir();
  expect(localStorage.getItem(CLAVE_CUENTA_ACTIVA)).toBe(cuentaId);

  fireEvent(window, new StorageEvent('storage', { key: CLAVE_CUENTA_ACTIVA, newValue: cuentaId }));
  expect(screen.getByText('Borrador privado')).toBeVisible();
  fireEvent(
    window,
    new StorageEvent('storage', { key: CLAVE_CUENTA_ACTIVA, newValue: 'otra-cuenta' })
  );
  expect(screen.queryByText('Borrador privado')).not.toBeInTheDocument();
});
