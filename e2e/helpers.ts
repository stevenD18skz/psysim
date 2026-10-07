import { type BrowserContext, type Page, expect } from '@playwright/test';

export const docente = {
  correo: process.env.E2E_DOCENTE_CORREO ?? '',
  contrasena: process.env.E2E_DOCENTE_CONTRASENA ?? '',
};

export const sinRol = {
  correo: process.env.E2E_SIN_ROL_CORREO ?? '',
  contrasena: process.env.E2E_SIN_ROL_CONTRASENA ?? '',
};

export const hayCredenciales = Boolean(docente.correo && docente.contrasena);

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
