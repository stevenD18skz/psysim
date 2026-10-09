import { expect, test } from '@playwright/test';

import {
  hayCredenciales,
  hayCredencialesAdmin,
  iniciarSesion,
  iniciarSesionComoAdmin,
  iniciarSesionComoDocente,
  MOTIVO_SIN_ADMIN,
} from './helpers';
import { clienteAdmin } from './flujos';

/** Panel del Administrador: gestión de las cuentas de los docentes (/admin). */

test('un docente no abre el panel del Administrador', async ({ page }) => {
  test.skip(!hayCredenciales, 'Define E2E_DOCENTE_CORREO y E2E_DOCENTE_CONTRASENA');
  await iniciarSesionComoDocente(page);
  await page.goto('/admin');
  await expect(page).toHaveURL(/\/configuracion$/);
  await expect(page.getByRole('link', { name: /Docentes/ })).toHaveCount(0);
});

/** Borra las cuentas que haya dejado una ejecución interrumpida de este archivo. */
async function limpiarDocentesDePrueba() {
  const admin = clienteAdmin();
  if (!admin) return;
  const { data } = await admin
    .from('usuario')
    .select('id')
    .like('correo', 'docente-e2e-%@psysim.test');
  for (const { id } of data ?? []) await admin.auth.admin.deleteUser(id);
}

test.describe('Administrador', () => {
  test.skip(!hayCredencialesAdmin, MOTIVO_SIN_ADMIN);
  test.afterAll(limpiarDocentesDePrueba);

  test('entra a su panel y también trabaja como docente', async ({ page }) => {
    await iniciarSesionComoAdmin(page);
    await expect(page.getByRole('heading', { name: 'Docentes', level: 1 })).toBeVisible();
    await expect(page.getByRole('table', { name: /Docentes y administradores/ })).toBeVisible();

    const menu = page.getByRole('navigation', { name: 'Navegación principal' });
    await menu.getByRole('link', { name: /Nueva sesión/ }).click();
    await expect(page).toHaveURL(/\/configuracion$/);
    await expect(menu.getByRole('link', { name: /Laboratorio/ })).toBeVisible();
  });

  test('crea un docente con contraseña temporal, que entra y debe cambiarla', async ({
    page,
    browser,
  }) => {
    const sufijo = Date.now().toString(36);
    const correo = `docente-e2e-${sufijo}@psysim.test`;
    const nombre = `Docente E2E ${sufijo}`;

    await iniciarSesionComoAdmin(page);
    await page.getByRole('button', { name: 'Nuevo docente' }).click();
    const dialogo = page.getByRole('dialog', { name: 'Nuevo docente' });
    await dialogo.getByLabel('Nombre completo').fill(nombre);
    await dialogo.getByRole('textbox', { name: 'Correo' }).fill(correo);
    await dialogo.getByRole('textbox', { name: 'Código' }).fill(`E2E-${sufijo}`);
    await dialogo.getByText('Contraseña temporal', { exact: true }).click();
    await expect(dialogo.getByRole('radio', { name: 'Contraseña temporal' })).toBeChecked();
    await dialogo.getByRole('button', { name: 'Crear cuenta' }).click();

    const creada = page.getByRole('dialog', { name: 'Cuenta creada' });
    await expect(creada).toBeVisible();
    const contrasena = (await creada.locator('code').textContent())?.trim() ?? '';
    expect(contrasena).toMatch(/^[a-zA-Z2-9]{4}(-[a-zA-Z2-9]{4}){3}$/);
    await creada.getByRole('button', { name: 'Listo' }).click();
    await expect(page.getByRole('link', { name: nombre })).toBeVisible();

    // El docente entra con la contraseña temporal y ve el aviso para cambiarla.
    const contexto = await browser.newContext();
    const docente = await contexto.newPage();
    await iniciarSesion(docente, correo, contrasena);
    await expect(docente).toHaveURL(/\/configuracion$/);
    await expect(docente.getByText(/contraseña temporal/)).toBeVisible();
    await contexto.close();

    // Sin historial se puede eliminar (confirmando con su correo).
    const fila = page.getByRole('row', { name: new RegExp(nombre) });
    await fila.getByRole('button', { name: /Más acciones/ }).click();
    await page.getByRole('menuitem', { name: 'Eliminar cuenta' }).click();
    const confirmar = page.getByRole('dialog', { name: /Eliminar la cuenta/ });
    await confirmar.getByLabel(/Para confirmar/).fill(correo);
    await confirmar.getByRole('button', { name: 'Eliminar cuenta' }).click();
    await expect(page.getByText('Cuenta eliminada.')).toBeVisible();
    await expect(page.getByRole('link', { name: nombre })).toHaveCount(0);
  });
});
