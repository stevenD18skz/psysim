import { render } from '@testing-library/react';
import { type ReactNode } from 'react';
import { expect, it, vi } from 'vitest';

import { SceneCanvas } from './scene-canvas';

const lienzo = vi.hoisted(() => ({ falla: false }));
vi.mock('@react-three/drei', () => ({ PerformanceMonitor: () => null }));
vi.mock('@react-three/fiber', () => ({
  Canvas: ({ fallback }: { fallback: ReactNode }) => {
    if (lienzo.falla) throw new Error('No se pudo crear el renderer');
    // R3F siempre monta el fallback HTML dentro de canvas, aun con el renderer activo.
    return <canvas>{fallback}</canvas>;
  },
}));

it('avisa del fallo del renderer y permite montar un lienzo compatible', () => {
  const avisar = vi.fn();
  const { container, rerender } = render(<SceneCanvas onFallo={avisar}>{null}</SceneCanvas>, {
    onCaughtError: () => {},
  });
  expect(container.querySelector('canvas')).toBeInTheDocument();
  expect(avisar).not.toHaveBeenCalled();

  lienzo.falla = true;
  rerender(<SceneCanvas onFallo={avisar}>{null}</SceneCanvas>);
  expect(avisar).toHaveBeenCalledOnce();
  expect(container.querySelector('canvas')).not.toBeInTheDocument();
});
