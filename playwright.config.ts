import { existsSync } from 'node:fs';

import { defineConfig, devices } from '@playwright/test';

// Variables locales: Supabase (.env.local) y credenciales de prueba (.env.test.local).
for (const archivo of ['.env.local', '.env.test.local']) {
  if (existsSync(archivo)) process.loadEnvFile(archivo);
}

const PUERTO = 3000;
/**
 * URL externa (p. ej. el despliegue de staging). Si no se define, se levanta `pnpm dev`. `||` y
 * no `??`: una variable declarada pero vacía en el .env (`PLAYWRIGHT_BASE_URL=`) cuenta como no
 * definida; si no, la URL base quedaría vacía y ninguna navegación funcionaría.
 */
const urlExterna = process.env.PLAYWRIGHT_BASE_URL || undefined;
const bypassVercel = process.env.VERCEL_AUTOMATION_BYPASS_SECRET || undefined;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  // Las transiciones esperan Server Actions contra Supabase remoto y, en desarrollo, la primera
  // visita a cada ruta la compila: 5 s (el valor por defecto) se queda corto con la escena 3D
  // renderizándose por software en paralelo.
  expect: { timeout: 15_000 },
  use: {
    baseURL: urlExterna ?? `http://localhost:${PUERTO}`,
    trace: 'on-first-retry',
    locale: 'es-CO',
    // Permite ejecutar los tests contra previews de Vercel con Deployment Protection.
    extraHTTPHeaders: bypassVercel
      ? { 'x-vercel-protection-bypass': bypassVercel, 'x-vercel-set-bypass-cookie': 'true' }
      : undefined,
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // WebGL por software (SwiftShader) para renderizar la escena 3D sin GPU (CI, headless).
        launchOptions: { args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader'] },
      },
    },
  ],
  webServer: urlExterna
    ? undefined
    : {
        command: 'pnpm dev',
        url: `http://localhost:${PUERTO}`,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
