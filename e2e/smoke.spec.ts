import { expect, test } from '@playwright/test';

/** Sprint 0 · T09 — La URL raíz responde con HTTP 200. */
test('la URL raíz responde 200', async ({ request }) => {
  const respuesta = await request.get('/');
  expect(respuesta.status()).toBe(200);
});

test('la página de login responde 200 y muestra el formulario', async ({ page }) => {
  const respuesta = await page.goto('/login');
  expect(respuesta?.status()).toBe(200);
  await expect(page.getByRole('button', { name: 'Iniciar sesión' })).toBeVisible();
});
