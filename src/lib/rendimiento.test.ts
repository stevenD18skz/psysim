import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

/**
 * Rendimiento web (Core Web Vitals): presupuestos de peso que una máquina puede vigilar en cada
 * `pnpm test`. Medidas de Lighthouse y de Chrome real: docs/auditoria-rendimiento.md. Los modelos
 * 3D tienen su propio presupuesto en `e2e/rendimiento.spec.ts`.
 */
const RAIZ = process.cwd();
const KIB = 1024;

function archivos(carpeta: string, patron: RegExp): string[] {
  return readdirSync(carpeta).flatMap(nombre => {
    const ruta = path.join(carpeta, nombre);
    if (statSync(ruta).isDirectory()) return archivos(ruta, patron);
    return patron.test(nombre) ? [ruta] : [];
  });
}

const relativa = (ruta: string) => path.relative(RAIZ, ruta).replaceAll('\\', '/');
const peso = (ruta: string) => statSync(path.join(RAIZ, ruta)).size;

describe('imágenes (LCP y peso de la primera visita)', () => {
  const IMAGENES = [
    ...archivos(path.join(RAIZ, 'src/app'), /\.(png|jpe?g|webp)$/i),
    ...archivos(path.join(RAIZ, 'public/pacientes'), /\.(png|jpe?g|webp)$/i),
    ...archivos(path.join(RAIZ, 'public/brand'), /\.(png|jpe?g|webp)$/i),
  ].map(relativa);

  it('hay imágenes que medir', () => {
    expect(IMAGENES.length).toBeGreaterThan(5);
  });

  it.each(IMAGENES)('%s pesa menos de 150 KiB', ruta => {
    expect(peso(ruta) / KIB).toBeLessThan(150);
  });

  it('el ícono del sitio (se descarga en cada primera visita) pesa menos de 100 KiB', () => {
    expect(peso('src/app/icon.png') / KIB).toBeLessThan(100);
  });

  it('las imágenes para compartir en redes pesan menos de 80 KiB', () => {
    for (const ruta of ['src/app/opengraph-image.png', 'src/app/twitter-image.png']) {
      expect(peso(ruta) / KIB, ruta).toBeLessThan(80);
    }
  });
});

describe('fuentes', () => {
  const layout = readFileSync(path.join(RAIZ, 'src/app/layout.tsx'), 'utf8');

  it('solo se descarga el subconjunto latino, que cubre todo el español', () => {
    expect(layout).not.toMatch(/subsets: \[[^\]]*latin-ext/);
    expect(layout).toMatch(/subsets: \['latin'\]/);
  });

  it('la fuente monoespaciada (solo para códigos) no se precarga en cada página', () => {
    expect(layout).toMatch(/preload: false/);
  });

  it('ninguna fuente se carga desde un servidor externo (sin bloqueo ni fuga de IP)', () => {
    expect(layout).toContain("from 'next/font/google'");
    const css = readFileSync(path.join(RAIZ, 'src/app/globals.css'), 'utf8');
    expect(css).not.toMatch(/fonts\.googleapis\.com|@import url\(['"]?https?:/);
  });
});

describe('JavaScript del navegador', () => {
  it('shadcn (una herramienta de línea de comandos) no se instala en producción', () => {
    const paquete = JSON.parse(readFileSync(path.join(RAIZ, 'package.json'), 'utf8')) as {
      dependencies: Record<string, string>;
      devDependencies: Record<string, string>;
    };
    expect(paquete.dependencies).not.toHaveProperty('shadcn');
    expect(paquete.devDependencies).toHaveProperty('shadcn');
  });
});
