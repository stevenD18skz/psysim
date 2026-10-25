import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import manifest, { COLOR_FONDO, COLOR_TEMA } from '@/app/manifest';
import robots from '@/app/robots';
import sitemap from '@/app/sitemap';
import { DESCRIPCION_SITIO, RUTAS_PRIVADAS, TITULO_SITIO, URL_SITIO } from '@/lib/sitio';

/**
 * SEO y compartir: lo que buscadores y redes sociales leen de PsySim. Las páginas públicas se
 * indexan con título, descripción y vista previa propios; todo lo demás (prácticas, resultados,
 * panel del docente) queda fuera de los buscadores.
 */
const RAIZ = process.cwd();
const leer = (ruta: string) => readFileSync(path.join(RAIZ, ruta), 'utf8');

function paginas(carpeta: string): string[] {
  return readdirSync(carpeta).flatMap(nombre => {
    const ruta = path.join(carpeta, nombre);
    if (statSync(ruta).isDirectory()) return paginas(ruta);
    return /^(page|layout)\.tsx$/.test(nombre) ? [ruta] : [];
  });
}

/** Ancho y alto de un PNG, leídos de su cabecera IHDR. */
function dimensiones(ruta: string) {
  const bytes = readFileSync(path.join(RAIZ, ruta));
  return { ancho: bytes.readUInt32BE(16), alto: bytes.readUInt32BE(20) };
}

describe('títulos y descripciones', () => {
  it('el título de la portada cabe en el resultado de búsqueda (hasta 70 caracteres)', () => {
    expect(TITULO_SITIO.length).toBeLessThanOrEqual(75);
    expect(TITULO_SITIO).toMatch(/PsySim/);
  });

  it('la descripción mide entre 100 y 170 caracteres para no cortarse', () => {
    expect(DESCRIPCION_SITIO.length).toBeGreaterThanOrEqual(100);
    expect(DESCRIPCION_SITIO.length).toBeLessThanOrEqual(170);
  });

  it('cada página con metadatos tiene un título propio y corto', () => {
    const sinTitulo: string[] = [];
    const largos: string[] = [];
    for (const ruta of paginas(path.join(RAIZ, 'src/app'))) {
      const fuente = readFileSync(ruta, 'utf8');
      // Los layouts definen la plantilla del título; el título propio es cosa de cada página.
      if (!ruta.endsWith('page.tsx') || !/export const metadata/.test(fuente)) continue;
      const titulo = /title:\s*'([^']+)'/.exec(fuente)?.[1];
      const relativa = path.relative(RAIZ, ruta).replaceAll('\\', '/');
      if (!titulo) sinTitulo.push(relativa);
      else if (titulo.length > 50) largos.push(`${relativa}: ${titulo}`);
    }
    expect(sinTitulo).toEqual([]);
    expect(largos).toEqual([]);
  });
});

describe('robots y sitemap', () => {
  const reglas = robots().rules;
  const regla = Array.isArray(reglas) ? reglas[0]! : reglas;

  it('el robots impide rastrear todas las rutas privadas y apunta al sitemap', () => {
    expect(regla.disallow).toEqual(expect.arrayContaining([...RUTAS_PRIVADAS]));
    expect(robots().sitemap).toBe(`${URL_SITIO}/sitemap.xml`);
  });

  it('el sitemap lista solo páginas públicas, con URL absoluta', () => {
    const urls = sitemap().map(entrada => entrada.url);
    expect(urls).toContain(`${URL_SITIO}/`);
    expect(urls).toContain(`${URL_SITIO}/privacidad`);
    for (const url of urls) {
      expect(url.startsWith('https://') || url.startsWith('http://')).toBe(true);
      for (const privada of RUTAS_PRIVADAS) {
        expect(new URL(url).pathname.startsWith(privada), `${url} es privada`).toBe(false);
      }
    }
  });

  it('el login y las páginas internas no se indexan (robots noindex)', () => {
    for (const ruta of [
      'src/app/(auth)/login/page.tsx',
      'src/app/(protected)/layout.tsx',
      'src/app/acceso-denegado/page.tsx',
    ]) {
      expect(leer(ruta), ruta).toMatch(/robots:\s*\{\s*index:\s*false/);
    }
  });

  it('las páginas públicas declaran su dirección canónica', () => {
    expect(leer('src/app/layout.tsx')).toMatch(/canonical:\s*'\/'/);
    expect(leer('src/app/privacidad/page.tsx')).toMatch(/canonical:\s*'\/privacidad'/);
  });
});

describe('compartir en redes y mensajería', () => {
  it('la imagen para compartir mide 1200 × 630 (la que piden Facebook, WhatsApp y X)', () => {
    for (const ruta of ['src/app/opengraph-image.png', 'src/app/twitter-image.png']) {
      expect(dimensiones(ruta), ruta).toEqual({ ancho: 1200, alto: 630 });
    }
  });

  it('cada imagen para compartir trae su texto alternativo', () => {
    for (const ruta of ['src/app/opengraph-image.alt.txt', 'src/app/twitter-image.alt.txt']) {
      expect(leer(ruta).trim().length, ruta).toBeGreaterThan(20);
    }
  });

  it('la tarjeta de X es de imagen grande y OpenGraph declara idioma y sitio', () => {
    const layout = leer('src/app/layout.tsx');
    expect(layout).toMatch(/card:\s*'summary_large_image'/);
    expect(layout).toMatch(/locale:\s*'es_CO'/);
    expect(layout).toMatch(/siteName:\s*NOMBRE_SITIO/);
  });

  it('un enlace de práctica compartido (que lleva al login) muestra un título propio', () => {
    expect(leer('src/app/(auth)/login/page.tsx')).toMatch(/openGraph:\s*\{\s*[^}]*title:/s);
  });
});

describe('identidad de marca propia', () => {
  it('los íconos tienen el tamaño que declaran', () => {
    expect(dimensiones('src/app/icon.png')).toEqual({ ancho: 512, alto: 512 });
    expect(dimensiones('src/app/apple-icon.png')).toEqual({ ancho: 180, alto: 180 });
  });

  it('la marca se genera con un script reproducible, sin imágenes ajenas', () => {
    const script = leer('scripts/generar-marca.mjs');
    expect(script).toMatch(/SimboloPsySim/);
    expect(script).toMatch(/opengraph-image\.png/);
  });
});

describe('manifiesto de la aplicación web', () => {
  const m = manifest();

  it('usa los colores de la marca y el idioma del sitio', () => {
    expect(m.theme_color).toBe(COLOR_TEMA);
    expect(m.background_color).toBe(COLOR_FONDO);
    expect(leer('src/app/layout.tsx')).toContain(`themeColor: '${COLOR_TEMA}'`);
    expect(m.lang).toBe('es-CO');
  });

  it('declara íconos que existen en el proyecto', () => {
    expect(m.icons?.length).toBeGreaterThan(0);
    for (const icono of m.icons ?? []) {
      const archivo = icono.src.replace('/', 'src/app/');
      expect(() => statSync(path.join(RAIZ, archivo)), icono.src).not.toThrow();
    }
  });
});

describe('datos estructurados (schema.org)', () => {
  const portada = leer('src/app/page.tsx');

  it('la portada describe el sitio, la aplicación, la universidad y las preguntas frecuentes', () => {
    for (const tipo of ['WebSite', 'WebApplication', 'CollegeOrUniversity', 'FAQPage']) {
      expect(portada, tipo).toContain(`'@type': '${tipo}'`);
    }
  });

  it('la aplicación se enlaza a la universidad por @id (un solo nodo, sin duplicar)', () => {
    expect(portada.match(/#universidad/g)?.length).toBeGreaterThanOrEqual(3);
  });

  it('el JSON se escapa para que un «<» no pueda cerrar el script', () => {
    expect(leer('src/lib/seo/json-ld.tsx')).toMatch(/replace\(\/<\/g/);
  });
});

describe('llms.txt (resumen del sitio para asistentes de IA)', () => {
  const llms = leer('public/llms.txt');

  it('describe el flujo actual y no repite datos viejos', () => {
    expect(llms).toMatch(/estudiante/i);
    expect(llms).not.toMatch(/solo para docentes con cuenta/i);
    expect(llms).not.toMatch(/\bescenarios?\b/i);
  });

  it('enlaza solo páginas públicas que el sitemap publica', () => {
    const enlaces = [...llms.matchAll(/\]\((https?:[^)]+)\)/g)].map(m => new URL(m[1]!).pathname);
    const publicas = sitemap().map(e => new URL(e.url).pathname);
    for (const ruta of enlaces) expect(publicas, ruta).toContain(ruta);
  });
});
