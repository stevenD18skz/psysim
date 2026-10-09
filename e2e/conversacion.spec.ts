import { expect, type Page, test } from '@playwright/test';

import {
  clienteAdmin as clienteAdminOpcional,
  crearSesionEstudiante,
  limpiarCodigos,
} from './flujos';
import {
  hayCredenciales,
  hayCredencialesEstudiante,
  iniciarSesionComoDocente,
  iniciarSesionComoEstudiante,
  MOTIVO_SIN_ESTUDIANTE,
} from './helpers';

/**
 * Sprint 3 — HU-11 a HU-16: acercarse al paciente, conversar con la IA real (Gemini), manejo de
 * errores, persistencia de la conversación y cierre de la sesión. La simulación corre en la
 * sesión del estudiante (cuenta de prueba). Registro en docs/pruebas/sprint-3.md.
 */

/**
 * Prefijo de los códigos de acceso de este archivo. Distinto del de los demás: los archivos corren
 * en paralelo y la limpieza de uno borraría las sesiones del otro a mitad de un test.
 */
const PREFIJO_CODIGOS = 'cnv';
const PROMPT_BREVE =
  'Eres Marta Lucía, una mujer de 58 años que perdió a su esposo hace cuatro meses. ' +
  'Responde siempre en español, con una sola oración corta y en primera persona.';

function clienteAdmin() {
  const cliente = clienteAdminOpcional();
  if (!cliente) throw new Error('Faltan variables de Supabase para las pruebas.');
  return cliente;
}

/**
 * Crea una sesión en curso del escenario E-01 para el estudiante de prueba, que ya confirmó las
 * instrucciones del caso (HU-23): se va directo a conversar.
 */
function crearSesion(): Promise<string> {
  return crearSesionEstudiante(PREFIJO_CODIGOS, { prompt: PROMPT_BREVE });
}

const limpiar = () => limpiarCodigos(PREFIJO_CODIGOS);

/** Abre la simulación y camina hacia el paciente hasta poder conversar. */
async function acercarseAlPaciente(page: Page, sesionId: string) {
  // SwiftShader renderiza por software: un viewport pequeño mantiene un FPS útil.
  await page.setViewportSize({ width: 800, height: 600 });
  await page.goto(`/simulacion?sesion=${sesionId}`);
  await expect(page.getByTestId('pantalla-carga')).toHaveAttribute('data-visible', 'false', {
    timeout: 60_000,
  });

  const conversar = page.getByRole('button', { name: 'Conversar con Marta' });
  for (let intento = 0; intento < 20 && !(await conversar.isVisible()); intento++) {
    await page.keyboard.down('KeyW');
    await page.waitForTimeout(400);
    await page.keyboard.up('KeyW');
  }
  await expect(conversar).toBeVisible();
  return conversar;
}

async function iniciarConversacion(page: Page, sesionId: string) {
  const conversar = await acercarseAlPaciente(page, sesionId);
  await conversar.click();
  const panel = page.getByRole('region', { name: 'Conversación con Marta Lucía' });
  await expect(panel).toBeVisible();
  return panel;
}

test.describe('conversación con el paciente virtual (Sprint 3)', () => {
  test.skip(!hayCredencialesEstudiante, MOTIVO_SIN_ESTUDIANTE);
  test.describe.configure({ mode: 'serial' });
  test.slow();

  test.beforeAll(limpiar);
  test.afterAll(limpiar);

  test.beforeEach(async ({ page }) => {
    await iniciarSesionComoEstudiante(page);
  });

  test('HU-13 · T01: al acercarse puede iniciar la conversación y la cámara se fija', async ({
    page,
  }) => {
    const sesionId = await crearSesion();
    const conversar = await acercarseAlPaciente(page, sesionId);
    await expect(page.getByText(/Estás frente a Marta/)).toBeVisible();

    await conversar.click();
    const panel = page.getByRole('region', { name: 'Conversación con Marta Lucía' });
    await expect(panel).toBeVisible();
    await expect(panel.getByTestId('estado-npc')).toHaveText('Escuchando');
    await expect(panel.getByLabel('Tu intervención para Marta Lucía')).toBeFocused();

    // Volver a explorar cierra el panel sin perder la sesión.
    await panel.getByRole('button', { name: 'Volver a explorar' }).click();
    await expect(panel).toBeHidden();
    await expect(page.getByRole('button', { name: 'Conversar con Marta' })).toBeVisible();
  });

  test('HU-12/13/14: conversa con la IA real y guarda el intercambio', async ({ page }) => {
    const sesionId = await crearSesion();
    const panel = await iniciarConversacion(page, sesionId);
    const campo = panel.getByLabel('Tu intervención para Marta Lucía');

    // Shift+Enter inserta un salto de línea; Enter envía.
    await campo.fill('Buenas tardes, Marta.');
    await campo.press('Shift+Enter');
    await campo.pressSequentially('Soy estudiante de psicología. ¿Cómo se ha sentido?');
    const respuestaChat = page.waitForResponse(r => r.url().endsWith('/api/npc/chat'));
    await campo.press('Enter');

    // Mientras la IA responde, el campo se bloquea y el estado cambia a "Pensando".
    await expect(campo).toHaveValue('');
    await expect(panel.getByTestId('estado-npc')).toHaveText('Pensando');
    await expect(campo).toBeDisabled();

    const respuesta = await respuestaChat;
    expect(respuesta.status()).toBe(200);
    const cuerpo = await respuesta.json();
    expect(cuerpo.respuesta_npc.length).toBeGreaterThan(0);
    expect(cuerpo.tokens_entrada).toBeGreaterThan(0);

    // La respuesta se presenta y el paciente vuelve a escuchar.
    await expect(panel.locator('[data-remitente="npc"]')).toHaveCount(1);
    await expect(panel.getByTestId('estado-npc')).toHaveText('Escuchando', { timeout: 15_000 });
    await expect(panel.locator('[data-remitente="npc"]')).toContainText(
      cuerpo.respuesta_npc.slice(0, 20)
    );
    await expect(campo).toBeEnabled();
    await expect(campo).toBeFocused();

    // El intercambio queda guardado en Supabase (estudiante + paciente).
    const { data: mensajes } = await clienteAdmin()
      .from('mensaje')
      .select('remitente, contenido, tokens_entrada')
      .eq('sesion_id', sesionId)
      .order('creado_en')
      .order('remitente');
    expect(mensajes?.map(m => m.remitente)).toEqual(['estudiante', 'npc']);
    expect(mensajes?.[0]?.contenido).toBe(
      'Buenas tardes, Marta.\nSoy estudiante de psicología. ¿Cómo se ha sentido?'
    );
    expect(mensajes?.[1]?.tokens_entrada).toBeGreaterThan(0);

    // Al recargar, la conversación se recupera.
    await page.reload();
    const panelTrasRecargar = await iniciarConversacion(page, sesionId);
    await expect(panelTrasRecargar.locator('[data-remitente]')).toHaveCount(2);
  });

  test('HU-16: un error de la IA muestra el aviso, conserva el historial y permite reintentar', async ({
    page,
  }) => {
    const sesionId = await crearSesion();
    const panel = await iniciarConversacion(page, sesionId);

    // La primera petición falla con un 504 simulado; el reintento llega a la IA real.
    let fallos = 0;
    await page.route('**/api/npc/chat', async ruta => {
      if (fallos++ === 0) {
        await ruta.fulfill({
          status: 504,
          json: { error: 'El paciente virtual tardó demasiado.' },
        });
      } else {
        await ruta.continue();
      }
    });

    const campo = panel.getByLabel('Tu intervención para Marta Lucía');
    await campo.fill('Hola, ¿cómo está?');
    await campo.press('Enter');

    const aviso = panel.getByRole('alertdialog');
    await expect(aviso).toContainText('El paciente virtual no está disponible temporalmente');
    await expect(panel.getByTestId('estado-npc')).toHaveText('Sin conexión');
    await expect(panel.locator('[data-remitente="estudiante"]')).toHaveText(/Hola, ¿cómo está\?/);

    await aviso.getByRole('button', { name: 'Reintentar' }).click();
    await expect(aviso).toBeHidden();
    // El servidor concede hasta 25 s a la IA (con modelo de respaldo) más la escritura progresiva.
    await expect(panel.getByTestId('estado-npc')).toHaveText('Escuchando', { timeout: 45_000 });
    // El mensaje no se duplicó y ahora tiene respuesta.
    await expect(panel.locator('[data-remitente="estudiante"]')).toHaveCount(1);
    await expect(panel.locator('[data-remitente="npc"]')).toHaveCount(1);
  });

  test('HU-16 · T02: finalizar la sesión desde el aviso de error', async ({ page }) => {
    const sesionId = await crearSesion();
    const panel = await iniciarConversacion(page, sesionId);
    await page.route('**/api/npc/chat', ruta =>
      ruta.fulfill({ status: 502, json: { error: 'El servicio de IA no está disponible.' } })
    );

    const campo = panel.getByLabel('Tu intervención para Marta Lucía');
    await campo.fill('Hola');
    await campo.press('Enter');

    const aviso = panel.getByRole('alertdialog');
    await aviso.getByRole('button', { name: 'Finalizar sesión' }).click();
    await expect(aviso).toContainText('la conversación no podrá reanudarse');
    await aviso.getByRole('button', { name: 'Sí, finalizar sesión' }).click();

    const cierre = page.getByRole('dialog', { name: 'Sesión finalizada' });
    await expect(cierre).toBeVisible();
    await expect(cierre).toContainText('Intervenciones');

    const { data } = await clienteAdmin()
      .from('sesion')
      .select('estado, fin')
      .eq('id', sesionId)
      .single();
    expect(data?.estado).toBe('finalizada');
    expect(data?.fin).not.toBeNull();

    await cierre.getByRole('button', { name: 'Ver mi práctica' }).click();
    await expect(page).toHaveURL(new RegExp(`/practicas/${sesionId}$`));
    await expect(page.getByText('Pendiente de retroalimentación.')).toBeVisible();
  });
});

test.describe('Route Handler /api/npc/chat', () => {
  test('HU-12: sin sesión responde 401', async ({ playwright, baseURL }) => {
    const anonimo = await playwright.request.newContext({ baseURL });
    const respuesta = await anonimo.post('/api/npc/chat', { data: {} });
    expect(respuesta.status()).toBe(401);
    await anonimo.dispose();
  });

  test('HU-12: el docente ya no conversa con el paciente (403)', async ({ page }) => {
    test.skip(!hayCredenciales, 'Define E2E_DOCENTE_CORREO y E2E_DOCENTE_CONTRASENA');
    await iniciarSesionComoDocente(page);
    const respuesta = await page.request.post('/api/npc/chat', { data: {} });
    expect(respuesta.status()).toBe(403);
  });

  test('HU-12 · T02: con sesión y cuerpo inválido responde 400 con el detalle', async ({
    page,
  }) => {
    test.skip(!hayCredencialesEstudiante, MOTIVO_SIN_ESTUDIANTE);
    await iniciarSesionComoEstudiante(page);
    const respuesta = await page.request.post('/api/npc/chat', {
      data: { sesion_id: 'x', npc_id: 'y', mensaje_usuario: '', historial: [] },
    });
    expect(respuesta.status()).toBe(400);
    const cuerpo = await respuesta.json();
    expect(Object.keys(cuerpo.campos)).toEqual(
      expect.arrayContaining(['sesion_id', 'npc_id', 'mensaje_usuario'])
    );
  });
});
