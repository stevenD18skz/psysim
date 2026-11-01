/**
 * Genera las imágenes de marca de PsySim a partir del símbolo propio (el arco del consultorio, la
 * butaca y la paciente de `SimboloPsySim`): ícono, ícono de Apple, favicon e imagen para compartir.
 *
 *   node scripts/generar-marca.mjs
 *
 * Los colores son los de `globals.css`. Se ejecuta a mano cuando cambia la marca; el resultado
 * se versiona en `src/app` (convención de archivos de metadatos de Next).
 */
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import sharp from 'sharp';

const RAIZ = resolve(import.meta.dirname, '..');
const C = {
  nogal: '#3a2418',
  lino: '#f1f3ee',
  laton: '#b88a3b',
  latonClaro: '#d4a85a',
  salvia: '#5f7f63',
  terracota: '#d07a5a',
};

/** El símbolo (viewBox 32) con su contorno y figuras, sin fondo. */
const simbolo = trazo => `
  <path d="M7 29.5V14a9 9 0 0 1 18 0v15.5" fill="none" stroke="${trazo}" stroke-width="2.6" stroke-linecap="round"/>
  <rect x="10.5" y="20.5" width="11" height="7" rx="2.4" fill="${C.salvia}"/>
  <circle cx="16" cy="16.6" r="2.7" fill="${C.terracota}"/>`;

/** Ícono cuadrado: nogal con el símbolo centrado y margen seguro para iconos enmascarados. */
const icono = (lado, esquinas) => `
  <svg xmlns="http://www.w3.org/2000/svg" width="${lado}" height="${lado}" viewBox="0 0 32 32">
    <rect width="32" height="32" rx="${esquinas}" fill="${C.nogal}"/>
    <g transform="translate(4 4) scale(0.75)">${simbolo(C.latonClaro)}</g>
  </svg>`;

const compartir = `
  <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
    <rect width="1200" height="630" fill="${C.nogal}"/>
    <rect x="0" y="0" width="1200" height="12" fill="${C.laton}"/>
    <g transform="translate(88 150) scale(10)">${simbolo(C.latonClaro)}</g>
    <text x="470" y="270" font-family="Arial, Helvetica, sans-serif" font-weight="700" font-size="120" fill="${C.lino}" letter-spacing="-3">PsySim</text>
    <text x="470" y="352" font-family="Arial, Helvetica, sans-serif" font-size="40" fill="${C.lino}">Practica la entrevista clínica</text>
    <text x="470" y="404" font-family="Arial, Helvetica, sans-serif" font-size="40" fill="${C.lino}">con pacientes virtuales de IA</text>
    <text x="470" y="498" font-family="Arial, Helvetica, sans-serif" font-size="28" fill="${C.latonClaro}">Universidad del Valle · Psicología</text>
  </svg>`;

async function png(svg, ruta, opciones = {}) {
  const { densidad = 300, ...resto } = opciones;
  const buffer = await sharp(Buffer.from(svg), { density: densidad })
    .resize(resto)
    .png({ compressionLevel: 9, palette: true, quality: 90, effort: 10 })
    .toBuffer();
  writeFileSync(resolve(RAIZ, ruta), buffer);
  return buffer;
}

await png(icono(512, 7), 'src/app/icon.png', { width: 512, height: 512 });
await png(icono(180, 0), 'src/app/apple-icon.png', { width: 180, height: 180 });
await png(compartir, 'src/app/opengraph-image.png', { width: 1200, height: 630 });
await png(compartir, 'src/app/twitter-image.png', { width: 1200, height: 630 });

// favicon.ico: un único PNG de 48x48 dentro del contenedor ICO (lo aceptan todos los navegadores).
const pequeno = await sharp(Buffer.from(icono(48, 7)), { density: 300 })
  .resize(48, 48)
  .png({ compressionLevel: 9 })
  .toBuffer();
const cabecera = Buffer.alloc(22);
cabecera.writeUInt16LE(0, 0);
cabecera.writeUInt16LE(1, 2);
cabecera.writeUInt16LE(1, 4);
cabecera.writeUInt8(48, 6);
cabecera.writeUInt8(48, 7);
cabecera.writeUInt16LE(1, 10);
cabecera.writeUInt16LE(32, 12);
cabecera.writeUInt32LE(pequeno.length, 14);
cabecera.writeUInt32LE(22, 18);
writeFileSync(resolve(RAIZ, 'src/app/favicon.ico'), Buffer.concat([cabecera, pequeno]));

console.log('Marca generada: icon, apple-icon, favicon, opengraph-image y twitter-image.');
