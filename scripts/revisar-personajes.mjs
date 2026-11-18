import path from 'node:path';
import { mkdirSync } from 'node:fs';
import { createServer } from 'vite';
import { chromium } from '@playwright/test';
import sharp from 'sharp';

const clips = [
  'idle',
  'walk',
  'run',
  'wave',
  'jump',
  'dance',
  'yes',
  'no',
  'think',
  'celebrate',
  'sleep',
  'sit',
  'bow',
];
const portraits = {
  julian: 'julian-david',
  hernan: 'hernan',
  yolanda: 'yolanda',
  sara: 'sara',
  daniela: 'daniela',
  paola: 'paola',
};

const server = await createServer({
  configFile: false,
  publicDir: 'public',
  resolve: { alias: { '@': path.resolve('src') } },
  server: {
    host: '127.0.0.1',
    port: 3101,
    strictPort: true,
    hmr: process.argv.includes('--manual'),
    watch: process.argv.includes('--manual') ? undefined : null,
  },
});
await server.listen();
const url = 'http://127.0.0.1:3101/scripts/npc-preview/index.html';
if (process.argv.includes('--manual')) {
  console.log(`Visor local: ${url} (Ctrl+C para cerrar)`);
} else {
  let browser;
  try {
    browser = await chromium.launch({
      channel: 'msedge',
      args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--ignore-gpu-blocklist'],
    });
    const page = await browser.newPage({ viewport: { width: 600, height: 650 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', msg => {
      if (msg.type() === 'error' || /PropertyBinding|No target node/.test(msg.text()))
        errors.push(msg.text());
    });
    await page.goto(url);
    await page.waitForFunction(() => window.npcPreview?.ready);
    const ids = process.argv.slice(2).filter(a => !a.startsWith('--'));
    const characters = ids.length
      ? ids
      : ['julian', 'hernan', 'yolanda', 'sara', 'daniela', 'paola'];
    const folder = 'tmp-capturas/npc';
    mkdirSync(folder, { recursive: true });
    for (const id of characters) {
      const images = [];
      for (const mode of ['clips', 'paciente'])
        for (const angle of ['frente', 'perfil', 'espalda']) {
          await page.evaluate(options => window.npcPreview.show(options), {
            id,
            mode,
            angle,
            time: 0.6,
          });
          const png = await page.screenshot();
          images.push(await sharp(png).resize(300, 325).toBuffer());
          if (mode === 'clips' && angle === 'frente')
            await sharp(png).toFile(`${folder}/${id}.png`);
        }
      await sharp({ create: { width: 900, height: 650, channels: 3, background: '#eeeae4' } })
        .composite(
          images.map((input, i) => ({ input, left: (i % 3) * 300, top: Math.floor(i / 3) * 325 }))
        )
        .png()
        .toFile(`${folder}/${id}-vistas.png`);
      if (process.argv.includes('--completo')) {
        for (const [name, options] of [
          ['clips', clips.map(action => ({ action, mode: 'clips', fraction: 0.35 }))],
          [
            'paciente',
            [
              ...['neutral', 'triste', 'ansioso', 'molesto', 'aliviado', 'abrumado'].map(
                emotion => ({ mode: 'paciente', emotion, time: 1.2 })
              ),
              ...[
                'wave',
                'think',
                'yes',
                'no',
                'mano_al_pecho',
                'mano_a_la_cara',
                'tocar_ropa',
                'brazos_cruzados',
                'tocar_pelo',
              ].map(gesture => ({ mode: 'paciente', gesture, time: 1.1 })),
              { mode: 'paciente', talking: true, time: 0.75 },
            ],
          ],
        ]) {
          const frames = [];
          for (const opts of options) {
            await page.evaluate(o => window.npcPreview.show(o), { id, ...opts });
            frames.push(
              await sharp(await page.screenshot())
                .resize(240, 260)
                .toBuffer()
            );
          }
          await sharp({
            create: {
              width: 960,
              height: Math.ceil(frames.length / 4) * 260,
              channels: 3,
              background: '#eeeae4',
            },
          })
            .composite(
              frames.map((input, i) => ({
                input,
                left: (i % 4) * 240,
                top: Math.floor(i / 4) * 260,
              }))
            )
            .png()
            .toFile(`${folder}/${id}-${name}.png`);
        }
      }
      if (process.argv.includes('--retratos') && portraits[id]) {
        await page.evaluate(o => window.npcPreview.show(o), {
          id,
          mode: 'paciente',
          portrait: true,
          time: 0.6,
        });
        await page.locator('#tools, #label').evaluateAll(elements =>
          elements.forEach(element => {
            element.style.visibility = 'hidden';
          })
        );
        const png = await page.locator('canvas').screenshot();
        await page.locator('#tools, #label').evaluateAll(elements =>
          elements.forEach(element => {
            element.style.visibility = '';
          })
        );
        await sharp(png)
          .extract({ left: 0, top: 25, width: 600, height: 600 })
          .resize(512, 512)
          .webp({ quality: 90 })
          .toFile(`public/pacientes/${portraits[id]}.webp`);
      }
      console.log(`Capturado ${id}`);
    }
    if (errors.length) throw new Error(`Errores de visor: ${errors.join('\n')}`);
  } finally {
    await browser?.close();
    await server.close();
  }
}
