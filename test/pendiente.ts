import { existsSync } from 'node:fs';
import path from 'node:path';

/**
 * Tests escritos antes que su código (Sprint 6 adelantado): se omiten mientras no exista el
 * archivo que prueban y se activan solos en cuanto se crea. Así la suite sigue en verde hoy y,
 * al implementar el Sprint 4, basta con correrla.
 *
 *   describe.skipIf(!existe('src/lib/metrics.ts'))('…', () => { … });
 *
 * El módulo se importa con `import()` dentro del `beforeAll` (nunca arriba del archivo): un
 * import estático de un archivo inexistente rompería la suite completa.
 */
export function existe(...rutasDesdeLaRaiz: string[]): boolean {
  // Varias rutas: basta con una (p. ej. la página puede vivir en distintos grupos de rutas).
  return rutasDesdeLaRaiz.some(ruta => existsSync(path.join(process.cwd(), ruta)));
}
