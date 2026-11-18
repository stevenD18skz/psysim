import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

/**
 * Calidad de software (docs/calidad-de-software.md): reglas de mantenibilidad y observabilidad que
 * se comprueban leyendo el código en cada `pnpm test`. Cada una nació de un riesgo concreto; el
 * documento dice cuál. Si una falla, el mensaje nombra el archivo.
 */
const RAIZ = process.cwd();
const leer = (ruta: string) => readFileSync(path.join(RAIZ, ruta), 'utf8');

function archivos(carpeta: string, patron: RegExp): string[] {
  return readdirSync(carpeta).flatMap(nombre => {
    const ruta = path.join(carpeta, nombre);
    if (statSync(ruta).isDirectory()) return archivos(ruta, patron);
    return patron.test(nombre) ? [ruta] : [];
  });
}

const relativa = (ruta: string) => path.relative(RAIZ, ruta).replaceAll('\\', '/');

const FUENTES = archivos(path.join(RAIZ, 'src'), /\.(ts|tsx)$/)
  .filter(ruta => !/\.(test|d)\.tsx?$/.test(ruta) && !ruta.endsWith('database.types.ts'))
  .map(ruta => ({ ruta: relativa(ruta), codigo: readFileSync(ruta, 'utf8') }));

const sinComentarios = (codigo: string) =>
  codigo.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');

describe('legibilidad (HU-25 · T05)', () => {
  it('ningún texto baja de 12 px, tampoco el número de una anotación', () => {
    const pequenos = FUENTES.flatMap(({ ruta, codigo }) =>
      [...codigo.matchAll(/text-\[([\d.]+)(px|rem)\]/g)]
        .filter(([, valor, unidad]) => Number(valor) * (unidad === 'rem' ? 16 : 1) < 12)
        .map(([clase]) => `${ruta}: ${clase}`)
    ).filter(hallazgo => !hallazgo.startsWith('src/components/dev/'));
    expect(pequenos).toEqual([]);
  });
});

describe('sistema de diseño (DESIGN.md)', () => {
  // La prueba de contraste mide los pares de tokens del tema. Un color de la paleta de Tailwind
  // escrito a mano (`bg-amber-200`) queda fuera de esa medición: el subrayado de los comentarios
  // del docente usaba pares que nadie había medido. La hoja de impresión y las herramientas de
  // desarrollo tienen su propia paleta.
  it('los colores salen de los tokens del tema, no de la paleta de Tailwind', () => {
    const PALETA =
      /\b(?:bg|text|border|ring|decoration|outline|fill|stroke|from|via|to|divide|caret|accent|shadow)-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3}\b/g;
    const fuera = FUENTES.filter(
      ({ ruta }) => !ruta.includes('/(impresion)/') && !ruta.startsWith('src/components/dev/')
    ).flatMap(({ ruta, codigo }) =>
      [...codigo.matchAll(PALETA)].map(([clase]) => `${ruta}: ${clase}`)
    );
    expect(fuera).toEqual([]);
  });

  // DESIGN.md pide condicionar toda animación a «reducir movimiento». Los indicadores de espera
  // (`animate-spin`) se escriben en decenas de sitios: una regla global los detiene a todos.
  it('los indicadores de espera se detienen con «reducir movimiento»', () => {
    const css = leer('src/app/globals.css');
    const [, regla = ''] =
      /@media \(prefers-reduced-motion: reduce\) \{([\s\S]*?animation: none[\s\S]*?)\n\}/.exec(
        css
      ) ?? [];
    for (const clase of ['.animate-spin', '.animate-pulse', '.animate-bounce', '.animate-ping']) {
      expect(regla, clase).toContain(clase);
    }
  });
});

describe('mantenibilidad (ISO/IEC 25010)', () => {
  it('hay código que revisar', () => {
    expect(FUENTES.length).toBeGreaterThan(300);
  });

  it('ningún archivo supera 1100 líneas (más allá, se vuelve imposible de revisar)', () => {
    const largos = FUENTES.filter(({ codigo }) => codigo.split('\n').length > 1100).map(
      ({ ruta, codigo }) => `${ruta}: ${codigo.split('\n').length} líneas`
    );
    expect(largos).toEqual([]);
  });

  it('el código no deja pendientes escondidos (TODO, FIXME, HACK, XXX)', () => {
    const pendientes = FUENTES.filter(({ codigo }) => /\b(TODO|FIXME|HACK|XXX)\b/.test(codigo)).map(
      ({ ruta }) => ruta
    );
    expect(pendientes).toEqual([]);
  });

  it('TypeScript no se silencia con @ts-ignore ni @ts-nocheck', () => {
    const silenciados = FUENTES.filter(({ codigo }) => /@ts-(ignore|nocheck)/.test(codigo)).map(
      ({ ruta }) => ruta
    );
    expect(silenciados).toEqual([]);
  });

  it('no se usa `any` (se usa `unknown` y se estrecha)', () => {
    const conAny = FUENTES.filter(({ codigo }) =>
      /(:\s*any\b|\bas any\b|<any>|any\[\])/.test(sinComentarios(codigo))
    ).map(({ ruta }) => ruta);
    expect(conAny).toEqual([]);
  });

  it('cada `eslint-disable` dice por qué', () => {
    const sinMotivo = FUENTES.flatMap(({ ruta, codigo }) =>
      codigo
        .split('\n')
        .filter(linea => /eslint-disable/.test(linea) && !/--\s*\S/.test(linea))
        .map(linea => `${ruta}: ${linea.trim()}`)
    );
    // Esta excepción histórica explica el motivo en la línea de arriba.
    expect(sinMotivo.filter(linea => !linea.includes('exhaustive-deps'))).toEqual([]);
  });

  it('no queda `console.log` de depuración', () => {
    const depuracion = FUENTES.filter(({ codigo }) => /console\.log\(/.test(codigo)).map(
      ({ ruta }) => ruta
    );
    expect(depuracion).toEqual([]);
  });
});

describe('observabilidad (docs/observabilidad.md)', () => {
  const ES_SERVIDOR = (ruta: string, codigo: string) =>
    /^src\/(app\/api|lib|app\/auth)\//.test(ruta) &&
    !/^'use client'/.test(codigo) &&
    !ruta.startsWith('src/lib/log.ts');

  it('el servidor registra con `log` (JSON con nombre de evento), no con `console` suelto', () => {
    const sueltos = FUENTES.filter(
      ({ ruta, codigo }) => ES_SERVIDOR(ruta, codigo) && /console\.(error|warn|info)\(/.test(codigo)
    ).map(({ ruta }) => ruta);
    expect(sueltos).toEqual([]);
  });

  it('los eventos se nombran `area.evento` en minúsculas', () => {
    const mal = FUENTES.flatMap(({ ruta, codigo }) =>
      [...codigo.matchAll(/\blog\.(?:info|warn|error)\('([^']+)'/g)]
        .map(m => m[1]!)
        .filter(evento => !/^[a-z_]+\.[a-z_]+$/.test(evento))
        .map(evento => `${ruta}: ${evento}`)
    );
    expect(mal).toEqual([]);
  });

  it('los registros no incluyen correos, contraseñas, tokens ni el texto de la conversación', () => {
    const delicados = FUENTES.flatMap(({ ruta, codigo }) =>
      [...codigo.matchAll(/\blog\.(?:info|warn|error)\([^)]*\{([^}]*)\}/gs)]
        .filter(m =>
          /\b(correo|email|password|contrasena|contraseña|token|mensaje_texto|contenido)\b/i.test(
            m[1]!
          )
        )
        .map(m => `${ruta}: ${m[1]!.trim().slice(0, 80)}`)
    );
    expect(delicados).toEqual([]);
  });

  it('las rutas de la API que escriben datos registran con el identificador de petición', () => {
    for (const ruta of ['src/app/api/npc/chat/route.ts', 'src/app/api/metrics/save/route.ts']) {
      const codigo = leer(ruta);
      expect(codigo, ruta).toMatch(/idPeticion\(request\)/);
      for (const llamada of codigo.matchAll(/log\.(?:info|warn|error)\('[\w.]+', \{([^}]*)\}/g)) {
        expect(llamada[1], `${ruta}: ${llamada[0]}`).toMatch(/\bpeticion\b/);
      }
    }
  });

  it('el proxy fija el identificador de petición en la petición y en la respuesta', () => {
    const proxy = leer('src/proxy.ts');
    expect(proxy).toMatch(/request\.headers\.set\(ENCABEZADO_PETICION/);
    expect(proxy).toMatch(/response\.headers\.set\(ENCABEZADO_PETICION/);
  });

  it('el layout raíz monta la telemetría del navegador y las pantallas de error la usan', () => {
    expect(leer('src/app/layout.tsx')).toMatch(/<TelemetriaCliente \/>/);
    expect(leer('src/app/error.tsx')).toMatch(/enviarTelemetria\(/);
    expect(leer('src/app/global-error.tsx')).toMatch(/enviarTelemetria\(/);
  });

  it('existe la comprobación de salud y es pública (la consultan monitores sin sesión)', () => {
    expect(statSync(path.join(RAIZ, 'src/app/api/salud/route.ts')).isFile()).toBe(true);
    expect(leer('src/lib/auth/routes.ts')).not.toMatch(/api\/salud/);
  });

  it('el documento de observabilidad lista las alertas que se deben crear en Vercel', () => {
    const doc = leer('docs/observabilidad.md');
    for (const alerta of ['5xx', '429', 'fuga_de_instrucciones', '/api/salud', 'cliente.error']) {
      expect(doc, alerta).toContain(alerta);
    }
  });
});
