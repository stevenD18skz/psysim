import { expect, type Page, test } from '@playwright/test';

import {
  abrirConversacion,
  clienteAdmin,
  comenzarSimulacion,
  conversar,
  finalizarDesdeHud,
  limpiarCodigos,
  prepararSesion,
  TARJETAS_RESULTADOS,
} from './flujos';
import {
  hayCredencialesEstudiante,
  iniciarSesionComoDocente,
  iniciarSesionComoEstudiante,
  MOTIVO_SIN_ESTUDIANTE,
} from './helpers';

/**
 * HU-27 · T04 — Pantalla de resultados (HU-21). Contrato que verifica:
 * - Encabezado con el escenario, y el nombre y código del estudiante.
 * - Cuatro tarjetas de indicadores, cada una como región con su título como nombre accesible
 *   (`TARJETAS_RESULTADOS`), con un valor visible.
 * - El historial de la conversación (`[data-remitente]`, como en el panel de la simulación).
 * - El estudiante vuelve a «Mis prácticas» o cierra su sesión; el docente empieza una «Nueva
 *   sesión» o cierra la suya.
 * - Las métricas quedan guardadas en Supabase (HU-19) y la sesión, finalizada.
 */

const PREFIJO_CODIGOS = 'res';
const ESTUDIANTE = { codigo: '209990001', nombre: 'Estudiante de Prueba Uno' };

test.describe('pantalla de resultados (HU-27 · T04)', () => {
  test.skip(!hayCredencialesEstudiante, MOTIVO_SIN_ESTUDIANTE);
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
    await expect(
      page.locator('#contenido').getByText(ESTUDIANTE.nombre, { exact: true })
    ).toBeVisible();
    await expect(
      page.locator('#contenido').getByText(ESTUDIANTE.codigo, { exact: true })
    ).toBeVisible();

    for (const titulo of TARJETAS_RESULTADOS) {
      const tarjeta = page.getByRole('region', { name: titulo });
      await expect(tarjeta).toBeVisible();
      await expect(tarjeta).toContainText(/\d/);
    }
    // Duración en formato MM:SS.
    await expect(page.getByRole('region', { name: 'Duración de la sesión' })).toContainText(
      /\d{2}:\d{2}/
    );
    await expect(page.getByRole('region', { name: 'Total de intervenciones' })).toContainText('1');

    await expect(page.locator('[data-remitente="estudiante"]').first()).toContainText(
      'Hola, Marta.'
    );
    await expect(page.locator('[data-remitente="npc"]').first()).toBeVisible();

    await expect(page.getByRole('link', { name: 'Ir a Mis prácticas' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Cerrar sesión' })).toBeVisible();
  });

  test('las métricas quedaron guardadas y la sesión está finalizada (HU-19)', async () => {
    const admin = clienteAdmin();
    test.skip(!admin, 'Falta SUPABASE_SECRET_KEY para leer la base de datos.');

    const { data: sesion } = await admin!
      .from('sesion')
      .select('estado, fin')
      .eq('id', sesionId)
      .single();
    expect(sesion?.estado).toBe('finalizada');
    expect(sesion?.fin).not.toBeNull();

    const { data: metrica, error } = await admin!
      .from('metrica')
      .select('total_mensajes, latencia_promedio_ms, latencia_maxima_ms, duracion_segundos')
      .eq('sesion_id', sesionId)
      .maybeSingle();
    // PGRST205: la tabla no existe porque falta aplicar la migración 20261025010000.
    test.skip(
      error?.code === 'PGRST205',
      'Falta aplicar la migración 20261025010000_metricas_sesion.sql en Supabase.'
    );
    expect(metrica?.total_mensajes).toBe(1);
    expect(metrica?.latencia_promedio_ms).toBeGreaterThan(0);
    expect(metrica?.latencia_maxima_ms).toBeGreaterThanOrEqual(metrica!.latencia_promedio_ms!);
    expect(metrica?.duracion_segundos).toBeGreaterThanOrEqual(0);
  });

  test('el estudiante escribe su reflexión y su docente la lee (INACSL)', async ({
    page,
    browser,
  }) => {
    await abrirResultados(page);
    await page
      .getByRole('textbox', { name: 'Tu reflexión' })
      .fill('Me sirvió saludar con calma antes de preguntar.');
    await page.getByRole('button', { name: 'Guardar reflexión' }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Guardada el' })).toBeVisible();

    // Queda guardada: al volver a abrir la pantalla sigue ahí.
    await page.reload();
    await expect(page.getByRole('textbox', { name: 'Tu reflexión' })).toHaveValue(
      'Me sirvió saludar con calma antes de preguntar.'
    );

    // El docente la lee en los resultados y en su revisión.
    const contexto = await browser.newContext();
    const docente = await contexto.newPage();
    await iniciarSesionComoDocente(docente);
    for (const ruta of [`/resultados?sesion=${sesionId}`, `/sesiones/${sesionId}`]) {
      await docente.goto(ruta);
      await expect(
        docente.getByRole('heading', { name: `Reflexión de ${ESTUDIANTE.nombre}` })
      ).toBeVisible();
      await expect(
        docente.getByText('Me sirvió saludar con calma antes de preguntar.')
      ).toBeVisible();
    }
    await contexto.close();
  });

  test('«Ir a Mis prácticas» vuelve al listado y la práctica terminada no se retoma', async ({
    page,
  }) => {
    await abrirResultados(page);
    await page.getByRole('link', { name: 'Ir a Mis prácticas' }).click();
    await expect(page).toHaveURL(/\/practicas$/);

    // La sesión finalizada ya no se retoma desde /simulacion.
    await page.goto(`/simulacion?sesion=${sesionId}`);
    await expect(
      page.getByRole('heading', { name: 'Esta sesión no está disponible' })
    ).toBeVisible();
  });

  test('«Cerrar sesión» cierra la sesión del estudiante', async ({ page }) => {
    await abrirResultados(page);
    await page.getByRole('button', { name: 'Cerrar sesión', exact: true }).click();
    await expect(page).toHaveURL(/\/login/);
  });

  test('una sesión ajena o inexistente lleva al inicio del estudiante', async ({ page }) => {
    await iniciarSesionComoEstudiante(page);
    await page.goto('/resultados?sesion=00000000-0000-4000-8000-000000000000');
    await expect(page).toHaveURL(/\/practicas$/);
    await page.goto('/resultados?sesion=no-es-un-uuid');
    await expect(page).toHaveURL(/\/practicas$/);
  });

  test('el docente ve los mismos resultados y puede empezar una nueva sesión', async ({ page }) => {
    await iniciarSesionComoDocente(page);
    await page.goto(`/resultados?sesion=${sesionId}`);

    await expect(page.getByRole('heading', { level: 1 })).toContainText('Duelo y pérdida');
    await expect(
      page.locator('#contenido').getByText(ESTUDIANTE.nombre, { exact: true })
    ).toBeVisible();
    for (const titulo of TARJETAS_RESULTADOS) {
      await expect(page.getByRole('region', { name: titulo })).toBeVisible();
    }
    // El docente lee al estudiante como «Estudiante», no como «Tú».
    await expect(page.locator('[data-remitente="estudiante"]').first()).toContainText('Estudiante');

    await page.getByRole('link', { name: 'Nueva sesión' }).click();
    await expect(page).toHaveURL(/\/configuracion$/);
    await expect(page.getByRole('combobox', { name: 'Busca al estudiante' })).toBeVisible();
  });
});
