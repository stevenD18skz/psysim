import AxeBuilder from '@axe-core/playwright';
import { expect, type Page, test } from '@playwright/test';

import {
  hayCredenciales,
  hayCredencialesEstudiante,
  iniciarSesionComoDocente,
  iniciarSesionComoEstudiante,
  MOTIVO_SIN_ESTUDIANTE,
} from './helpers';

/**
 * Sprint 5 — HU-25: accesibilidad y diseño responsivo.
 *
 * - T01/T03: axe-core revisa cada pantalla contra WCAG 2.1 A y AA (contraste real renderizado,
 *   nombres accesibles, roles ARIA válidos, etiquetas de formulario…).
 * - T02: la navegación por teclado alcanza los controles y el enlace «Saltar al contenido».
 * - T04/T05: en celular, tableta y escritorio no hay desplazamiento horizontal.
 *
 * Los escenarios corresponden al registro de pruebas en docs/pruebas/sprint-5.md.
 */

const ETIQUETAS_WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

async function auditar(page: Page) {
  const { violations } = await new AxeBuilder({ page }).withTags(ETIQUETAS_WCAG).analyze();
  // Mensaje legible si falla: regla, impacto y los elementos afectados.
  const resumen = violations.map(
    v => `${v.id} (${v.impact}): ${v.nodes.map(n => n.target.join(' ')).join(' | ')}`
  );
  expect(resumen, 'Violaciones de accesibilidad').toEqual([]);
}

const VIEWPORTS = [
  { nombre: 'celular', width: 375, height: 667 },
  { nombre: 'tableta', width: 768, height: 1024 },
  { nombre: 'escritorio', width: 1280, height: 800 },
] as const;

async function sinDesplazamientoHorizontal(page: Page) {
  const exceso = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth
  );
  expect(exceso, 'Píxeles que se salen del ancho de la pantalla').toBeLessThanOrEqual(1);
}

test.describe('pantallas públicas (HU-25)', () => {
  for (const ruta of ['/', '/login', '/privacidad']) {
    test(`T03: ${ruta} cumple WCAG 2.1 AA según axe`, async ({ page }) => {
      await page.goto(ruta);
      await expect(page.locator('main, [role="main"]').first()).toBeVisible();
      await auditar(page);
    });

    for (const { nombre, width, height } of VIEWPORTS) {
      test(`T04: ${ruta} en ${nombre} (${width}×${height}) no se desborda`, async ({ page }) => {
        await page.setViewportSize({ width, height });
        await page.goto(ruta);
        await sinDesplazamientoHorizontal(page);
      });
    }
  }

  test('T02: el formulario de acceso se recorre con el teclado', async ({ page }) => {
    await page.goto('/login?docente=1');
    const correo = page.getByLabel('Correo institucional');
    const contrasena = page.getByLabel('Contraseña', { exact: true });
    const entrar = page.getByRole('button', { name: 'Entrar', exact: true });

    await correo.focus();
    await page.keyboard.press('Tab');
    await expect(contrasena).toBeFocused();
    // El botón de mostrar la contraseña está entre el campo y «Entrar».
    await page.keyboard.press('Tab');
    await expect(page.getByRole('button', { name: /contraseña/i }).first()).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(entrar).toBeFocused();
  });

  test('T02: el error del formulario se anuncia a los lectores de pantalla', async ({ page }) => {
    await page.goto('/login?docente=1');
    await page.getByLabel('Correo institucional').fill('nadie@correounivalle.edu.co');
    await page.getByLabel('Contraseña', { exact: true }).fill('contrasena-incorrecta');
    await page.keyboard.press('Enter');
    await expect(
      page.getByRole('alert').filter({ hasText: 'Correo o contraseña incorrectos.' })
    ).toBeVisible();
  });

  test('T03: los campos del login tienen etiqueta y nombre accesible', async ({ page }) => {
    await page.goto('/login?docente=1');
    await expect(page.getByRole('textbox', { name: 'Correo institucional' })).toBeVisible();
    await expect(page.getByLabel('Contraseña', { exact: true })).toBeVisible();
  });
});

test.describe('panel del docente (HU-25)', () => {
  test.skip(!hayCredenciales, 'Define E2E_DOCENTE_CORREO y E2E_DOCENTE_CONTRASENA');

  const PANTALLAS = [
    '/inicio',
    '/configuracion',
    '/sesiones',
    '/estudiantes',
    '/configuracion/casos',
  ];

  test('T03: cada pantalla cumple WCAG 2.1 AA según axe', async ({ page }) => {
    test.slow();
    await iniciarSesionComoDocente(page);
    for (const ruta of PANTALLAS) {
      await page.goto(ruta);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await auditar(page);
    }
  });

  test('T02: el primer Tab ofrece «Saltar al contenido» y lleva al contenido', async ({ page }) => {
    await iniciarSesionComoDocente(page);
    await page.goto('/estudiantes');
    await page.keyboard.press('Tab');

    const saltar = page.getByRole('link', { name: 'Saltar al contenido' });
    await expect(saltar).toBeFocused();
    await expect(saltar).toBeVisible();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/#contenido$/);
  });

  test('T02: el menú lateral se recorre con Tab y se activa con Enter', async ({ page }) => {
    await iniciarSesionComoDocente(page);
    await page.goto('/inicio');
    const enlace = page.getByRole('link', { name: /^Revisiones/ });
    await enlace.focus();
    await expect(enlace).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/sesiones$/);
  });

  for (const { nombre, width, height } of VIEWPORTS) {
    test(`T04: las pantallas del docente en ${nombre} no se desbordan`, async ({ page }) => {
      test.slow();
      await page.setViewportSize({ width, height });
      await iniciarSesionComoDocente(page);
      for (const ruta of PANTALLAS) {
        await page.goto(ruta);
        await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
        await sinDesplazamientoHorizontal(page);
      }
    });
  }

  test('T04: en celular el menú se abre desde su botón', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await iniciarSesionComoDocente(page);
    await page
      .getByRole('button', { name: /menú|sidebar/i })
      .first()
      .click();
    await expect(page.getByRole('link', { name: /^Revisiones/ })).toBeVisible();
  });

  test('T05: el texto base es legible (≥ 16 px) y se respeta el zoom del 200 %', async ({
    page,
  }) => {
    await iniciarSesionComoDocente(page);
    const tamano = await page.evaluate(() =>
      Number.parseFloat(getComputedStyle(document.body).fontSize)
    );
    expect(tamano).toBeGreaterThanOrEqual(16);

    // Zoom del 200 % equivale a la mitad del ancho: el contenido no debe desbordarse.
    await page.setViewportSize({ width: 640, height: 400 });
    await page.goto('/inicio');
    await sinDesplazamientoHorizontal(page);
  });
});

test.describe('panel del estudiante (HU-25)', () => {
  test.skip(!hayCredencialesEstudiante, MOTIVO_SIN_ESTUDIANTE);

  test('T03: «Mis prácticas» cumple WCAG 2.1 AA según axe', async ({ page }) => {
    await iniciarSesionComoEstudiante(page);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await auditar(page);
  });

  for (const { nombre, width, height } of VIEWPORTS) {
    test(`T04: «Mis prácticas» en ${nombre} no se desborda`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      await iniciarSesionComoEstudiante(page);
      await sinDesplazamientoHorizontal(page);
    });
  }
});
