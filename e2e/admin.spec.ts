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
  await expect(page).toHaveURL(/\/inicio$/);
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
    // Aterriza en su bandeja, con la navegación de administración.
    await expect(page.getByRole('navigation', { name: 'Administración' })).toBeVisible();
    const menu = page.getByRole('navigation', { name: 'Navegación principal' });
    await menu.getByRole('link', { name: /Docentes/ }).click();
    await expect(page).toHaveURL(/\/admin$/);
    await expect(page.getByRole('heading', { name: 'Docentes', level: 1 })).toBeVisible();
    await expect(page.getByRole('table', { name: /Docentes y administradores/ })).toBeVisible();

    await menu.getByRole('link', { name: /Asignar práctica/ }).click();
    await expect(page).toHaveURL(/\/configuracion$/);
  });

  test('crea un docente con contraseña temporal, que entra y debe cambiarla', async ({
    page,
    browser,
  }) => {
    const sufijo = Date.now().toString(36);
    const correo = `docente-e2e-${sufijo}@psysim.test`;
    const nombre = `Docente E2E ${sufijo}`;

    await iniciarSesionComoAdmin(page);
    await page.goto('/admin');
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

    // El docente entra con la contraseña temporal y el panel no le abre nada hasta que la cambie.
    const contexto = await browser.newContext();
    const docente = await contexto.newPage();
    await iniciarSesion(docente, correo, contrasena);
    await expect(docente).toHaveURL(/\/contrasena$/);
    await expect(
      docente.getByRole('heading', { name: 'Cambia tu contraseña temporal' })
    ).toBeVisible();
    await docente.goto('/estudiantes');
    await expect(docente).toHaveURL(/\/contrasena$/);

    // Al cambiarla entra a su panel.
    const nueva = `frase-e2e-${sufijo}-segura`;
    await docente.getByLabel('Contraseña actual').fill(contrasena);
    await docente.getByLabel('Nueva contraseña', { exact: true }).fill(nueva);
    await docente.getByLabel('Repite la nueva contraseña').fill(nueva);
    await docente.getByRole('button', { name: 'Guardar contraseña' }).click();
    await expect(docente).toHaveURL(/\/inicio$/);
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
