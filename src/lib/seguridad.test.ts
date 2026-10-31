import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

/**
 * HU-29 · T02 — Checklist de seguridad antes del despliegue beta, automatizado: lo que se puede
 * comprobar leyendo el repositorio se comprueba aquí en cada `pnpm test`, no una sola vez a mano.
 * Lo que depende del proyecto de Vercel o de Supabase en producción queda en
 * docs/pruebas/sprint-6.md.
 */
const RAIZ = process.cwd();

function archivos(carpeta: string, patron: RegExp): string[] {
  return readdirSync(carpeta).flatMap(nombre => {
    const ruta = path.join(carpeta, nombre);
    if (statSync(ruta).isDirectory()) return archivos(ruta, patron);
    return patron.test(nombre) ? [ruta] : [];
  });
}

const leer = (ruta: string) => readFileSync(ruta, 'utf8');
const relativa = (ruta: string) => path.relative(RAIZ, ruta).replaceAll('\\', '/');

const MIGRACIONES = archivos(path.join(RAIZ, 'supabase/migrations'), /\.sql$/)
  .sort()
  .map(ruta => ({ ruta: relativa(ruta), sql: leer(ruta) }));
const SQL = MIGRACIONES.map(m => m.sql).join('\n');

const FUENTES = archivos(path.join(RAIZ, 'src'), /\.(ts|tsx)$/).filter(
  ruta => !/\.test\.tsx?$/.test(ruta)
);

describe('base de datos (Supabase)', () => {
  it('toda tabla de public tiene RLS activado', () => {
    const creadas = new Set(
      [...SQL.matchAll(/create table (?:if not exists )?public\.(\w+)/gi)].map(([, t]) => t!)
    );
    const eliminadas = new Set(
      [...SQL.matchAll(/drop table (?:if exists )?public\.(\w+)/gi)].map(([, t]) => t!)
    );
    const conRls = new Set(
      [...SQL.matchAll(/alter table public\.(\w+)\s+enable row level security/gi)].map(
        ([, t]) => t!
      )
    );

    const sinRls = [...creadas].filter(t => !eliminadas.has(t) && !conRls.has(t));
    expect(creadas.size, 'No se leyó ninguna tabla').toBeGreaterThan(5);
    expect(sinRls).toEqual([]);
  });

  it('el rol anónimo no recibe permisos sobre tablas ni funciones', () => {
    const concesiones = [...SQL.matchAll(/^\s*grant\b[^;]*\bto\b[^;]*\banon\b[^;]*;/gim)];
    expect(concesiones.map(([texto]) => texto.trim())).toEqual([]);
  });

  it('toda función security definer fija su search_path', () => {
    // Cabecera: desde «create function» hasta el cuerpo (`as $$` o `as $f$`).
    const funciones = [
      ...SQL.matchAll(/create (?:or replace )?function[\s\S]*?\bas\s+\$\w*\$/gi),
    ].map(([cabecera]) => cabecera);
    const definer = funciones.filter(f => /security definer/i.test(f));

    expect(definer.length, 'No se leyó ninguna función security definer').toBeGreaterThan(5);
    const sinRuta = definer.filter(f => !/set search_path\s*=/i.test(f));
    expect(sinRuta.map(f => f.split('(')[0]!.trim())).toEqual([]);
  });

  it('las funciones security definer no se pueden ejecutar sin sesión', () => {
    // Las que escriben datos (reservar, guardar, canjear…) piden rol dentro de la función.
    const guardar = leer(path.join(RAIZ, 'supabase/migrations/20261025010000_metricas_sesion.sql'));
    expect(guardar).toMatch(
      /revoke execute on function public\.guardar_metricas_cierre[\s\S]*?from public, anon/i
    );
    expect(guardar).toMatch(/es_estudiante\(\)/);
  });
});

describe('secretos', () => {
  it('ningún componente de cliente usa la clave secreta ni el cliente de administración', () => {
    const delCliente = FUENTES.filter(ruta =>
      /^\s*['"]use client['"]/.test(leer(ruta).trimStart())
    );
    expect(delCliente.length).toBeGreaterThan(20);
    const infractores = delCliente.filter(ruta => {
      const texto = leer(ruta);
      return /SUPABASE_SECRET_KEY|supabase\/admin|AI_API_KEY/.test(texto);
    });
    expect(infractores.map(relativa)).toEqual([]);
  });

  it('los módulos con la clave secreta solo se importan desde el servidor', () => {
    for (const modulo of [
      'src/lib/supabase/admin.ts',
      'src/lib/env/server.ts',
      'src/lib/env/ia.ts',
    ]) {
      expect(leer(path.join(RAIZ, modulo)), modulo).toMatch(/import ['"]server-only['"]/);
    }
  });

  it('ninguna variable NEXT_PUBLIC_ lleva un secreto', () => {
    const publicas = new Set<string>();
    for (const ruta of FUENTES) {
      for (const [, nombre] of leer(ruta).matchAll(/process\.env\.(NEXT_PUBLIC_[A-Z0-9_]+)/g)) {
        publicas.add(nombre!);
      }
    }
    expect(publicas.size).toBeGreaterThan(1);
    // «PUBLISHABLE» es la clave pensada para el navegador (protegida por RLS).
    const sospechosas = [...publicas].filter(
      nombre => /SECRET|SERVICE|PRIVATE|PASSWORD|TOKEN/.test(nombre) && !/PUBLISHABLE/.test(nombre)
    );
    expect(sospechosas).toEqual([]);
  });

  it('los archivos .env locales están ignorados por git', () => {
    const ignorados = leer(path.join(RAIZ, '.gitignore'));
    expect(ignorados).toMatch(/^\.env\*?\.?local$|^\.env\.local$|^\.env\*$/m);
    expect(ignorados).toMatch(/\.env/);
  });
});

describe('Route Handlers', () => {
  const handlers = archivos(path.join(RAIZ, 'src/app'), /^route\.ts$/);

  it('los que modifican datos exigen una sesión válida', () => {
    // Públicos a propósito: el retorno de Google; la salud (solo dice «ok») y la telemetría del
    // navegador, que no leen ni guardan datos de personas y se protegen por origen, tamaño y tasa.
    const publicos = new Set([
      'src/app/auth/callback/route.ts',
      'src/app/api/salud/route.ts',
      'src/app/api/telemetria/route.ts',
    ]);
    const sinSesion = handlers
      .map(relativa)
      .filter(ruta => !publicos.has(ruta))
      .filter(ruta => !/obtenerSesionUsuario|requerir\w+\(/.test(leer(path.join(RAIZ, ruta))));
    expect(handlers.length).toBeGreaterThan(2);
    expect(sinSesion).toEqual([]);
  });

  it('las respuestas con datos del usuario no se guardan en caché', () => {
    for (const ruta of ['src/app/api/npc/chat/route.ts', 'src/app/api/metrics/save/route.ts']) {
      expect(leer(path.join(RAIZ, ruta)), ruta).toContain("'Cache-Control': 'no-store'");
    }
  });
});

describe('encabezados de seguridad (next.config.ts)', () => {
  const config = leer(path.join(RAIZ, 'next.config.ts'));

  it.each([
    ['X-Frame-Options', 'DENY'],
    ['X-Content-Type-Options', 'nosniff'],
    ['Referrer-Policy', 'strict-origin-when-cross-origin'],
    ['Permissions-Policy', 'camera=()'],
  ])('envía %s', (encabezado, valor) => {
    expect(config).toContain(encabezado);
    expect(config).toContain(valor);
  });

  it('no anuncia que usa Next.js', () => {
    expect(config).toContain('poweredByHeader: false');
  });

  it('se aplican a todas las rutas', () => {
    expect(config).toMatch(/source: '\/:path\*'/);
  });
});
