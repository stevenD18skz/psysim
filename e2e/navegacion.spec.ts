import { expect, test } from '@playwright/test';

import {
  hayCredenciales,
  hayCredencialesAdmin,
  hayCredencialesEstudiante,
  iniciarSesionComoAdmin,
  iniciarSesionComoDocente,
  iniciarSesionComoEstudiante,
  MOTIVO_SIN_ADMIN,
  MOTIVO_SIN_ESTUDIANTE,
} from './helpers';

/**
 * Sprint 5 — HU-22: pantalla principal del docente y navegación general.
 * Los escenarios corresponden al registro de pruebas en docs/pruebas/sprint-5.md.
 */

/** Enlaces del menú lateral del docente, con la ruta a la que llevan. */
const ENLACES_DOCENTE = [
  { nombre: 'Inicio', ruta: /\/inicio$/ },
  { nombre: 'Asignar práctica', ruta: /\/configuracion$/ },
  { nombre: 'Revisiones', ruta: /\/sesiones$/ },
  { nombre: 'Estudiantes', ruta: /\/estudiantes$/ },
  { nombre: 'Casos', ruta: /\/configuracion\/casos$/ },
] as const;

test.describe('navegación del docente (HU-22)', () => {
  test.skip(!hayCredenciales, 'Define E2E_DOCENTE_CORREO y E2E_DOCENTE_CONTRASENA');

  test('T01: tras iniciar sesión llega a su bandeja con un saludo y lo pendiente', async ({
    page,
  }) => {
    await iniciarSesionComoDocente(page);
    await expect(page.getByRole('heading', { level: 1 })).toContainText(
      /^(Buenos días|Buenas tardes|Buenas noches|Hola), /
    );
    await expect(page.getByRole('heading', { name: 'Por revisar' })).toBeVisible();
  });

  test('T02: el menú lateral ofrece las cinco secciones del docente', async ({ page }) => {
    await iniciarSesionComoDocente(page);
    const menu = page.getByRole('navigation').filter({ hasText: 'Asignar práctica' });
    for (const { nombre } of ENLACES_DOCENTE) {
      await expect(menu.getByRole('link', { name: new RegExp(`^${nombre}`) })).toBeVisible();
    }
    // El docente no ve la administración de docentes.
    await expect(menu.getByRole('link', { name: 'Docentes' })).toHaveCount(0);
  });

  test('T03: cada enlace lleva a su sección y queda marcado como la página actual', async ({
    page,
  }) => {
    await iniciarSesionComoDocente(page);
    const menu = page.getByRole('navigation').filter({ hasText: 'Asignar práctica' });

    for (const { nombre, ruta } of ENLACES_DOCENTE) {
      await menu.getByRole('link', { name: new RegExp(`^${nombre}`) }).click();
      await expect(page).toHaveURL(ruta);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      // Solo un enlace del menú es la página actual (aria-current).
      const actuales = menu.locator('a[aria-current="page"]');
      await expect(actuales).toHaveCount(1);
      await expect(actuales).toContainText(nombre);
    }
  });

  test('T03: una subpágina mantiene activa su sección y ofrece volver', async ({ page }) => {
    await iniciarSesionComoDocente(page);
    await page.goto('/configuracion/casos/nuevo');

    const menu = page.getByRole('navigation').filter({ hasText: 'Asignar práctica' });
    await expect(menu.locator('a[aria-current="page"]')).toContainText('Casos');
    const volver = page.getByRole('link', { name: /Casos/ }).first();
    await expect(volver).toBeVisible();
  });

  test('T04: el flujo completo: inicio → asignar → revisiones → estudiantes → inicio', async ({
    page,
  }) => {
    await iniciarSesionComoDocente(page);
    const menu = page.getByRole('navigation').filter({ hasText: 'Asignar práctica' });

    for (const nombre of ['Asignar práctica', 'Revisiones', 'Estudiantes', 'Inicio']) {
      await menu.getByRole('link', { name: new RegExp(`^${nombre}`) }).click();
      await expect(menu.locator('a[aria-current="page"]')).toContainText(nombre);
    }
    await expect(page).toHaveURL(/\/inicio$/);

    // «Atrás» del navegador vuelve a la sección anterior con el menú coherente.
    await page.goBack();
    await expect(page).toHaveURL(/\/estudiantes$/);
    await expect(menu.locator('a[aria-current="page"]')).toContainText('Estudiantes');
  });

  test('el logo lleva al inicio desde cualquier sección', async ({ page }) => {
    await iniciarSesionComoDocente(page);
    await page.goto('/estudiantes');
    await page
      .getByRole('link', { name: /PsySim/i })
      .first()
      .click();
    await expect(page).toHaveURL(/\/inicio$/);
  });
});

test.describe('navegación del estudiante (HU-22)', () => {
  test.skip(!hayCredencialesEstudiante, MOTIVO_SIN_ESTUDIANTE);

  test('llega a «Mis prácticas», sin el menú del docente, con la página actual marcada', async ({
    page,
  }) => {
    await iniciarSesionComoEstudiante(page);

    const navegacion = page.getByRole('navigation', { name: 'Navegación principal' });
    await expect(navegacion.getByRole('link', { name: 'Mis prácticas' })).toHaveAttribute(
      'aria-current',
      'page'
    );
    await expect(page.getByRole('link', { name: 'Asignar práctica' })).toHaveCount(0);
  });

  test('las rutas del docente lo devuelven a su inicio', async ({ page }) => {
    await iniciarSesionComoEstudiante(page);
    for (const ruta of ['/configuracion', '/estudiantes', '/sesiones']) {
      await page.goto(ruta);
      await expect(page).toHaveURL(/\/practicas$/);
    }
  });
});

test.describe('navegación del Administrador (HU-22)', () => {
  test.skip(!hayCredencialesAdmin, MOTIVO_SIN_ADMIN);

  test('ve además la sección «Docentes»', async ({ page }) => {
    await iniciarSesionComoAdmin(page);
    const menu = page.getByRole('navigation').filter({ hasText: 'Asignar práctica' });
    await menu.getByRole('link', { name: 'Docentes' }).click();
    await expect(page).toHaveURL(/\/admin$/);
    await expect(menu.locator('a[aria-current="page"]')).toContainText('Docentes');
  });
});
