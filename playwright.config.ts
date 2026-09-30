import { existsSync } from 'node:fs';

import { defineConfig, devices } from '@playwright/test';

// Variables locales: Supabase (.env.local) y credenciales de prueba (.env.test.local).
for (const archivo of ['.env.local', '.env.test.local']) {
  if (existsSync(archivo)) process.loadEnvFile(archivo);
}

const PUERTO = 3000;
/** URL externa (p. ej. el despliegue de staging). Si no se define, se levanta `pnpm dev`. */
const urlExterna = process.env.PLAYWRIGHT_BASE_URL;
const bypassVercel = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: urlExterna ?? `http://localhost:${PUERTO}`,
    trace: 'on-first-retry',
    locale: 'es-CO',
    // Permite ejecutar los tests contra previews de Vercel con Deployment Protection.
    extraHTTPHeaders: bypassVercel
      ? { 'x-vercel-protection-bypass': bypassVercel, 'x-vercel-set-bypass-cookie': 'true' }
      : undefined,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: urlExterna
    ? undefined
    : {
        command: 'pnpm dev',
        url: `http://localhost:${PUERTO}`,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
