import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  calcularPosicionTarjeta,
  calcularRecorteSpotlight,
  calcularScrollObjetivo,
  clavePista,
  claveRecorrido,
  dispararRecorrido,
  leerAyudaVista,
  marcarAyudaVista,
  suscribirAyuda,
  suscribirDisparoRecorrido,
} from './recorridos';

beforeEach(() => {
  localStorage.clear();
});

describe('estado persistido de recorridos y pistas', () => {
  it('marca y lee un recorrido o pista y avisa a los suscriptores', () => {
    const oyente = vi.fn();
    const cancelar = suscribirAyuda(oyente);

    const clave = claveRecorrido('asignar-practica');
    expect(leerAyudaVista(clave)).toBe(false);

    marcarAyudaVista(clave);
    expect(leerAyudaVista(clave)).toBe(true);
    expect(oyente).toHaveBeenCalledTimes(1);

    const pista = clavePista('revisiones-vistas');
    expect(leerAyudaVista(pista)).toBe(false);
    marcarAyudaVista(pista);
    expect(leerAyudaVista(pista)).toBe(true);

    cancelar();
  });

  it('dispara el evento de inicio solo para el recorrido coincidente', () => {
    const alIniciar = vi.fn();
    const otro = vi.fn();
    const c1 = suscribirDisparoRecorrido('asignar-practica', alIniciar);
    const c2 = suscribirDisparoRecorrido('revision-practica', otro);

    dispararRecorrido('asignar-practica', 2);

    expect(alIniciar).toHaveBeenCalledWith(2);
    expect(otro).not.toHaveBeenCalled();

    c1();
    c2();
  });
});

describe('geometría del spotlight y tarjeta flotante', () => {
  it('acota la altura de objetivos muy largos para dejar espacio a la tarjeta', () => {
    const recorte = calcularRecorteSpotlight(
      { top: 100, left: 40, width: 800, height: 950 },
      { width: 1280, height: 800 }
    );
    expect(recorte.height).toBeLessThanOrEqual(420);
    expect(recorte.left).toBe(32);
    expect(recorte.top).toBe(92);
  });

  it('coloca la tarjeta debajo cuando hay espacio y voltea arriba cuando el foco está abajo', () => {
    const viewport = { width: 1280, height: 800 };
    const tarjeta = { width: 360, height: 220 };

    const abajo = calcularPosicionTarjeta(
      { top: 120, left: 100, width: 500, height: 120 },
      tarjeta,
      viewport,
      'bottom'
    );
    expect(abajo.lado).toBe('bottom');
    expect(abajo.top).toBe(254);

    const arriba = calcularPosicionTarjeta(
      { top: 620, left: 100, width: 500, height: 120 },
      tarjeta,
      viewport,
      'bottom'
    );
    expect(arriba.lado).toBe('top');
    expect(arriba.top).toBeLessThan(620);
  });

  it('ancla la tarjeta en la parte inferior en móvil estrecho', () => {
    const pos = calcularPosicionTarjeta(
      { top: 100, left: 20, width: 350, height: 160 },
      { width: 360, height: 230 },
      { width: 390, height: 844 }
    );
    expect(pos.lado).toBe('sheet');
    expect(pos.width).toBe(358);
    expect(pos.left).toBe(16);
  });

  it('evita desplazamientos innecesarios y encuadra objetivos fuera de pantalla sin rebotes', () => {
    const viewport = { width: 1280, height: 800 };
    expect(
      calcularScrollObjetivo({ top: 180, left: 40, width: 600, height: 200 }, viewport, 0, 2400)
    ).toBeNull();

    const destino = calcularScrollObjetivo(
      { top: 960, left: 40, width: 600, height: 240 },
      viewport,
      100,
      2400
    );
    expect(destino).not.toBeNull();
    expect(destino!).toBeGreaterThan(700);
    expect(destino!).toBeLessThanOrEqual(1600);
  });
});
