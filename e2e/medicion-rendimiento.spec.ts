import { expect, type Page, test } from '@playwright/test';

import { clienteAdmin, crearSesionEstudiante, limpiarCodigos } from './flujos';
import {
  hayCredencialesEstudiante,
  iniciarSesionComoEstudiante,
  MOTIVO_SIN_ESTUDIANTE,
} from './helpers';

/**
 * Medición del Capítulo 5 del documento de grado (RNF-01.1, RNF-01.3 y RNF-02.1). No es parte de
 * la suite: solo corre con `E2E_MEDICION=1` y `E2E_GPU_REAL=1`, porque dura diez minutos por
 * consultorio y necesita la GPU del equipo.
 *
 * En cada consultorio carga la escena con la red limitada a 10 Mbps, conversa con el paciente por
 * el camino directo durante `E2E_DURACION_MIN` minutos y cuenta los cuadros dibujados cada medio
 * segundo. Deja en las anotaciones el promedio y el percentil 5 de los FPS, la carga y la latencia
 * de la IA que guardó el servidor.
 */

const MEDIR = process.env.E2E_MEDICION === '1' && process.env.E2E_GPU_REAL === '1';
const CASOS = (process.env.E2E_CASOS ?? 'E-01,E-04,E-08').split(',').map(c => c.trim());
const DURACION_MS = Number(process.env.E2E_DURACION_MIN ?? 10) * 60_000;
const PREFIJO_CODIGOS = 'med';
const MBPS = 10;
/** Una intervención cada 40 s: mantiene viva la práctica y queda lejos del límite por minuto. */
const INTERVALO_MS = 40_000;
const INTERVENCIONES = [
  'Hola, buenas tardes. Soy estudiante de psicología y hoy vamos a conversar un rato.',
  '¿Qué te trae por aquí?',
  'Entiendo. ¿Desde cuándo te sientes así?',
  '¿Cómo ha afectado esto tu día a día?',
  '¿Con quién vives actualmente?',
  '¿Has podido hablar de esto con alguien cercano?',
  '¿Cómo estás durmiendo últimamente?',
  'Cuéntame un poco más sobre eso.',
  '¿Qué has intentado para sentirte mejor?',
  '¿Qué es lo que más te preocupa en este momento?',
  'Parece que ha sido una época difícil para ti.',
  '¿Hay algo que te ayude, aunque sea un poco?',
  '¿Cómo te gustaría que estuvieran las cosas en unos meses?',
  '¿Hay algo más que quieras contarme hoy?',
  'Gracias por contarme todo esto. Podemos seguir la próxima vez.',
];

type VentanaConMuestras = Window & { __muestrasFps?: number[] };

/** Cuenta los cuadros que dibuja el navegador y guarda los FPS de cada medio segundo. */
function iniciarMuestreo(page: Page): Promise<void> {
  return page.evaluate(() => {
    const ventana = window as VentanaConMuestras;
    ventana.__muestrasFps = [];
    let cuadros = 0;
    let desde = performance.now();
    const paso = (ahora: number) => {
      cuadros += 1;
      if (ahora - desde >= 500) {
        ventana.__muestrasFps?.push((cuadros * 1000) / (ahora - desde));
        cuadros = 0;
        desde = ahora;
      }
      requestAnimationFrame(paso);
    };
    requestAnimationFrame(paso);
  });
}

function percentil(valores: number[], p: number): number {
  const ordenados = [...valores].sort((a, b) => a - b);
  return ordenados[Math.max(0, Math.ceil((p / 100) * ordenados.length) - 1)] ?? 0;
}

function promedio(valores: number[]): number {
  return valores.length ? valores.reduce((s, v) => s + v, 0) / valores.length : 0;
}

test.describe('medición de rendimiento del documento (RNF-01 y RNF-02)', () => {
  test.skip(!MEDIR, 'Solo con E2E_MEDICION=1 y E2E_GPU_REAL=1');
  test.skip(!hayCredencialesEstudiante, MOTIVO_SIN_ESTUDIANTE);
  test.describe.configure({ mode: 'serial' });

  test.afterAll(() => limpiarCodigos(PREFIJO_CODIGOS));

  for (const caso of CASOS) {
    test(`${caso}: carga con ${MBPS} Mbps y FPS durante la conversación`, async ({
      page,
    }, testInfo) => {
      test.setTimeout(DURACION_MS + 240_000);
      await page.setViewportSize({ width: 1366, height: 768 });

      const sesionId = await crearSesionEstudiante(PREFIJO_CODIGOS, { escenario: caso });
      await iniciarSesionComoEstudiante(page);

      const cdp = await page.context().newCDPSession(page);
      await cdp.send('Network.enable');
      await cdp.send('Network.emulateNetworkConditions', {
        offline: false,
        latency: 20,
        downloadThroughput: (MBPS * 1_000_000) / 8,
        uploadThroughput: (MBPS * 1_000_000) / 8,
      });

      const inicio = Date.now();
      await page.goto(`/simulacion?sesion=${sesionId}`);
      await expect(page.getByTestId('pantalla-carga')).toHaveAttribute('data-visible', 'false', {
        timeout: 60_000,
      });
      const cargaMs = Date.now() - inicio;

      await iniciarMuestreo(page);
      await page.getByRole('button', { name: 'Ir directo a la conversación' }).click();
      const panel = page.getByRole('region', { name: /^Conversación con / });
      await expect(panel).toBeVisible();
      const campo = panel.getByLabel(/^Tu intervención para /);

      const fin = Date.now() + DURACION_MS;
      let enviadas = 0;
      while (Date.now() < fin) {
        const siguiente = Date.now() + INTERVALO_MS;
        if (enviadas < INTERVENCIONES.length) {
          await expect(campo).toBeEnabled({ timeout: 45_000 });
          await campo.fill(INTERVENCIONES[enviadas]!);
          await campo.press('Enter');
          enviadas += 1;
        }
        await page.waitForTimeout(Math.max(0, Math.min(siguiente, fin) - Date.now()));
      }

      const muestras = await page.evaluate(
        () => (window as VentanaConMuestras).__muestrasFps ?? []
      );
      const renderer = await page.evaluate(() => {
        const gl = document.createElement('canvas').getContext('webgl2');
        const extension = gl?.getExtension('WEBGL_debug_renderer_info');
        return gl && extension
          ? String(gl.getParameter(extension.UNMASKED_RENDERER_WEBGL))
          : 'desconocido';
      });

      const admin = clienteAdmin();
      if (!admin) throw new Error('Faltan variables de Supabase para las pruebas.');
      const { data: respuestas } = await admin
        .from('mensaje')
        .select('latencia_ms')
        .eq('sesion_id', sesionId)
        .eq('remitente', 'npc');
      const latencias = (respuestas ?? [])
        .map(r => r.latencia_ms)
        .filter((v): v is number => typeof v === 'number');

      const resultado = {
        caso,
        renderer,
        muestras: muestras.length,
        fpsPromedio: Number(promedio(muestras).toFixed(1)),
        fpsP5: Number(percentil(muestras, 5).toFixed(1)),
        fpsMediana: Number(percentil(muestras, 50).toFixed(1)),
        cargaS: Number((cargaMs / 1000).toFixed(1)),
        intervenciones: enviadas,
        respuestas: latencias.length,
        latenciaMediaMs: Math.round(promedio(latencias)),
        latenciaMaximaMs: Math.max(0, ...latencias),
      };
      testInfo.annotations.push({ type: 'medicion', description: JSON.stringify(resultado) });

      expect(muestras.length, 'Se tomaron muestras de FPS').toBeGreaterThan(0);
      expect(latencias.length, 'El paciente respondió').toBeGreaterThan(0);
    });
  }
});
