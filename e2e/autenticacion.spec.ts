import { expect, test } from '@playwright/test';

import {
  cookiesDeSesion,
  docente,
  hayCredenciales,
  iniciarSesion,
  iniciarSesionComoDocente,
  leerSesion,
  sinRol,
} from './helpers';
import { clienteAdmin } from './flujos';

/** /simulacion, o la sesión en curso a la que redirige si el docente tiene una. */
const RUTA_SIMULACION = /\/simulacion(\?sesion=[0-9a-f-]{36})?$/;

/**
 * Sprint 1 — HU-02 (login), HU-03 (rutas protegidas) y HU-04 (logout).
 * Los escenarios corresponden al registro de pruebas en docs/pruebas/sprint-1.md.
 */

test.describe('rutas protegidas sin sesión (HU-03)', () => {
  for (const ruta of ['/configuracion', '/simulacion', '/simulacion/sesion', '/estudiantes']) {
    test(`${ruta} redirige a /login`, async ({ page }) => {
      await page.goto(ruta);
      await expect(page).toHaveURL(`/login?siguiente=${encodeURIComponent(ruta)}`);
    });
  }
});

test.describe('con credenciales de prueba', () => {
  test.skip(!hayCredenciales, 'Define E2E_DOCENTE_CORREO y E2E_DOCENTE_CONTRASENA');

  test('HU-02: credenciales incorrectas muestran un error genérico', async ({ page }) => {
    await iniciarSesion(page, docente.correo, 'contrasena-incorrecta');
    await expect(
      page.getByRole('alert').filter({ hasText: 'Correo o contraseña incorrectos.' })
    ).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });

  test('HU-02: el docente inicia sesión y la sesión persiste', async ({ page, context }) => {
    await iniciarSesionComoDocente(page);
    await expect(page.getByRole('heading', { name: 'Prepara la simulación' })).toBeVisible();
    expect(await cookiesDeSesion(context)).not.toHaveLength(0);

    // HU-27 · T02: el saludo usa el nombre del docente (el de la base de datos, si hay acceso).
    const { data: perfil } = (await clienteAdmin()
      ?.from('usuario')
      .select('nombre')
      .eq('correo', docente.correo.toLowerCase())
      .maybeSingle()) ?? { data: null };
    const primerNombre = perfil?.nombre.split(' ')[0];
    await expect(page.getByText(/^Hola, /)).toContainText(
      primerNombre ? `Hola, ${primerNombre}.` : /Hola, \p{L}+\./u
    );

    // Recarga de página.
    await page.reload();
    await expect(page).toHaveURL(/\/configuracion$/);

    // Nueva pestaña.
    const pestana = await context.newPage();
    await pestana.goto('/simulacion');
    // Sin sesión en curso muestra el estado vacío; con una, redirige a ella (Sprint 2).
    await expect(pestana).toHaveURL(RUTA_SIMULACION);
    await expect(pestana).toHaveTitle(/^Simulación · PsySim$/);

    // Con sesión activa, /login redirige a /configuracion sin mostrar el formulario.
    await page.goto('/login');
    await expect(page).toHaveURL(/\/configuracion$/);
  });

  test('HU-02: tras el login vuelve a la ruta solicitada originalmente', async ({ page }) => {
    await page.goto('/simulacion');
    await expect(page).toHaveURL(/\/login\?siguiente=%2Fsimulacion/);
    await page.getByLabel('Correo institucional').fill(docente.correo);
    await page.getByLabel('Contraseña', { exact: true }).fill(docente.contrasena);
    await page.getByRole('button', { name: 'Iniciar sesión' }).click();
    await expect(page).toHaveURL(RUTA_SIMULACION);
  });

  test('HU-03: un token manipulado redirige a /login', async ({ page, context }) => {
    await iniciarSesionComoDocente(page);
    const cookies = await cookiesDeSesion(context);
    await context.clearCookies();
    await context.addCookies(
      cookies.map(c => ({
        ...c,
        value: `base64-${Buffer.from('{"access_token":"x.y.z"}').toString('base64url')}`,
      }))
    );

    await page.goto('/configuracion');
    await expect(page).toHaveURL(/\/login\?siguiente=%2Fconfiguracion/);
  });

  test('HU-03: una sesión revocada o expirada redirige a /login', async ({
    page,
    context,
    request,
  }) => {
    await iniciarSesionComoDocente(page);

    // Revoca la sesión en Supabase por fuera del navegador (como si hubiera expirado).
    const { access_token } = await leerSesion(context);
    const respuesta = await request.post(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/logout?scope=local`,
      {
        headers: {
          apikey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '',
          authorization: `Bearer ${access_token}`,
        },
      }
    );
    expect(respuesta.ok()).toBe(true);

    await page.goto('/configuracion');
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByRole('button', { name: 'Iniciar sesión' })).toBeVisible();
  });

  test('HU-03: una cuenta sin rol docente ve la página de acceso denegado', async ({ page }) => {
    test.skip(!sinRol.correo, 'Define E2E_SIN_ROL_CORREO y E2E_SIN_ROL_CONTRASENA');

    await iniciarSesion(page, sinRol.correo, sinRol.contrasena);
    await expect(page).toHaveURL(/\/acceso-denegado$/);
    await expect(page.getByRole('heading', { name: 'Acceso denegado' })).toBeVisible();

    // No queda ninguna sesión abierta: las rutas protegidas siguen bloqueadas.
    await page.goto('/configuracion');
    await expect(page).toHaveURL(/\/login/);
  });

  test('HU-04: el logout cierra la sesión y bloquea las rutas protegidas', async ({
    page,
    context,
  }) => {
    await iniciarSesionComoDocente(page);
    // El cierre de sesión está en el menú de la cuenta, al pie del menú lateral.
    await page.getByRole('button', { name: /Cuenta de/ }).click();
    await page.getByRole('menuitem', { name: 'Cerrar sesión' }).click();

    await expect(page).toHaveURL(/\/login$/);
    expect(await cookiesDeSesion(context)).toHaveLength(0);

    for (const ruta of ['/configuracion', '/simulacion']) {
      await page.goto(ruta);
      await expect(page).toHaveURL(/\/login\?siguiente=/);
    }

    // El botón "atrás" no muestra una versión en caché de la ruta protegida.
    await page.goBack();
    await expect(page).toHaveURL(/\/login/);
  });
});
