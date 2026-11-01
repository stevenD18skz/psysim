import { expect, type Page, test } from '@playwright/test';

/**
 * Core Web Vitals medidos en Chrome real contra la build de producción:
 *
 *   pnpm build && pnpm exec next start -p 3100
 *   PLAYWRIGHT_BASE_URL=http://localhost:3100 pnpm test:e2e e2e/rendimiento-web.spec.ts
 *
 * El modo de desarrollo compila cada ruta al visitarla y no sirve para medir, así que sin
 * `PLAYWRIGHT_BASE_URL` este archivo se omite. Umbrales «buenos» de web.dev: LCP ≤ 2,5 s,
 * CLS ≤ 0,1 y, como aproximación del tiempo de bloqueo, tareas largas (> 50 ms) que suman menos
 * de 300 ms. Se mide sin limitar la CPU ni la red: es el piso que debe cumplir cualquier equipo;
 * la simulación de móvil lento de Lighthouse está en docs/auditoria-rendimiento.md.
 */
test.skip(
  !process.env.PLAYWRIGHT_BASE_URL,
  'Mide la build de producción: define PLAYWRIGHT_BASE_URL (ver el encabezado del archivo).'
);

interface Medicion {
  lcp: number;
  cls: number;
  tareasLargasMs: number;
}

async function medir(page: Page, ruta: string): Promise<Medicion> {
  await page.addInitScript(() => {
    const w = window as unknown as { __cwv: { lcp: number; cls: number; largas: number } };
    w.__cwv = { lcp: 0, cls: 0, largas: 0 };
    new PerformanceObserver(lista => {
      for (const entrada of lista.getEntries()) w.__cwv.lcp = entrada.startTime;
    }).observe({ type: 'largest-contentful-paint', buffered: true });
    new PerformanceObserver(lista => {
      for (const entrada of lista.getEntries() as unknown as {
        value: number;
        hadRecentInput: boolean;
      }[]) {
        if (!entrada.hadRecentInput) w.__cwv.cls += entrada.value;
      }
    }).observe({ type: 'layout-shift', buffered: true });
    new PerformanceObserver(lista => {
      for (const entrada of lista.getEntries())
        w.__cwv.largas += Math.max(0, entrada.duration - 50);
    }).observe({ type: 'longtask', buffered: true });
  });
  await page.goto(ruta, { waitUntil: 'networkidle' });
  // El LCP se confirma con la primera interacción o al ocultar la página: se espera un poco más.
  await page.waitForTimeout(1500);
  const medida = await page.evaluate(
    () => (window as unknown as { __cwv: { lcp: number; cls: number; largas: number } }).__cwv
  );
  return { lcp: medida.lcp, cls: medida.cls, tareasLargasMs: medida.largas };
}

for (const ruta of ['/', '/login', '/privacidad']) {
  test(`${ruta}: LCP, CLS y bloqueo dentro de los umbrales «buenos»`, async ({
    page,
  }, testInfo) => {
    const m = await medir(page, ruta);
    testInfo.annotations.push({
      type: 'cwv',
      description: `LCP ${Math.round(m.lcp)} ms · CLS ${m.cls.toFixed(3)} · tareas largas ${Math.round(m.tareasLargasMs)} ms`,
    });

    expect(m.lcp, 'LCP (ms)').toBeGreaterThan(0);
    expect(m.lcp, 'LCP (ms)').toBeLessThanOrEqual(2500);
    expect(m.cls, 'CLS').toBeLessThanOrEqual(0.1);
    expect(m.tareasLargasMs, 'Tiempo en tareas largas (ms)').toBeLessThanOrEqual(300);
  });
}
