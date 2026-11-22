import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useAyudaPrimeraPractica } from './ayuda-primera-practica';

describe('ayuda de la primera práctica', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
  });

  afterEach(() => vi.useRealTimers());

  it('activa las pistas de una en una cada diez segundos al empezar la práctica', () => {
    const { result, rerender } = renderHook(
      ({ activa }) => useAyudaPrimeraPractica({ cuentaId: 'estudiante', modoTexto: false, activa }),
      { initialProps: { activa: false } }
    );
    expect(result.current.actual).toBeUndefined();
    rerender({ activa: true });
    expect(result.current.actual).toBe('ocultar');
    act(() => vi.advanceTimersByTime(9_999));
    expect(result.current.actual).toBe('ocultar');
    act(() => vi.advanceTimersByTime(1));
    expect(result.current.actual).toBe('remision');
  });

  it('solo enseña herramientas disponibles en modo texto y recuerda el cierre por cuenta', () => {
    const opts = { modoTexto: true, activa: true };
    const guia = renderHook(() => useAyudaPrimeraPractica({ ...opts, cuentaId: 'primera' }));
    expect(guia.result.current.actual).toBe('remision');
    act(() => vi.advanceTimersByTime(10_000));
    expect(guia.result.current.actual).toBe('notas');
    act(() => guia.result.current.omitir());
    expect(guia.result.current.actual).toBeUndefined();
    guia.unmount();

    const repetir = renderHook(() => useAyudaPrimeraPractica({ ...opts, cuentaId: 'primera' }));
    const otraCuenta = renderHook(() => useAyudaPrimeraPractica({ ...opts, cuentaId: 'segunda' }));
    expect(repetir.result.current.actual).toBeUndefined();
    expect(otraCuenta.result.current.actual).toBe('remision');
  });
});
