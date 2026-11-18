import { describe, expect, it } from 'vitest';

import { eje, MAPA_TECLAS } from './use-teclado';

const pulsadas = (...codigos: string[]) => new Set(codigos);

describe('teclas de la escena', () => {
  it('W A S D desplazan; las flechas arriba y abajo también avanzan y retroceden', () => {
    expect(eje(pulsadas('KeyW'), 'adelante', 'atras')).toBe(1);
    expect(eje(pulsadas('ArrowUp'), 'adelante', 'atras')).toBe(1);
    expect(eje(pulsadas('ArrowDown'), 'adelante', 'atras')).toBe(-1);
    expect(eje(pulsadas('KeyD'), 'derecha', 'izquierda')).toBe(1);
    expect(eje(pulsadas('KeyA'), 'derecha', 'izquierda')).toBe(-1);
  });

  // P5-02 (WCAG 2.1.1): sin ratón no había forma de orientar la cámara.
  it('las flechas izquierda y derecha giran la vista en lugar de desplazar', () => {
    expect(eje(pulsadas('ArrowLeft'), 'girarIzquierda', 'girarDerecha')).toBe(1);
    expect(eje(pulsadas('ArrowRight'), 'girarIzquierda', 'girarDerecha')).toBe(-1);
    expect(eje(pulsadas('ArrowLeft'), 'derecha', 'izquierda')).toBe(0);
    expect(eje(pulsadas('ArrowRight'), 'derecha', 'izquierda')).toBe(0);
  });

  it('dos teclas opuestas se anulan', () => {
    expect(eje(pulsadas('ArrowLeft', 'ArrowRight'), 'girarIzquierda', 'girarDerecha')).toBe(0);
    expect(eje(pulsadas('KeyW', 'KeyS'), 'adelante', 'atras')).toBe(0);
  });

  it('ninguna tecla sirve para dos acciones (la E queda libre para conversar)', () => {
    const todas = Object.values(MAPA_TECLAS).flat();
    expect(new Set(todas).size).toBe(todas.length);
    expect(todas).not.toContain('KeyE');
  });
});
