import { expect, type Page, test } from '@playwright/test';

import { crearSesionEstudiante, limpiarCodigos } from './flujos';
import {
  hayCredenciales,
  hayCredencialesEstudiante,
  iniciarSesionComoDocente,
  iniciarSesionComoEstudiante,
  MOTIVO_SIN_ESTUDIANTE,
} from './helpers';

/**
 * OWASP A02/A05 — La política de seguridad de contenido (CSP) con nonce por petición:
 * 1. Cada respuesta HTML la trae, con un nonce distinto, y los scripts de Next.js lo llevan.
 * 2. Ninguna pantalla —incluida la escena 3D con su decodificador WebAssembly— la viola: si la
 *    política bloqueara algo que la aplicación necesita, el navegador lo registra aquí.
 * Los encabezados sin nonce están en `seguridad.test.ts`; la construcción de la política, en
 * `src/lib/seguridad/csp.test.ts`.
 */

const PREFIJO_CODIGOS = 'csp';

/** Registra las violaciones de la CSP que el navegador detecta en la página. */
async function vigilarViolaciones(page: Page) {
  await page.addInitScript(() => {
    const registro: string[] = [];
    (window as unknown as { __violacionesCsp: string[] }).__violacionesCsp = registro;
    document.addEventListener('securitypolicyviolation', evento => {
      registro.push(`${evento.violatedDirective} → ${evento.blockedURI || 'inline'}`);
    });
  });
}

async function violaciones(page: Page): Promise<string[]> {
  return page.evaluate(
    () => (window as unknown as { __violacionesCsp?: string[] }).__violacionesCsp ?? []
  );
}

test.describe('política de seguridad de contenido (OWASP A02/A05)', () => {
  test('cada respuesta trae una CSP con un nonce nuevo', async ({ request }) => {
    const nonces = new Set<string>();
    for (let i = 0; i < 3; i++) {
      const respuesta = await request.get('/login');
      const csp = respuesta.headers()['content-security-policy'];
      expect(csp, 'Content-Security-Policy').toBeTruthy();
      expect(csp).toContain("object-src 'none'");
      expect(csp).toContain("frame-ancestors 'none'");
      expect(csp).toContain("base-uri 'self'");
      const nonce = /'nonce-([^']+)'/.exec(csp!)?.[1];
      expect(nonce).toBeTruthy();
      nonces.add(nonce!);
    }
    expect(nonces.size).toBe(3);
  });

  test('los scripts de la página llevan el nonce de su respuesta', async ({ page }) => {
    const respuesta = await page.goto('/login');
    const nonce = /'nonce-([^']+)'/.exec(respuesta!.headers()['content-security-policy']!)?.[1];

    const nonces = await page.evaluate(() =>
      [...document.querySelectorAll('script[src]')].map(s => (s as HTMLScriptElement).nonce)
    );
    // Los scripts que añade Next.js al HTML llevan el nonce; los que ellos cargan después heredan
    // la confianza (`strict-dynamic`) y pueden no llevarlo. Ninguno lleva el de otra petición.
    expect(nonces.filter(n => n === nonce).length).toBeGreaterThan(3);
    expect(nonces.filter(n => n !== '' && n !== nonce)).toEqual([]);
  });

  test('un manejador en línea inyectado (XSS clásico) no se ejecuta', async ({ page }) => {
    await vigilarViolaciones(page);
    await page.goto('/login');
    const ejecutado = await page.evaluate(
      () =>
        new Promise<boolean>(resolver => {
          const contenedor = document.createElement('div');
          // Lo que lograría un atacante si un texto sin escapar llegara al HTML.
          contenedor.innerHTML = '<img src="x" onerror="window.__inyectado = true">';
          document.body.appendChild(contenedor);
          setTimeout(
            () => resolver((window as unknown as { __inyectado?: boolean }).__inyectado === true),
            500
          );
        })
    );
    expect(ejecutado).toBe(false);
    expect((await violaciones(page)).some(v => v.startsWith('script-src'))).toBe(true);
  });

  for (const ruta of ['/', '/login', '/privacidad']) {
    test(`${ruta} funciona sin violar la política`, async ({ page }) => {
      await vigilarViolaciones(page);
      await page.goto(ruta);
      await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
      expect(await violaciones(page)).toEqual([]);
    });
  }

  test.describe('con sesión', () => {
    test.skip(!hayCredenciales, 'Define E2E_DOCENTE_CORREO y E2E_DOCENTE_CONTRASENA');

    test('el panel del docente funciona sin violar la política', async ({ page }) => {
      await vigilarViolaciones(page);
      await iniciarSesionComoDocente(page);
      for (const ruta of ['/inicio', '/configuracion', '/estudiantes', '/configuracion/casos']) {
        await page.goto(ruta);
        await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      }
      expect(await violaciones(page)).toEqual([]);
    });
  });

  test.describe('simulación 3D', () => {
    test.skip(!hayCredencialesEstudiante, MOTIVO_SIN_ESTUDIANTE);
    test.afterAll(() => limpiarCodigos(PREFIJO_CODIGOS));

    test('la escena (WebAssembly, workers y modelos de Storage) carga sin violar la política', async ({
      page,
    }) => {
      test.setTimeout(120_000);
      await vigilarViolaciones(page);
      await page.setViewportSize({ width: 800, height: 600 });
      const sesionId = await crearSesionEstudiante(PREFIJO_CODIGOS);
      await iniciarSesionComoEstudiante(page);

      await page.goto(`/simulacion?sesion=${sesionId}`);
      await expect(page.getByTestId('pantalla-carga')).toHaveAttribute('data-visible', 'false', {
        timeout: 60_000,
      });
      await expect(page.getByRole('img', { name: 'Escena 3D de la simulación' })).toBeVisible();

      // Los ajustes (popover) y el panel de conversación también cargan estilos en línea.
      await page.getByRole('button', { name: 'Ajustes del consultorio' }).click();
      await expect(page.getByRole('switch', { name: 'Ambiente emocional' })).toBeVisible();

      expect(await violaciones(page)).toEqual([]);
    });
  });
});
