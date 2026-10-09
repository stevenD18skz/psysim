import { type Anotacion } from '@/types';

/*
 * Las anotaciones guardan posiciones en puntos de código (lo que cuenta `char_length` en
 * PostgreSQL), no en unidades UTF-16 como los índices de JavaScript: un emoji ocupa 1 en la base
 * de datos y 2 en un `string` de JS. Estas funciones hacen la conversión.
 */

/** Índice UTF-16 (JavaScript) → posición en puntos de código. */
export function aPuntosDeCodigo(texto: string, indiceUtf16: number): number {
  return Array.from(texto.slice(0, indiceUtf16)).length;
}

/** Fragmento entre dos posiciones en puntos de código. */
export function fragmentoEntre(texto: string, inicio: number, fin: number): string {
  return Array.from(texto).slice(inicio, fin).join('');
}

/**
 * Ajusta una selección a palabras completas sin espacios en los bordes, para que subrayar
 * "  hablaste muy" no guarde los espacios. Devuelve `null` si solo había espacios.
 */
export function recortarSeleccion(
  texto: string,
  inicio: number,
  fin: number
): { inicio: number; fin: number } | null {
  const caracteres = Array.from(texto);
  let a = Math.max(0, Math.min(inicio, fin));
  let b = Math.min(caracteres.length, Math.max(inicio, fin));
  while (a < b && /\s/u.test(caracteres[a] ?? '')) a++;
  while (b > a && /\s/u.test(caracteres[b - 1] ?? '')) b--;
  return a < b ? { inicio: a, fin: b } : null;
}

/** ¿El rango se cruza con alguna anotación existente del mensaje? */
export function seSolapa(
  anotaciones: readonly Pick<Anotacion, 'inicio' | 'fin'>[],
  inicio: number,
  fin: number
): boolean {
  return anotaciones.some(a => a.inicio < fin && inicio < a.fin);
}

export type Segmento = { texto: string; anotacion: Anotacion | null };

/**
 * Parte el mensaje en tramos de texto normal y tramos subrayados, en orden. Las anotaciones que
 * se salen del texto o se solapan con una anterior se ignoran (la base de datos no las permite,
 * pero el render no debe romperse si llegaran).
 */
export function segmentarMensaje(contenido: string, anotaciones: readonly Anotacion[]): Segmento[] {
  const caracteres = Array.from(contenido);
  const ordenadas = [...anotaciones].sort((a, b) => a.inicio - b.inicio);
  const segmentos: Segmento[] = [];
  let cursor = 0;

  for (const anotacion of ordenadas) {
    if (anotacion.inicio < cursor || anotacion.fin > caracteres.length) continue;
    if (anotacion.inicio > cursor) {
      segmentos.push({
        texto: caracteres.slice(cursor, anotacion.inicio).join(''),
        anotacion: null,
      });
    }
    segmentos.push({
      texto: caracteres.slice(anotacion.inicio, anotacion.fin).join(''),
      anotacion,
    });
    cursor = anotacion.fin;
  }
  if (cursor < caracteres.length) {
    segmentos.push({ texto: caracteres.slice(cursor).join(''), anotacion: null });
  }
  return segmentos;
}
