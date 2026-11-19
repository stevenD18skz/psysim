/**
 * Captura imágenes 2x nítidas para la página pública:
 * - Retratos 4:5 (1280x1600) de los 12 consultorios para el hero alternante (`public/simulacion/hero/e-XX.webp`)
 * - Capturas 16:10 (1600x1000) más cercanas para las 12 tarjetas (`public/simulacion/*.webp`)
 * - Capturas 16:10 (1600x1000) de los 5 pasos de «Cómo funciona» (`public/pasos/paso-X.webp`)
 *
 *   node scripts/capturar-landing.mjs [baseUrl]
 */
import { mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { chromium } from '@playwright/test';
import sharp from 'sharp';

const base = process.argv[2] ?? 'http://localhost:3199';

const ESCENAS = [
  { codigo: 'e-01', archivo: 'consultorio-duelo-y-perdida.webp' },
  { codigo: 'e-02', archivo: 'consultorio-ansiedad-generalizada.webp' },
  { codigo: 'e-03', archivo: 'consultorio-episodio-depresivo.webp' },
  { codigo: 'e-04', archivo: 'sala-crisis-de-panico.webp' },
  { codigo: 'e-05', archivo: 'sala-conflicto-de-pareja.webp' },
  { codigo: 'e-06', archivo: 'oficina-estres-academico.webp' },
  { codigo: 'e-07', archivo: 'consultorio-consumo-de-alcohol.webp' },
  { codigo: 'e-08', archivo: 'sala-trauma-por-desplazamiento.webp' },
  { codigo: 'e-09', archivo: 'orientacion-adolescente-autolesiones.webp' },
  { codigo: 'e-10', archivo: 'consultorio-conducta-alimentaria.webp' },
  { codigo: 'e-11', archivo: 'consultorio-violencia-en-la-pareja.webp' },
  { codigo: 'e-12', archivo: 'sala-soledad-y-olvidos.webp' },
];

mkdirSync('public/simulacion/hero', { recursive: true });
mkdirSync('public/pasos', { recursive: true });

const navegador = await chromium.launch({
  args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--ignore-gpu-blocklist'],
});

async function aWebp(buffer, ruta, quality = 90) {
  await sharp(buffer).webp({ quality, effort: 6 }).toFile(ruta);
}

for (const { codigo, archivo } of ESCENAS) {
  const escena = JSON.parse(readFileSync(join('public/scenes', `${codigo}.json`), 'utf8'));
  const [nx, , nz] = escena.npc.posicion;
  const dePie = escena.npc.postura === 'de-pie';
  const mirarY = dePie ? 1.32 : 1.04;

  // 1) Retrato 4:5 (1280x1600) cercano en ángulo 3/4 para el vano del hero.
  const camHeroX = Math.min(2.1, Math.max(-2.1, nx + 0.72));
  const camHeroY = dePie ? 1.58 : 1.4;
  const camHeroZ = nz + 2.55;
  const ctxHero = await navegador.newContext({
    viewport: { width: 640, height: 800 },
    deviceScaleFactor: 2,
  });
  const pagHero = await ctxHero.newPage();
  await pagHero.goto(
    `${base}/dev/escena/${codigo}?camara=${camHeroX},${camHeroY},${camHeroZ}&mirar=${nx - 0.04},${mirarY},${nz}`,
    { waitUntil: 'load', timeout: 120_000 }
  );
  await pagHero.waitForSelector('canvas', { timeout: 120_000 });
  await pagHero.addStyleTag({
    content: '.absolute.top-3.left-3, nextjs-portal { display: none !important; }',
  });
  await pagHero.waitForTimeout(9_000);
  const bufHero = await pagHero.screenshot({ type: 'png' });
  await aWebp(bufHero, join('public/simulacion/hero', `${codigo}.webp`), 90);
  await ctxHero.close();

  // 2) Captura 16:10 (1600x1000) más cercana y nítida para tarjetas y visor de detalle.
  const camCardX = Math.min(2.1, Math.max(-2.1, nx * 0.45));
  const camCardY = dePie ? 1.56 : 1.46;
  const camCardZ = nz + 3.45;
  const ctxCard = await navegador.newContext({
    viewport: { width: 800, height: 500 },
    deviceScaleFactor: 2,
  });
  const pagCard = await ctxCard.newPage();
  await pagCard.goto(
    `${base}/dev/escena/${codigo}?camara=${camCardX},${camCardY},${camCardZ}&mirar=${nx},${mirarY},${nz}`,
    { waitUntil: 'load', timeout: 120_000 }
  );
  await pagCard.waitForSelector('canvas', { timeout: 120_000 });
  await pagCard.addStyleTag({
    content: '.absolute.top-3.left-3, nextjs-portal { display: none !important; }',
  });
  await pagCard.waitForTimeout(9_000);
  const bufCard = await pagCard.screenshot({ type: 'png' });
  await aWebp(bufCard, join('public/simulacion', archivo), 90);
  await ctxCard.close();

  console.log('capturada escena', codigo);
}

// 3) Capturas 2x (1600x1000) de los 5 pasos de «Cómo funciona».
const ctxPasos = await navegador.newContext({
  viewport: { width: 1200, height: 900 },
  deviceScaleFactor: 2,
});
const pagPasos = await ctxPasos.newPage();
await pagPasos.goto(`${base}/dev/pasos`, { waitUntil: 'networkidle', timeout: 120_000 });
await pagPasos.addStyleTag({ content: 'nextjs-portal { display: none !important; }' });
await pagPasos.evaluate(() => document.fonts.ready);

for (let i = 1; i <= 5; i++) {
  const el = pagPasos.locator(`[data-paso="${i}"]`);
  const buf = await el.screenshot({ type: 'png' });
  await aWebp(buf, join('public/pasos', `paso-${i}.webp`), 92);
  console.log('capturado paso', i);
}

await ctxPasos.close();
await navegador.close();
