/**
 * Rendimiento web (Core Web Vitals) — Recomprime los PNG de la aplicación con paleta de colores,
 * sin cambiar sus dimensiones. Solo sobrescribe un archivo si queda al menos un 10 % más liviano.
 *
 *   node scripts/optimizar-imagenes.mjs src/app/icon.png src/app/apple-icon.png
 *
 * El ícono de 512 px pesaba 263 KiB y el navegador lo descarga en la primera visita.
 */
import { readFileSync, statSync, writeFileSync } from 'node:fs';

import sharp from 'sharp';

const archivos = process.argv.slice(2);
if (archivos.length === 0) {
  console.error('Uso: node scripts/optimizar-imagenes.mjs <imagen.png> [...]');
  process.exit(1);
}

for (const archivo of archivos) {
  const antes = statSync(archivo).size;
  const optimizada = await sharp(readFileSync(archivo))
    .png({ palette: true, quality: 85, effort: 10, compressionLevel: 9 })
    .toBuffer();
  const ahorro = 1 - optimizada.length / antes;
  if (ahorro < 0.1) {
    console.log(`= ${archivo}: ya es liviana (${Math.round(antes / 1024)} KiB)`);
    continue;
  }
  writeFileSync(archivo, optimizada);
  console.log(
    `✔ ${archivo}: ${Math.round(antes / 1024)} → ${Math.round(optimizada.length / 1024)} KiB (−${Math.round(ahorro * 100)} %)`
  );
}
