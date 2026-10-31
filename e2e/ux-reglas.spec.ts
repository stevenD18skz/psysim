import { expect, type Page, test } from '@playwright/test';

import {
  hayCredenciales,
  hayCredencialesEstudiante,
  iniciarSesionComoDocente,
  iniciarSesionComoEstudiante,
  MOTIVO_SIN_ESTUDIANTE,
} from './helpers';

/**
 * Reglas de UX medibles en el navegador, aplicadas a cada pantalla en celular y escritorio. Las
 * reglas que dependen de juicio (Hick, Gestalt, Peak-End…) están en docs/auditoria-ux.md; aquí
 * quedan las que una máquina puede comprobar y que no deben volver a romperse:
 *
 * - WCAG 2.5.8 (AA): todo control mide al menos 24 × 24 px (los enlaces dentro de un párrafo, el
 *   enlace «Saltar al contenido» y el riel del menú lateral están exentos).
 * - WCAG 1.3.1 / 2.4.6: un solo `h1` y encabezados sin saltar niveles.
 * - WCAG 1.3.1 / 3.3.2: todo campo tiene una etiqueta.
 * - WCAG 1.3.5: los campos de correo y contraseña declaran `autocomplete`.
 * - WCAG 1.4.10 (reflujo): sin desplazamiento horizontal.
 * - WCAG 4.1.2: todo botón o enlace tiene nombre accesible.
 * - Un solo `main` y un título de página propio.
 */

interface Medicion {
  pequenos: string[];
  saltos: string[];
  h1: number;
  sinEtiqueta: string[];
  sinAutocompletar: string[];
  sinNombre: string[];
  desborde: number;
  main: number;
  titulo: string;
}

/** Se ejecuta dentro de la página. */
function medir(): Medicion {
  const visible = (el: Element) => {
    const r = el.getBoundingClientRect();
    const e = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && e.visibility !== 'hidden' && e.display !== 'none';
  };
  const nombre = (el: Element) =>
    (
      el.getAttribute('aria-label') ||
      el.textContent?.trim().replace(/\s+/g, ' ') ||
      el.tagName
    ).slice(0, 50);

  const esEnLinea = (el: Element) =>
    el.tagName === 'A' &&
    [...(el.parentElement?.childNodes ?? [])].some(n => n.nodeType === 3 && n.textContent?.trim());
  const exento = (el: Element) =>
    el.classList.contains('sr-only') ||
    el.closest('.sr-only') !== null ||
    el.getAttribute('data-sidebar') === 'rail' ||
    (el instanceof HTMLInputElement && el.className.includes('sr-only')) ||
    esEnLinea(el);

  const interactivos = [
    ...document.querySelectorAll(
      'a[href], button, input:not([type=hidden]), select, textarea, [role=button], [role=radio], [role=tab]'
    ),
  ].filter(visible);

  const pequenos = interactivos
    .filter(el => !exento(el))
    .map(el => ({ el, r: el.getBoundingClientRect() }))
    .filter(({ r }) => r.width < 24 || r.height < 24)
    .map(
      ({ el, r }) =>
        `${el.tagName.toLowerCase()} «${nombre(el)}» ${Math.round(r.width)}×${Math.round(r.height)}`
    );

  const niveles = [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')]
    .filter(visible)
    .map(h => Number(h.tagName[1]));
  const saltos = niveles.flatMap((n, i) =>
    i > 0 && n - niveles[i - 1]! > 1 ? [`h${niveles[i - 1]}→h${n}`] : []
  );

  const campos = [
    ...document.querySelectorAll('input:not([type=hidden]), select, textarea'),
  ].filter(visible);
  const sinEtiqueta = campos
    .filter(el => {
      const conLabel = el.id && document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
      return !(
        conLabel ||
        el.closest('label') ||
        el.getAttribute('aria-label') ||
        el.getAttribute('aria-labelledby')
      );
    })
    .map(el => `${el.tagName.toLowerCase()} name=${el.getAttribute('name')}`);

  const sinAutocompletar = campos
    .filter(el => ['email', 'password', 'tel'].includes(el.getAttribute('type') ?? ''))
    .filter(el => !el.getAttribute('autocomplete'))
    .map(el => `input name=${el.getAttribute('name')}`);

  const sinNombre = [...document.querySelectorAll('button, a[href]')]
    .filter(visible)
    .filter(
      el =>
        !(
          el.textContent?.trim() ||
          el.getAttribute('aria-label') ||
          el.getAttribute('aria-labelledby') ||
          el.getAttribute('title')
        )
    )
    .map(el => el.outerHTML.slice(0, 80));

  return {
    pequenos: [...new Set(pequenos)],
    saltos,
    h1: niveles.filter(n => n === 1).length,
    sinEtiqueta,
    sinAutocompletar,
    sinNombre,
    desborde: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    main: document.querySelectorAll('main, [role=main]').length,
    titulo: document.title,
  };
}

const ANCHOS = [
  { nombre: 'celular', width: 390, height: 844 },
  { nombre: 'escritorio', width: 1366, height: 800 },
] as const;

async function comprobar(page: Page, ruta: string) {
  await page.goto(ruta);
  await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
  const m = await page.evaluate(medir);
  const contexto = (regla: string) => `${ruta} · ${regla}`;

  expect(m.pequenos, contexto('controles de menos de 24×24 px (WCAG 2.5.8)')).toEqual([]);
  expect(m.h1, contexto('un solo h1')).toBe(1);
  expect(m.saltos, contexto('encabezados sin saltar niveles')).toEqual([]);
  expect(m.sinEtiqueta, contexto('campos sin etiqueta')).toEqual([]);
  expect(m.sinAutocompletar, contexto('campos sin autocomplete (WCAG 1.3.5)')).toEqual([]);
  expect(m.sinNombre, contexto('botones o enlaces sin nombre')).toEqual([]);
  expect(m.desborde, contexto('desplazamiento horizontal')).toBeLessThanOrEqual(1);
  expect(m.main, contexto('un solo main')).toBe(1);
  expect(m.titulo.trim().length, contexto('título de la página')).toBeGreaterThan(3);
}

test.describe('reglas de UX medibles (pantallas públicas)', () => {
  for (const { nombre, width, height } of ANCHOS) {
    for (const ruta of ['/', '/login', '/privacidad']) {
      test(`${ruta} en ${nombre}`, async ({ page }) => {
        await page.setViewportSize({ width, height });
        await comprobar(page, ruta);
      });
    }
  }
});

test.describe('reglas de UX medibles (panel del docente)', () => {
  test.skip(!hayCredenciales, 'Define E2E_DOCENTE_CORREO y E2E_DOCENTE_CONTRASENA');
  const RUTAS = [
    '/inicio',
    '/configuracion',
    '/sesiones',
    '/estudiantes',
    '/configuracion/casos',
    '/configuracion/casos/nuevo',
  ];

  for (const { nombre, width, height } of ANCHOS) {
    test(`todas las pantallas en ${nombre}`, async ({ page }) => {
      test.slow();
      await page.setViewportSize({ width, height });
      await iniciarSesionComoDocente(page);
      for (const ruta of RUTAS) await comprobar(page, ruta);
    });
  }
});

test.describe('reglas de UX medibles (panel del estudiante)', () => {
  test.skip(!hayCredencialesEstudiante, MOTIVO_SIN_ESTUDIANTE);

  for (const { nombre, width, height } of ANCHOS) {
    test(`«Mis prácticas» en ${nombre}`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      await iniciarSesionComoEstudiante(page);
      await comprobar(page, '/practicas');
    });
  }
});
