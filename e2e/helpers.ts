import { type BrowserContext, type Page, expect } from '@playwright/test';

export const docente = {
  correo: process.env.E2E_DOCENTE_CORREO ?? '',
  contrasena: process.env.E2E_DOCENTE_CONTRASENA ?? '',
};

export const sinRol = {
  correo: process.env.E2E_SIN_ROL_CORREO ?? '',
  contrasena: process.env.E2E_SIN_ROL_CONTRASENA ?? '',
};

export const estudiante = {
  correo: process.env.E2E_ESTUDIANTE_CORREO ?? '',
  contrasena: process.env.E2E_ESTUDIANTE_CONTRASENA ?? '',
};

/** Otro estudiante, para comprobar que un código ajeno no sirve. */
export const estudiante2 = {
  correo: process.env.E2E_ESTUDIANTE2_CORREO ?? '',
  contrasena: process.env.E2E_ESTUDIANTE2_CONTRASENA ?? '',
};

/** Administrador de prueba (`pnpm db:seed` crea admin@psysim.test). */
export const administrador = {
  correo: process.env.E2E_ADMIN_CORREO ?? '',
  contrasena: process.env.E2E_ADMIN_CONTRASENA ?? '',
};

export const hayCredenciales = Boolean(docente.correo && docente.contrasena);
export const hayCredencialesAdmin = Boolean(administrador.correo && administrador.contrasena);
export const MOTIVO_SIN_ADMIN = 'Define E2E_ADMIN_CORREO y E2E_ADMIN_CONTRASENA (pnpm db:seed)';

/**
 * Los flujos del estudiante necesitan su cuenta de prueba (con contraseña: los reales entran con
 * Google, que no se puede automatizar) y la clave secreta para preparar datos.
 */
export const hayCredencialesEstudiante = Boolean(
  hayCredenciales && estudiante.correo && estudiante.contrasena && process.env.SUPABASE_SECRET_KEY
);
export const MOTIVO_SIN_ESTUDIANTE =
  'Define E2E_ESTUDIANTE_CORREO, E2E_ESTUDIANTE_CONTRASENA y SUPABASE_SECRET_KEY (pnpm db:seed)';

export async function iniciarSesion(page: Page, correo: string, contrasena: string) {
  await page.goto('/login');
  await page.getByLabel('Correo institucional').fill(correo);
  await page.getByLabel('Contraseña', { exact: true }).fill(contrasena);
  await page.getByRole('button', { name: 'Iniciar sesión' }).click();
}

export async function iniciarSesionComoDocente(page: Page) {
  await iniciarSesion(page, docente.correo, docente.contrasena);
  await expect(page).toHaveURL(/\/configuracion$/);
}

export async function iniciarSesionComoAdmin(page: Page) {
  await iniciarSesion(page, administrador.correo, administrador.contrasena);
  await expect(page).toHaveURL(/\/admin$/);
}

export async function iniciarSesionComoEstudiante(page: Page, cuenta = estudiante) {
  await iniciarSesion(page, cuenta.correo, cuenta.contrasena);
  await expect(page).toHaveURL(/\/practicas$/);
}

/** Cookies de sesión de Supabase (`sb-<ref>-auth-token`, posiblemente en fragmentos). */
export async function cookiesDeSesion(context: BrowserContext) {
  return (await context.cookies()).filter(c => /^sb-.+-auth-token(\.\d+)?$/.test(c.name));
}

/** Reconstruye y decodifica la sesión guardada en las cookies de Supabase. */
export async function leerSesion(context: BrowserContext): Promise<{ access_token: string }> {
  const fragmentos = (await cookiesDeSesion(context)).sort((a, b) => a.name.localeCompare(b.name));
  const valor = fragmentos.map(c => c.value).join('');
  const json = valor.startsWith('base64-')
    ? Buffer.from(valor.slice('base64-'.length), 'base64url').toString('utf8')
    : decodeURIComponent(valor);
  return JSON.parse(json);
}
