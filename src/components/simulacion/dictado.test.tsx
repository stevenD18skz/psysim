import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';

import { BotonDictado } from './dictado';

afterEach(() => {
  vi.unstubAllGlobals();
  localStorage.clear();
});

it('solicita consentimiento de dictado a cada cuenta aunque el equipo ya hubiera aceptado', () => {
  const empezar = vi.fn();
  vi.stubGlobal(
    'SpeechRecognition',
    class {
      start = empezar;
      stop = vi.fn();
    }
  );
  localStorage.setItem('psysim:dictado-aceptado', '1');
  const pedir = vi.fn();
  const primera = render(
    <BotonDictado
      cuentaId="primera"
      onTexto={vi.fn()}
      deshabilitado={false}
      onPedirAceptacion={pedir}
    />
  );
  fireEvent.click(screen.getByRole('button'));
  expect(pedir).toHaveBeenCalledOnce();
  expect(empezar).not.toHaveBeenCalled();
  const aceptar = pedir.mock.calls[0]![0] as () => void;
  // El panel llama a este callback al confirmar el aviso.
  act(() => aceptar());
  expect(localStorage.getItem('psysim:dictado-aceptado:v1:primera')).toBe('1');
  primera.unmount();

  const pedirOtra = vi.fn();
  render(
    <BotonDictado
      cuentaId="otra"
      onTexto={vi.fn()}
      deshabilitado={false}
      onPedirAceptacion={pedirOtra}
    />
  );
  fireEvent.click(screen.getByRole('button'));
  expect(pedirOtra).toHaveBeenCalledOnce();
  expect(empezar).toHaveBeenCalledTimes(1);
});
