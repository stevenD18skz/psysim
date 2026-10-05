/**
 * Captura la escena 3D de cada consultorio (ruta de desarrollo /dev/escena/e-0X) para usarla en
 * la página pública. Requiere el servidor de desarrollo en marcha.
 *
 *   node scripts/capturar-escenas.mjs [baseUrl] [carpetaDestino]
 */
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

import { chromium } from '@playwright/test';

const base = process.argv[2] ?? 'http://localhost:3000';
const destino = process.argv[3] ?? 'tmp-capturas';
mkdirSync(destino, { recursive: true });

const navegador = await chromium.launch({
  args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--ignore-gpu-blocklist'],
});

/** Planos: la cámara por defecto de cada escena y un plano más cercano y en ángulo para el hero. */
const planos = [
  ...['e-01', 'e-02', 'e-03', 'e-04', 'e-05', 'e-06'].map(id => ({ id, nombre: id, consulta: '' })),
  { id: 'e-01', nombre: 'hero', consulta: '?camara=0.9,1.45,0.8&mirar=-0.1,1.1,-1.95' },
];

for (const { id, nombre, consulta } of planos) {
  const pagina = await navegador.newPage({ viewport: { width: 1600, height: 1000 } });
  await pagina.goto(`${base}/dev/escena/${id}${consulta}`, { waitUntil: 'load', timeout: 120_000 });
  await pagina.waitForSelector('canvas', { timeout: 120_000 });
  // Oculta las herramientas de desarrollo (FPS, botón Explorar, ruta del archivo).
  await pagina.addStyleTag({
    content: '.absolute.top-3.left-3, nextjs-portal { display: none !important; }',
  });
  // Deja que carguen los modelos y se asiente la animación del paciente.
  await pagina.waitForTimeout(12_000);
  await pagina.screenshot({ path: join(destino, `${nombre}.png`) });
  await pagina.close();
  console.log('capturada', nombre);
}

await navegador.close();
