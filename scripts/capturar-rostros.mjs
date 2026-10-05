/**
 * Captura un primer plano del rostro de cada paciente 3D (ruta de desarrollo /dev/escena/e-0X) y
 * lo guarda en public/pacientes (PNG de 640 px). Son avatares provisionales: se recortan a un
 * cuadrado sobre el rostro (420 px desde x=110, y=30), se reducen a 256 px y se guardan como
 * WebP con el mismo nombre. Se pueden reemplazar por fotos o ilustraciones propias (WebP
 * cuadrado de 256 a 512 px) usando exactamente el mismo nombre de archivo.
 *
 *   node scripts/capturar-rostros.mjs [baseUrl] [e-01,e-04,…]   (sin lista, captura las seis)
 *
 * Requiere el servidor de desarrollo en marcha.
 */
import { mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { chromium } from '@playwright/test';

const base = process.argv[2] ?? 'http://localhost:3000';
const solo = process.argv[3]?.split(',');
const destino = 'public/pacientes';
mkdirSync(destino, { recursive: true });

/** Archivo de avatar de cada escena (el aspecto del paciente va incluido en la escena). */
const PACIENTES = {
  'e-01': 'marta-lucia',
  'e-02': 'andres-felipe',
  'e-03': 'laura-sofia',
  'e-04': 'julian-david',
  'e-05': 'carolina',
  'e-06': 'santiago',
};

const ALTURA_CABEZA = { sentado: 1.2, 'de-pie': 1.62 };
/** Distancia de la cámara al rostro (m): cuanto menor, más cerca. */
const DISTANCIA = 0.62;

const navegador = await chromium.launch({
  args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--ignore-gpu-blocklist'],
});

for (const [id, nombre] of Object.entries(PACIENTES)) {
  if (solo && !solo.includes(id)) continue;
  const escena = JSON.parse(readFileSync(`public/scenes/${id}.json`, 'utf8'));
  const [x, , z] = escena.npc.posicion;
  const y = ALTURA_CABEZA[escena.npc.postura] ?? 1.2;
  const camara = [x, y + 0.03, z + DISTANCIA].join(',');
  const mirar = [x, y, z].join(',');

  const pagina = await navegador.newPage({ viewport: { width: 640, height: 640 } });
  await pagina.goto(`${base}/dev/escena/${id}?camara=${camara}&mirar=${mirar}`, {
    waitUntil: 'load',
    timeout: 120_000,
  });
  await pagina.waitForSelector('canvas', { timeout: 120_000 });
  await pagina.addStyleTag({
    content: '.absolute.top-3.left-3, nextjs-portal { display: none !important; }',
  });
  await pagina.waitForTimeout(10_000);
  await pagina.screenshot({ path: join(destino, `${nombre}.png`) });
  await pagina.close();
  console.log('capturado', nombre);
}

await navegador.close();
