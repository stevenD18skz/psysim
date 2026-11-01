import { expect, type Page, test } from '@playwright/test';

import { crearSesionEstudiante, limpiarCodigos } from './flujos';
import {
  hayCredencialesEstudiante,
  iniciarSesionComoEstudiante,
  MOTIVO_SIN_ESTUDIANTE,
} from './helpers';

/**
 * Sprint 6 — HU-28: rendimiento del entorno 3D.
 *
 * - T02: los modelos GLB llegan comprimidos con Draco (se miden los bytes descargados).
 * - T03: se mide cuánto tarda en cargar el consultorio y los FPS promedio. Playwright renderiza
 *   por software (SwiftShader), así que los números de este test son un piso, no el rendimiento de
 *   un computador real: `E2E_FPS_MINIMO` sube el umbral al correrlo en hardware representativo
 *   (por defecto 5 FPS en software; el objetivo del proyecto es ≥ 30 FPS con GPU integrada).
 *   `E2E_GPU_REAL=1` usa la GPU del equipo, a tamaño de laptop y durante 30 s; `E2E_CASO` elige
 *   otro consultorio (por defecto, E-01).
 *
 * Los resultados quedan como anotaciones del test y se resumen en docs/performance.md.
 */

const PREFIJO_CODIGOS = 'rnd';
const FPS_MINIMO = Number(process.env.E2E_FPS_MINIMO ?? 5);
/** Presupuestos de carga del consultorio E-01 (con Draco: ~0,2 MB por mueble, ~1 MB por paciente). */
const MAXIMO_BYTES_POR_MODELO = 2 * 1024 * 1024;
const MAXIMO_BYTES_TOTAL = 8 * 1024 * 1024;
const MAXIMO_CARGA_MS = 60_000;
const GPU_REAL = process.env.E2E_GPU_REAL === '1';
const CASO = process.env.E2E_CASO ?? 'E-01';
const MUESTREO_FPS_MS = GPU_REAL ? 30_000 : 8000;

/** La GPU que usó el navegador: sin esto no se sabe si el número es de hardware o de software. */
function rendererWebgl(page: Page): Promise<string> {
  return page.evaluate(() => {
    const gl = document.createElement('canvas').getContext('webgl2');
    const extension = gl?.getExtension('WEBGL_debug_renderer_info');
    return gl && extension
      ? String(gl.getParameter(extension.UNMASKED_RENDERER_WEBGL))
      : 'desconocido';
  });
}

async function promedioFps(page: Page): Promise<number> {
  const texto = (await page.getByTestId('indicador-fps').textContent()) ?? '';
  const coincidencia = /prom\.\s*(\d+)/.exec(texto);
  return coincidencia ? Number(coincidencia[1]) : 0;
}

test.describe('rendimiento del entorno 3D (HU-28)', () => {
  test.skip(!hayCredencialesEstudiante, MOTIVO_SIN_ESTUDIANTE);

  test.afterAll(() => limpiarCodigos(PREFIJO_CODIGOS));

  test('T02/T03: modelos con Draco, tiempo de carga y FPS del consultorio E-01', async ({
    page,
  }, testInfo) => {
    test.setTimeout(180_000);
    // Un viewport pequeño mantiene un FPS útil con el renderizado por software.
    await page.setViewportSize(
      GPU_REAL ? { width: 1366, height: 768 } : { width: 800, height: 600 }
    );

    const modelos: { url: string; bytes: number }[] = [];
    page.on('response', async respuesta => {
      const url = respuesta.url();
      if (!/\.glb(\?|$)/.test(url) || !respuesta.ok()) return;
      const cuerpo = await respuesta.body().catch(() => null);
      if (cuerpo) modelos.push({ url, bytes: cuerpo.length });
    });

    const sesionId = await crearSesionEstudiante(PREFIJO_CODIGOS, { escenario: CASO });
    await iniciarSesionComoEstudiante(page);

    const inicio = Date.now();
    await page.goto(`/simulacion?sesion=${sesionId}&debug=1`);
    await expect(page.getByTestId('pantalla-carga')).toHaveAttribute('data-visible', 'false', {
      timeout: MAXIMO_CARGA_MS,
    });
    const cargaMs = Date.now() - inicio;

    await page.waitForTimeout(MUESTREO_FPS_MS);
    const fps = await promedioFps(page);

    const totalBytes = modelos.reduce((suma, m) => suma + m.bytes, 0);
    const masGrande = Math.max(0, ...modelos.map(m => m.bytes));
    testInfo.annotations.push(
      { type: 'gpu', description: await rendererWebgl(page) },
      { type: 'carga', description: `${(cargaMs / 1000).toFixed(1)} s hasta ver el consultorio` },
      { type: 'fps', description: `${fps} FPS promedio en ${MUESTREO_FPS_MS / 1000} s` },
      {
        type: 'modelos',
        description: `${modelos.length} GLB, ${(totalBytes / 1024 / 1024).toFixed(2)} MB (el mayor: ${(masGrande / 1024 / 1024).toFixed(2)} MB)`,
      }
    );

    expect(modelos.length, 'Se descargó al menos un modelo GLB').toBeGreaterThan(0);
    expect(masGrande, 'Un solo modelo supera el presupuesto').toBeLessThanOrEqual(
      MAXIMO_BYTES_POR_MODELO
    );
    expect(totalBytes, 'Los modelos del consultorio superan el presupuesto').toBeLessThanOrEqual(
      MAXIMO_BYTES_TOTAL
    );
    expect(cargaMs).toBeLessThanOrEqual(MAXIMO_CARGA_MS);
    expect(fps, `FPS promedio (mínimo ${FPS_MINIMO})`).toBeGreaterThanOrEqual(FPS_MINIMO);
  });
});
