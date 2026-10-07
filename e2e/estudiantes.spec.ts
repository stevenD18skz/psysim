import { expect, test } from '@playwright/test';

import { limpiarPorCodigo, prepararSesion } from './flujos';
import { hayCredenciales, iniciarSesionComoDocente } from './helpers';

/**
 * Registro de estudiantes: al iniciar su primera sesión el estudiante queda registrado, aparece
 * en /estudiantes con sus métricas y, cuando vuelve, se elige desde el buscador.
 */

const CODIGO_PRUEBAS = '2099300';
const ESTUDIANTE = { codigo: `${CODIGO_PRUEBAS}01`, nombre: 'Estudiante Registro Prueba' };

test.describe('registro de estudiantes', () => {
  test.skip(!hayCredenciales, 'Define E2E_DOCENTE_CORREO y E2E_DOCENTE_CONTRASENA');
  test.describe.configure({ mode: 'serial' });

  test.beforeAll(() => limpiarPorCodigo(CODIGO_PRUEBAS));
  test.afterAll(() => limpiarPorCodigo(CODIGO_PRUEBAS));

  test.beforeEach(async ({ page }) => {
    await iniciarSesionComoDocente(page);
  });

  test('un estudiante nuevo queda registrado al iniciar su primera sesión', async ({ page }) => {
    await page.getByTestId('escenario-E-01').click();
    await page.getByLabel('Código institucional').fill(ESTUDIANTE.codigo);
    await expect(page.getByText(/Estudiante nuevo: quedará registrado/)).toBeVisible();

    await prepararSesion(page, { escenario: 'E-01', estudiante: ESTUDIANTE });

    await page.goto('/estudiantes');
    await expect(page.getByRole('heading', { name: 'Estudiantes', level: 1 })).toBeVisible();
    await page.getByLabel('Buscar estudiante').fill(ESTUDIANTE.codigo);
    const fila = page.getByRole('row', { name: new RegExp(ESTUDIANTE.nombre) });
    await expect(fila).toContainText(ESTUDIANTE.codigo);
    await expect(fila).toContainText('1 sesión');
  });

  test('"Nueva sesión" desde /estudiantes llega con el estudiante cargado', async ({ page }) => {
    await page.goto('/estudiantes');
    await page.getByLabel('Buscar estudiante').fill(ESTUDIANTE.nombre);
    await page
      .getByRole('row', { name: new RegExp(ESTUDIANTE.nombre) })
      .getByRole('link', { name: 'Nueva sesión' })
      .click();

    await expect(page).toHaveURL(new RegExp(`/configuracion\\?estudiante=${ESTUDIANTE.codigo}`));
    await expect(page.getByLabel('Código institucional')).toHaveValue(ESTUDIANTE.codigo);
    await expect(page.getByLabel('Nombre completo')).toHaveValue(ESTUDIANTE.nombre);
    await expect(page.getByText('Estudiante registrado')).toBeVisible();
  });

  test('el buscador encuentra al estudiante por nombre y llena el formulario', async ({ page }) => {
    const buscador = page.getByRole('combobox', { name: '¿Ya practicó antes?' });
    await buscador.fill('registro prueba');
    await page.getByRole('option', { name: new RegExp(ESTUDIANTE.nombre) }).click();

    await expect(page.getByLabel('Código institucional')).toHaveValue(ESTUDIANTE.codigo);
    await expect(page.getByLabel('Nombre completo')).toHaveValue(ESTUDIANTE.nombre);

    // Si se escribe otro nombre para el mismo código, se ofrece usar el registrado.
    await page.getByLabel('Nombre completo').fill('Otro Nombre');
    await page.getByRole('button', { name: `Usar «${ESTUDIANTE.nombre}»` }).click();
    await expect(page.getByLabel('Nombre completo')).toHaveValue(ESTUDIANTE.nombre);
  });
});
