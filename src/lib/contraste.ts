/**
 * HU-25 · T01 — Contraste de colores según WCAG 2.1 (criterios 1.4.3 y 1.4.11).
 * Funciones puras para comprobar que los pares de colores del tema cumplen el nivel AA.
 */

/** Mínimos de WCAG 2.1 AA: texto normal 4,5:1; texto grande y componentes de interfaz 3:1. */
export const CONTRASTE_AA = { texto: 4.5, textoGrande: 3, componente: 3 } as const;

export type Rgb = readonly [number, number, number];

/** `#rgb` o `#rrggbb` → componentes 0–255. */
export function hexARgb(hex: string): Rgb {
  const limpio = hex.trim().replace(/^#/, '');
  const completo =
    limpio.length === 3
      ? limpio
          .split('')
          .map(c => c + c)
          .join('')
      : limpio;
  if (!/^[0-9a-f]{6}$/i.test(completo)) throw new Error(`Color hexadecimal inválido: ${hex}`);
  return [
    Number.parseInt(completo.slice(0, 2), 16),
    Number.parseInt(completo.slice(2, 4), 16),
    Number.parseInt(completo.slice(4, 6), 16),
  ];
}

/** Luminancia relativa de WCAG (0 = negro, 1 = blanco). */
export function luminancia([r, g, b]: Rgb): number {
  const lineal = (canal: number) => {
    const c = canal / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lineal(r) + 0.7152 * lineal(g) + 0.0722 * lineal(b);
}

/** Razón de contraste entre dos colores (1 a 21). El orden de los argumentos no importa. */
export function razonContraste(a: Rgb, b: Rgb): number {
  const [claro, oscuro] = [luminancia(a), luminancia(b)].sort((x, y) => y - x);
  return (claro! + 0.05) / (oscuro! + 0.05);
}

/** Color con transparencia `alfa` (0–1) sobre un fondo opaco. */
export function mezclar(color: Rgb, alfa: number, fondo: Rgb): Rgb {
  return [0, 1, 2].map(i =>
    Math.round(color[i]! * alfa + fondo[i]! * (1 - alfa))
  ) as unknown as Rgb;
}
