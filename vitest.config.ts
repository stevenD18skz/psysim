import { fileURLToPath } from 'node:url';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  resolve: {
    tsconfigPaths: true,
    alias: {
      // `server-only` lanza un error fuera de React Server Components; en tests se neutraliza.
      'server-only': fileURLToPath(new URL('./test/server-only.ts', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}', 'test/**/*.test.{ts,tsx}'],
    setupFiles: ['./test/setup.ts'],
    // Valores ficticios: los tests nunca contactan con Supabase.
    env: {
      NEXT_PUBLIC_SUPABASE_URL: 'http://localhost:54321',
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test',
      SUPABASE_SECRET_KEY: 'sb_secret_test',
      AI_API_KEY: 'ai_key_test',
    },
    // Los tests de formularios escriben tecla a tecla (userEvent): con la instrumentación de
    // cobertura o la máquina cargada superan los 5 s por defecto sin que nada falle.
    testTimeout: 15_000,
    clearMocks: true,
    restoreMocks: true,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/components/ui/**',
        'src/types/**',
        'src/**/*.test.{ts,tsx}',
        // HU-26 · T04: JSDOM no tiene WebGL. La escena 3D (componentes de React Three Fiber) se
        // prueba con Playwright; su lógica vive en src/lib (escena, npc), que sí se mide.
        'src/components/3d/**',
        'src/components/npc/**',
        'src/components/dev/**',
        'src/components/simulacion/escena-simulacion.tsx',
      ],
      reporter: ['text-summary', 'html', 'json-summary'],
      // HU-26 · T04: cobertura mínima del 70 % en Route Handlers, utilidades y store.
      // `pnpm test:coverage` falla si alguna carpeta queda por debajo. Reporte en coverage/.
      thresholds: {
        'src/app/api/**': { lines: 70, statements: 70, functions: 70, branches: 70 },
        'src/lib/**': { lines: 70, statements: 70, functions: 70, branches: 70 },
        'src/store/**': { lines: 70, statements: 70, functions: 70, branches: 70 },
      },
    },
  },
});
