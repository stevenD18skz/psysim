import { expect, type Page, test } from '@playwright/test';

import {
  abrirCasosPredefinidos,
  abrirConversacion,
  canjearCodigoEnPracticas,
  clienteAdmin,
  comenzarSimulacion,
  limpiarCodigos,
  registrarEstudiantePrueba,
} from './flujos';
import {
  hayCredencialesEstudiante,
  iniciarSesionComoDocente,
  iniciarSesionComoEstudiante,
  MOTIVO_SIN_ESTUDIANTE,
  respuestaDelChat,
} from './helpers';

/**
 * HU-27 · T01 (Sprint 6) — El test más importante: el ciclo completo entre el docente y el
 * estudiante, cada uno en su propio navegador, con la IA real.
 *
 * 1. El docente configura el caso y genera el código de acceso del estudiante.
 * 2. El estudiante entra con su cuenta, canjea el código, lee las instrucciones y conversa.
 *    Mientras tanto, el docente solo ve "Simulación en progreso".
 * 3. El estudiante finaliza; el docente subraya una frase, la comenta, pone la nota y publica.
 * 4. El estudiante ve la nota, la retroalimentación y el comentario sobre su frase.
 */

const ESTUDIANTE = 'Estudiante de Prueba Uno';
const INTERVENCION =
  'Buenas tardes, Marta. Soy estudiante de psicología. ¿Cómo se ha sentido esta semana?';
let codigo = '';
let sesionCreada: string | undefined;

/** Selecciona una frase con las teclas del navegador y abre su comentario. */
async function seleccionarFragmento(page: Page, fragmento: string) {
  await page.getByRole('button', { name: 'Elegir frase para comentar' }).press('Enter');
  const campo = page.getByRole('textbox', { name: 'Texto de la intervención' });
  await expect(campo).toBeFocused();
  const inicio = (await campo.inputValue()).indexOf(fragmento);
  expect(inicio).toBeGreaterThanOrEqual(0);
  await page.keyboard.press('Control+Home');
  for (let i = 0; i < inicio; i++) await page.keyboard.press('ArrowRight');
  for (const _ of fragmento) await page.keyboard.press('Shift+ArrowRight');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Comentar frase' })).toBeFocused();
  await page.keyboard.press('Enter');
}

test.describe('flujo completo docente ↔ estudiante (HU-27 · T01)', () => {
  test.skip(!hayCredencialesEstudiante, MOTIVO_SIN_ESTUDIANTE);

  test.beforeAll(() => registrarEstudiantePrueba());
  test.afterAll(async () => {
    if (!codigo) return;
    await limpiarCodigos([codigo]);
    const admin = clienteAdmin()!;
    const asignacion = await admin
      .from('asignacion')
      .select('id')
      .eq('codigo', codigo)
      .maybeSingle();
    expect(asignacion.error).toBeNull();
    expect(asignacion.data).toBeNull();
    if (!sesionCreada) return;
    const sesion = await admin.from('sesion').select('id').eq('id', sesionCreada).maybeSingle();
    expect(sesion.error).toBeNull();
    expect(sesion.data).toBeNull();
  });

  test('código de acceso, simulación, revisión y retroalimentación publicada', async ({
    browser,
    page,
  }) => {
    test.slow(); // Escena 3D por software (SwiftShader) e IA real.
    test.setTimeout(360_000);

    // 1. El docente configura el caso E-01 para el estudiante y genera el código.
    await iniciarSesionComoDocente(page);
    await page.goto('/configuracion');
    await abrirCasosPredefinidos(page);
    await page.getByTestId('escenario-E-01').click();
    await page.getByRole('combobox', { name: 'Busca al estudiante' }).fill('Prueba Uno');
    await page.getByRole('option', { name: new RegExp(ESTUDIANTE) }).click();
    const generar = page.getByRole('button', { name: 'Generar código' });
    await generar.click();
    const dialogo = page.getByRole('dialog', { name: /Código listo para/ });
    codigo = (await dialogo.getByTestId('codigo-acceso').textContent())!.trim();
    await dialogo.getByRole('button', { name: 'Listo' }).click();
    await expect(generar).toBeFocused();

    // 2. El estudiante, en su propio navegador, canjea el código y conversa.
    const contextoEstudiante = await browser.newContext();
    const pestanaEstudiante = await contextoEstudiante.newPage();
    await iniciarSesionComoEstudiante(pestanaEstudiante);
    const sesionId = await canjearCodigoEnPracticas(pestanaEstudiante, codigo.toUpperCase());
    sesionCreada = sesionId;
    await comenzarSimulacion(pestanaEstudiante, /Duelo y pérdida/);
    const hud = pestanaEstudiante.getByRole('complementary', { name: 'Datos de la práctica' });
    await expect(hud).toContainText('Duelo y pérdida');

    const panel = await abrirConversacion(pestanaEstudiante, 'Marta', 'Marta Lucía');
    // El servidor procesa y guarda el turno real. El navegador pierde solo la respuesta.
    let estadoPrimeraRespuesta: number | undefined;
    let primeraRespuesta: string | undefined;
    await pestanaEstudiante.route(
      '**/api/npc/chat',
      async ruta => {
        try {
          const respuestaReal = await ruta.fetch({ timeout: 60_000 });
          estadoPrimeraRespuesta = respuestaReal.status();
          if (respuestaReal.ok())
            primeraRespuesta = (await respuestaDelChat(respuestaReal)).respuesta_npc;
          await respuestaReal.dispose();
        } finally {
          await ruta.abort();
        }
      },
      { times: 1 }
    );
    const campo = panel.getByLabel('Tu intervención para Marta Lucía');
    await campo.fill(INTERVENCION);
    await campo.press('Enter');
    const reintentar = panel.getByRole('button', { name: 'Reintentar' });
    await expect(reintentar).toBeVisible({ timeout: 65_000 });
    expect(estadoPrimeraRespuesta).toBe(200);
    expect(primeraRespuesta).toBeTruthy();
    await reintentar.click();
    const respuestas = panel.locator('[data-remitente="npc"]');
    await expect(respuestas).toHaveCount(1, { timeout: 40_000 });
    await expect(panel.getByTestId('estado-npc')).toHaveText('Escuchando');
    const respuesta = (await respuestas.first().locator('p').textContent())!.trim();
    expect(respuesta).toBe(primeraRespuesta);
    // La etiqueta de emoción de la IA nunca llega al estudiante.
    expect(respuesta).not.toMatch(/^\[\p{L}+\]/u);

    // Aunque el intercambio ya existe, el docente solo ve que la práctica sigue en curso.
    await page.goto(`/sesiones/${sesionId}`);
    await expect(page.getByRole('heading', { name: 'Practicando ahora' })).toBeVisible();
    await expect(page.getByText(INTERVENCION, { exact: true })).toHaveCount(0);

    // 3. El estudiante finaliza desde el HUD.
    await panel.getByRole('button', { name: 'Volver a explorar' }).click();
    // Al volver se recaptura el ratón; el navegador sin interfaz no lo suelta con Escape.
    await pestanaEstudiante.evaluate(() => document.exitPointerLock());
    await pestanaEstudiante.getByRole('button', { name: 'Terminar práctica' }).click();
    const confirmacion = pestanaEstudiante.getByRole('alertdialog');
    await expect(confirmacion).toContainText('No se puede reanudar');
    await confirmacion.getByRole('button', { name: 'Terminar práctica' }).click();
    // HU-20: llega a los resultados con las métricas de la sesión.
    await expect(pestanaEstudiante).toHaveURL(new RegExp(`/resultados\\?sesion=${sesionId}`), {
      timeout: 30_000,
    });
    await expect(
      pestanaEstudiante.getByRole('region', { name: 'Total de intervenciones' })
    ).toContainText('1');
    await pestanaEstudiante.goto(`/practicas/${sesionId}`);
    await expect(pestanaEstudiante).toHaveURL(new RegExp(`/practicas/${sesionId}$`));
    await expect(
      pestanaEstudiante.getByText('Tu docente aún no publica la retroalimentación.')
    ).toBeVisible();

    // El docente revisa: subraya una frase, la comenta, pone la nota y publica.
    await page.goto('/sesiones?orden=recientes');
    await page.locator(`a[href="/sesiones/${sesionId}"]:visible`).click();
    await expect(page.getByRole('heading', { name: 'Conversación', exact: true })).toBeVisible();
    const comentario = 'Buen encuadre inicial y tono empático.';
    await page.getByLabel('Comentario general').fill(comentario);
    await page.getByLabel('Nota (0,0 a 5,0)').fill('4,5');
    await seleccionarFragmento(page, 'Soy estudiante de psicología');
    const anotacion = page.getByLabel('Comentario sobre la frase seleccionada');
    await expect(anotacion).toBeFocused();
    await anotacion.fill('Bien: te presentas antes de preguntar.');
    await anotacion.press('Control+Enter');
    await expect(page.getByRole('button', { name: 'Elegir frase para comentar' })).toBeFocused();
    await expect(page.locator('mark')).toHaveText('Soy estudiante de psicología');
    await page.getByRole('button', { name: 'Guardar borrador' }).click();
    await expect(page.getByText('Borrador guardado.', { exact: true })).toBeVisible();
    await page.reload();
    await expect(page.getByLabel('Comentario general')).toHaveValue(comentario);
    await expect(page.getByLabel('Nota (0,0 a 5,0)')).toHaveValue('4,5');
    await pestanaEstudiante.reload();
    await expect(
      pestanaEstudiante.getByText('Tu docente aún no publica la retroalimentación.')
    ).toBeVisible();
    await expect(pestanaEstudiante.getByText(comentario)).toHaveCount(0);
    await expect(pestanaEstudiante.locator('mark')).toHaveCount(0);
    // «Publicar» (o «Publicar y abrir la siguiente» si quedan pendientes) pide confirmar.
    await page.getByRole('button', { name: /^Publicar/ }).click();
    await page.getByRole('button', { name: /^Publicar/ }).click();
    await expect(page.getByText(/^Publicada\./)).toBeVisible();

    // 4. El estudiante ve la retroalimentación publicada.
    await pestanaEstudiante.reload();
    await expect(pestanaEstudiante.getByTestId('nota-publicada')).toHaveText('4,5');
    await expect(pestanaEstudiante.getByText(comentario)).toBeVisible();
    await expect(pestanaEstudiante.locator('mark')).toHaveText('Soy estudiante de psicología');
    await expect(
      pestanaEstudiante.getByText('Bien: te presentas antes de preguntar.')
    ).toBeVisible();

    // Y queda registrado en Supabase.
    const admin = clienteAdmin()!;
    const [sesion, mensajes, ia] = await Promise.all([
      admin
        .from('sesion')
        .select('estado, retroalimentacion ( nota, publicada_en, anotacion ( fragmento ) )')
        .eq('id', sesionId)
        .single(),
      admin.from('mensaje').select('remitente, contenido').eq('sesion_id', sesionId),
      admin.from('mensaje_ia').select('proveedor').eq('sesion_id', sesionId).single(),
    ]);
    expect(sesion.error).toBeNull();
    expect(sesion.data?.estado).toBe('finalizada');
    expect(sesion.data?.retroalimentacion).toMatchObject({
      nota: 4.5,
      publicada_en: expect.any(String),
      anotacion: [{ fragmento: 'Soy estudiante de psicología' }],
    });
    expect(mensajes.error).toBeNull();
    expect(mensajes.data).toHaveLength(2);
    expect(mensajes.data).toEqual(
      expect.arrayContaining([
        { remitente: 'estudiante', contenido: INTERVENCION },
        { remitente: 'npc', contenido: respuesta },
      ])
    );
    expect(ia.error).toBeNull();
    expect(ia.data?.proveedor).toMatch(/^(orquestador|gemini)$/);
    test.info().annotations.push({ type: 'proveedor IA', description: ia.data?.proveedor });
    await contextoEstudiante.close();
  });
});
