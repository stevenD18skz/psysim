import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

/**
 * HU-29 · T01 y HU-30 · T02 — Toda variable de entorno que lee el código está documentada en
 * `.env.example`, para que quien despliegue (Vercel) sepa qué configurar sin leer el código.
 */
const RAIZ = process.cwd();

/** Variables propias de las herramientas de desarrollo o del entorno, no de la configuración. */
const AJENAS_A_LA_CONFIGURACION = new Set(['NODE_ENV', 'CI', 'E']);

function archivosDe(carpeta: string, extensiones: RegExp): string[] {
  return readdirSync(carpeta).flatMap(nombre => {
    const ruta = path.join(carpeta, nombre);
    if (statSync(ruta).isDirectory()) return archivosDe(ruta, extensiones);
    return extensiones.test(nombre) && !/\.test\.tsx?$/.test(nombre) ? [ruta] : [];
  });
}

function variablesUsadas(carpetas: string[]): Map<string, string> {
  const usadas = new Map<string, string>();
  for (const carpeta of carpetas) {
    for (const archivo of archivosDe(path.join(RAIZ, carpeta), /\.(ts|tsx|mjs)$/)) {
      const texto = readFileSync(archivo, 'utf8');
      for (const [, nombre] of texto.matchAll(/process\.env\.([A-Z][A-Z0-9_]+)/g)) {
        if (!AJENAS_A_LA_CONFIGURACION.has(nombre!)) {
          usadas.set(nombre!, path.relative(RAIZ, archivo));
        }
      }
    }
  }
  return usadas;
}

/** Nombres que aparecen en `.env.example`, activos o comentados (`# NOMBRE=valor`). */
function variablesDocumentadas(): Set<string> {
  const texto = readFileSync(path.join(RAIZ, '.env.example'), 'utf8');
  return new Set([...texto.matchAll(/^#?\s*([A-Z][A-Z0-9_]+)=/gm)].map(([, nombre]) => nombre!));
}

describe('.env.example (HU-29 · T01, HU-30 · T02)', () => {
  const documentadas = variablesDocumentadas();

  it('documenta todas las variables que lee la aplicación', () => {
    const usadas = variablesUsadas(['src']);
    const faltan = [...usadas].filter(([nombre]) => !documentadas.has(nombre));
    expect(faltan.map(([nombre, archivo]) => `${nombre} (${archivo})`)).toEqual([]);
  });

  it('documenta también las de los scripts y los tests E2E', () => {
    const usadas = variablesUsadas(['scripts', 'e2e']);
    const faltan = [...usadas].filter(([nombre]) => !documentadas.has(nombre));
    expect(faltan.map(([nombre, archivo]) => `${nombre} (${archivo})`)).toEqual([]);
  });

  it('cada variable lleva un comentario que explica para qué sirve', () => {
    const lineas = readFileSync(path.join(RAIZ, '.env.example'), 'utf8').split('\n');
    const sinComentario = lineas.flatMap((linea, indice) => {
      if (!/^#?\s*[A-Z][A-Z0-9_]+=/.test(linea)) return [];
      // Una explicación: el comentario inmediato anterior (o una variable del mismo grupo).
      const anterior = lineas[indice - 1] ?? '';
      const esDelMismoGrupo = /^#?\s*[A-Z][A-Z0-9_]+=/.test(anterior);
      return anterior.startsWith('#') || esDelMismoGrupo ? [] : [linea];
    });
    expect(sinComentario).toEqual([]);
  });

  it('no trae valores reales: las claves de ejemplo están vacías', () => {
    const texto = readFileSync(path.join(RAIZ, '.env.example'), 'utf8');
    expect(texto).not.toMatch(/sb_secret_[A-Za-z0-9]{10,}/);
    expect(texto).not.toMatch(/AIza[A-Za-z0-9_-]{20,}/);
    expect(texto).not.toMatch(/eyJ[A-Za-z0-9_-]{20,}/);
    for (const clave of ['SUPABASE_SECRET_KEY', 'AI_API_KEY', 'NEXT_PUBLIC_SUPABASE_URL']) {
      expect(texto).toMatch(new RegExp(`^${clave}=$`, 'm'));
    }
  });
});
