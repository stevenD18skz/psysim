import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ESPERA_BORRADOR_MS, useBorrador } from './use-borrador';

const CLAVE = 'psysim:borrador-prueba';

interface Props {
  valores: { titulo: string };
  sucio: boolean;
}

function montar(inicial: Props = { valores: { titulo: '' }, sucio: false }) {
  return renderHook((props: Props) => useBorrador({ clave: CLAVE, ...props }), {
    initialProps: inicial,
  });
}

function avanzar(ms: number) {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

describe('useBorrador (WCAG 3.3.4: no perder lo escrito)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('guardado', () => {
    it('no guarda nada mientras no hay cambios', () => {
      montar();
      avanzar(ESPERA_BORRADOR_MS * 3);
      expect(localStorage.getItem(CLAVE)).toBeNull();
    });

    it('guarda el borrador con espera, no en cada tecla', () => {
      const { rerender } = montar();
      rerender({ valores: { titulo: 'D' }, sucio: true });
      avanzar(ESPERA_BORRADOR_MS - 100);
      rerender({ valores: { titulo: 'Du' }, sucio: true });
      avanzar(ESPERA_BORRADOR_MS - 100);
      expect(localStorage.getItem(CLAVE)).toBeNull();

      avanzar(200);
      const guardado = JSON.parse(localStorage.getItem(CLAVE)!);
      expect(guardado.valores).toEqual({ titulo: 'Du' });
      expect(new Date(guardado.guardadoEn).getTime()).not.toBeNaN();
    });
  });

  describe('advertencia al cerrar la pestaña', () => {
    const cierre = () => {
      const evento = new Event('beforeunload', { cancelable: true });
      window.dispatchEvent(evento);
      return evento;
    };

    it('avisa si hay cambios sin guardar', () => {
      const { rerender } = montar();
      rerender({ valores: { titulo: 'x' }, sucio: true });
      expect(cierre().defaultPrevented).toBe(true);
    });

    it('no molesta si no hay cambios', () => {
      montar();
      expect(cierre().defaultPrevented).toBe(false);
    });

    it('deja de avisar cuando el trabajo ya se guardó de verdad', () => {
      const { result, rerender } = montar();
      rerender({ valores: { titulo: 'x' }, sucio: true });
      act(() => result.current.limpiar());
      expect(cierre().defaultPrevented).toBe(false);
    });
  });

  describe('recuperación', () => {
    const GUARDADO = JSON.stringify({
      valores: { titulo: 'Mi caso' },
      guardadoEn: '2026-10-25T10:00:00.000Z',
    });

    it('ofrece el borrador que había al llegar', () => {
      localStorage.setItem(CLAVE, GUARDADO);
      const { result } = montar();
      expect(result.current.borrador).toEqual({
        valores: { titulo: 'Mi caso' },
        guardadoEn: '2026-10-25T10:00:00.000Z',
      });
    });

    it('sin borrador no ofrece nada', () => {
      const { result } = montar();
      expect(result.current.borrador).toBeNull();
    });

    it.each([
      ['un JSON roto', '{no es json'],
      ['un borrador sin valores', JSON.stringify({ guardadoEn: '2026-10-25T10:00:00.000Z' })],
      ['un borrador sin fecha', JSON.stringify({ valores: { titulo: 'x' } })],
    ])('ignora %s', (_, texto) => {
      localStorage.setItem(CLAVE, texto);
      const { result } = montar();
      expect(result.current.borrador).toBeNull();
    });

    it('descartar lo borra y lo oculta', () => {
      localStorage.setItem(CLAVE, GUARDADO);
      const { result } = montar();
      act(() => result.current.descartar());
      expect(result.current.borrador).toBeNull();
      expect(localStorage.getItem(CLAVE)).toBeNull();
    });

    it('lo que se escribe después no cambia la oferta del borrador anterior', () => {
      localStorage.setItem(CLAVE, GUARDADO);
      const { result, rerender } = montar();
      rerender({ valores: { titulo: 'Otro' }, sucio: true });
      avanzar(ESPERA_BORRADOR_MS + 50);

      expect(result.current.borrador?.valores).toEqual({ titulo: 'Mi caso' });
    });

    it('guardar de verdad (limpiar) borra el borrador y no vuelve a guardarlo', () => {
      const { result, rerender } = montar();
      rerender({ valores: { titulo: 'x' }, sucio: true });
      avanzar(ESPERA_BORRADOR_MS + 50);
      expect(localStorage.getItem(CLAVE)).not.toBeNull();

      act(() => result.current.limpiar());
      expect(localStorage.getItem(CLAVE)).toBeNull();
      rerender({ valores: { titulo: 'xy' }, sucio: true });
      avanzar(ESPERA_BORRADOR_MS + 50);
      expect(localStorage.getItem(CLAVE)).toBeNull();
    });
  });

  it('sin almacenamiento (modo privado) no falla', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('bloqueado');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('bloqueado');
    });
    const { result, rerender } = montar();
    rerender({ valores: { titulo: 'x' }, sucio: true });
    expect(() => avanzar(ESPERA_BORRADOR_MS + 50)).not.toThrow();
    expect(result.current.borrador).toBeNull();
  });
});
