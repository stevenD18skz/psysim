import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { CONTRASTE_AA, hexARgb, luminancia, mezclar, razonContraste, type Rgb } from './contraste';

describe('razonContraste (WCAG 2.1)', () => {
  it('negro sobre blanco es 21:1 y el orden no importa', () => {
    expect(razonContraste(hexARgb('#000'), hexARgb('#fff'))).toBeCloseTo(21, 5);
    expect(razonContraste(hexARgb('#fff'), hexARgb('#000'))).toBeCloseTo(21, 5);
  });

  it('un color contra sí mismo es 1:1', () => {
    expect(razonContraste(hexARgb('#5f7f63'), hexARgb('#5f7f63'))).toBe(1);
  });

  it('coincide con valores de referencia conocidos', () => {
    // #767676 sobre blanco es el gris mínimo que cumple 4,5:1.
    expect(razonContraste(hexARgb('#767676'), hexARgb('#ffffff'))).toBeCloseTo(4.54, 2);
    expect(razonContraste(hexARgb('#777777'), hexARgb('#ffffff'))).toBeLessThan(4.5);
  });

  it('luminancia: blanco 1, negro 0', () => {
    expect(luminancia([255, 255, 255])).toBe(1);
    expect(luminancia([0, 0, 0])).toBe(0);
  });

  it('acepta la forma corta #rgb y rechaza colores inválidos', () => {
    expect(hexARgb('#fa0')).toEqual([255, 170, 0]);
    expect(() => hexARgb('rojo')).toThrow();
  });

  it('mezclar aplica la transparencia sobre el fondo', () => {
    expect(mezclar([255, 255, 255], 0.5, [0, 0, 0])).toEqual([128, 128, 128]);
    expect(mezclar([10, 20, 30], 1, [200, 200, 200])).toEqual([10, 20, 30]);
    expect(mezclar([10, 20, 30], 0, [200, 200, 200])).toEqual([200, 200, 200]);
  });
});

/**
 * Lee los colores reales del tema desde globals.css (no una copia): si alguien cambia un color y
 * rompe el contraste, este test falla. Resuelve `var(--x)` y las transparencias `rgb(r g b / a)`.
 */
const css = readFileSync(path.join(process.cwd(), 'src/app/globals.css'), 'utf8');

function leerBloque(selector: string): Record<string, string> {
  const inicio = css.indexOf(`${selector} {`);
  const fin = css.indexOf('\n}', inicio);
  const variables: Record<string, string> = {};
  for (const [, nombre, valor] of css.slice(inicio, fin).matchAll(/(--[\w-]+):\s*([^;]+);/g)) {
    variables[nombre!] = valor!.trim();
  }
  return variables;
}

function crearTema(extra: Record<string, string> = {}) {
  const variables = { ...leerBloque(':root'), ...extra };
  const resolver = (valor: string, fondo: Rgb | null = null): Rgb => {
    const referencia = /^var\((--[\w-]+)\)$/.exec(valor);
    if (referencia) return resolver(variables[referencia[1]!]!, fondo);
    const alfa = /^rgb\((\d+) (\d+) (\d+) \/ ([\d.]+)\)$/.exec(valor);
    if (alfa) {
      if (!fondo) throw new Error(`Falta el fondo para ${valor}`);
      return mezclar([Number(alfa[1]), Number(alfa[2]), Number(alfa[3])], Number(alfa[4]), fondo);
    }
    return hexARgb(valor);
  };
  return (nombre: string, fondo: Rgb | null = null) => resolver(`var(--${nombre})`, fondo);
}

type Par = [texto: string, fondo: string, minimo: number, descripcion: string];

const TEXTO = CONTRASTE_AA.texto;
const COMPONENTE = CONTRASTE_AA.componente;

/** Pares de texto sobre su fondo y componentes de interfaz que usa la aplicación. */
const PARES: Par[] = [
  ['foreground', 'background', TEXTO, 'texto sobre el fondo'],
  ['card-foreground', 'card', TEXTO, 'texto sobre tarjetas'],
  ['popover-foreground', 'popover', TEXTO, 'texto en menús y globos'],
  ['muted-foreground', 'background', TEXTO, 'texto apagado sobre el fondo'],
  ['muted-foreground', 'card', TEXTO, 'texto apagado sobre tarjetas'],
  ['muted-foreground', 'muted', TEXTO, 'texto apagado sobre superficies apagadas'],
  ['primary-foreground', 'primary', TEXTO, 'texto del botón principal'],
  ['secondary-foreground', 'secondary', TEXTO, 'texto secundario'],
  ['accent-foreground', 'accent', TEXTO, 'texto de acento'],
  ['success-foreground', 'success', TEXTO, 'texto de éxito'],
  ['sidebar-foreground', 'sidebar', TEXTO, 'texto del menú lateral'],
  ['sidebar-muted', 'sidebar', TEXTO, 'texto apagado del menú lateral'],
  ['sidebar-accent-foreground', 'sidebar-accent', TEXTO, 'elemento activo del menú lateral'],
  ['sidebar-primary-foreground', 'sidebar-primary', TEXTO, 'botón del menú lateral'],
  ['destructive', 'background', TEXTO, 'errores sobre el fondo'],
  ['destructive', 'card', TEXTO, 'errores sobre tarjetas'],
  ['input', 'background', COMPONENTE, 'borde de los campos (1.4.11)'],
  ['ring', 'background', COMPONENTE, 'anillo de foco (1.4.11)'],
];

/** Pares propios del tema claro (colores de la marca usados como texto). */
const PARES_CLAROS: Par[] = [
  ['terracota', 'background', TEXTO, 'voz del paciente sobre el fondo'],
  ['terracota', 'card', TEXTO, 'voz del paciente sobre tarjetas'],
  ['salvia-oscuro', 'salvia-suave', TEXTO, 'texto sobre salvia suave'],
  ['ambar', 'ambar-suave', TEXTO, 'avisos en ámbar'],
  ['foreground', 'ambar-suave', TEXTO, 'texto sobre avisos en ámbar'],
  ['foreground', 'laton', TEXTO, 'texto sobre el botón de acción (latón)'],
  ['laton-texto', 'nogal', TEXTO, 'latón sobre la madera'],
];

function comprobar(tema: ReturnType<typeof crearTema>, pares: Par[]) {
  it.each(pares)('%s sobre %s ≥ %f:1 — %s', (texto, fondo, minimo) => {
    const colorFondo = tema(fondo);
    const razon = razonContraste(tema(texto, colorFondo), colorFondo);
    expect(razon, `${texto} sobre ${fondo}: ${razon.toFixed(2)}:1`).toBeGreaterThanOrEqual(minimo);
  });
}

describe('contraste del tema claro (HU-25 · T01, WCAG 2.1 AA)', () => {
  const tema = crearTema();
  comprobar(tema, [...PARES, ...PARES_CLAROS]);
});

describe('contraste del tema oscuro (HU-25 · T01, WCAG 2.1 AA)', () => {
  const tema = crearTema(leerBloque('.dark'));
  comprobar(tema, PARES);
});
