import { expect, type Page, test } from '@playwright/test';

import {
  abrirConversacion,
  comenzarSimulacion,
  conversar,
  finalizarDesdeHud,
  limpiarCodigos,
  MOTIVO_SPRINT_4,
  prepararSesion,
  SPRINT_4_LISTO,
  TARJETAS_RESULTADOS,
} from './flujos';
import {
  hayCredencialesEstudiante,
  iniciarSesionComoEstudiante,
  MOTIVO_SIN_ESTUDIANTE,
} from './helpers';

/**
 * HU-27 · T04 (Sprint 6) — Pantalla de resultados del Sprint 4 (HU-21).
 *
 * Pendiente: se activa cuando exista la página /resultados. Contrato que verifica:
 * - Encabezado con el escenario, y el nombre y código del estudiante.
 * - Cuatro tarjetas de indicadores, cada una como región con su título como nombre accesible
 *   (`TARJETAS_RESULTADOS`), con un valor visible.
 * - El historial de la conversación (`[data-remitente]`, como en el panel de la simulación).
 * - "Nueva sesión" lleva a /configuracion con el formulario limpio; "Cerrar" cierra la sesión.
 *
 * Desde los códigos de acceso la simulación la hace el estudiante en su cuenta: al implementar
 * el Sprint 4, revisar qué ve él en /resultados y qué ve el docente en /sesiones/[id].
 */

const PREFIJO_CODIGOS = 'res';
const ESTUDIANTE = { codigo: '209990001', nombre: 'Estudiante de Prueba Uno' };

test.describe('pantalla de resultados (HU-27 · T04)', () => {
  test.skip(!hayCredencialesEstudiante, MOTIVO_SIN_ESTUDIANTE);
  test.skip(!SPRINT_4_LISTO, MOTIVO_SPRINT_4);
  test.describe.configure({ mode: 'serial' });

  let sesionId = '';

  test.beforeAll(async ({ browser }) => {
    test.setTimeout(240_000);
    await limpiarCodigos(PREFIJO_CODIGOS);

    // Una sesión completada desde la interfaz, con una intervención y su respuesta.
    const page = await browser.newPage();
    await iniciarSesionComoEstudiante(page);
    sesionId = await prepararSesion(page, PREFIJO_CODIGOS);
    await comenzarSimulacion(page, /Duelo y pérdida/);
    const panel = await abrirConversacion(page, 'Marta', 'Marta Lucía');
    await conversar(panel, 'Marta Lucía', 'Hola, Marta. ¿Cómo ha estado?');
    await panel.getByRole('button', { name: 'Volver a explorar' }).click();
    await finalizarDesdeHud(page, sesionId);
    await page.close();
  });

  test.afterAll(() => limpiarCodigos(PREFIJO_CODIGOS));

  async function abrirResultados(page: Page) {
    await iniciarSesionComoEstudiante(page);
    await page.goto(`/resultados?sesion=${sesionId}`);
  }

  test('muestra el escenario, el estudiante, las métricas y la conversación', async ({ page }) => {
    await abrirResultados(page);

    await expect(page.getByRole('heading', { level: 1 })).toContainText('Duelo y pérdida');
    await expect(page.getByText(ESTUDIANTE.nombre)).toBeVisible();
    await expect(page.getByText(ESTUDIANTE.codigo)).toBeVisible();

    for (const titulo of TARJETAS_RESULTADOS) {
      const tarjeta = page.getByRole('region', { name: titulo });
      await expect(tarjeta).toBeVisible();
      await expect(tarjeta).toContainText(/\d/);
    }
    // Duración en formato MM:SS.
    await expect(page.getByRole('region', { name: 'Duración de la sesión' })).toContainText(
      /\d{2}:\d{2}/
    );

    await expect(page.locator('[data-remitente="estudiante"]').first()).toContainText(
      'Hola, Marta.'
    );
    await expect(page.locator('[data-remitente="npc"]').first()).toBeVisible();

    await expect(page.getByRole('button', { name: 'Nueva sesión' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Cerrar' })).toBeVisible();
  });

  test('"Nueva sesión" vuelve a /configuracion con el estado limpio', async ({ page }) => {
    await abrirResultados(page);
    await page.getByRole('button', { name: 'Nueva sesión' }).click();

    await expect(page).toHaveURL(/\/configuracion$/);
    await expect(page.getByLabel('Código institucional')).toHaveValue('');
    await expect(page.getByLabel('Nombre completo')).toHaveValue('');
    await expect(
      page.getByRole('radiogroup', { name: /Elige el caso/ }).getByRole('radio', { checked: true })
    ).toHaveCount(0);
    // La sesión finalizada ya no se retoma desde /simulacion.
    await page.goto('/simulacion');
    await expect(page).not.toHaveURL(new RegExp(sesionId));
  });

  test('"Cerrar" cierra la sesión del docente', async ({ page }) => {
    await abrirResultados(page);
    await page.getByRole('button', { name: 'Cerrar' }).click();
    await expect(page).toHaveURL(/\/login/);
  });

  test('una sesión ajena o inexistente redirige a /configuracion', async ({ page }) => {
    await iniciarSesionComoEstudiante(page);
    await page.goto('/resultados?sesion=00000000-0000-4000-8000-000000000000');
    await expect(page).toHaveURL(/\/configuracion/);
  });
});
