import { expect, type Page, test } from '@playwright/test';

import {
  abrirConversacion,
  canjearCodigoEnPracticas,
  clienteAdmin,
  comenzarSimulacion,
  conversar,
  limpiarCodigos,
  registrarEstudiantePrueba,
} from './flujos';
import {
  hayCredencialesEstudiante,
  iniciarSesionComoDocente,
  iniciarSesionComoEstudiante,
  MOTIVO_SIN_ESTUDIANTE,
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

/** Selecciona un fragmento de la primera intervención del estudiante (como con el ratón). */
async function seleccionarFragmento(page: Page, fragmento: string) {
  await page.evaluate(texto => {
    const elemento = document.querySelector('[data-remitente="estudiante"] [data-texto-mensaje]')!;
    const nodo = [...elemento.childNodes]
      .flatMap(n => (n.nodeType === Node.TEXT_NODE ? [n] : [...n.childNodes]))
      .find(n => n.textContent?.includes(texto))!;
    const inicio = nodo.textContent!.indexOf(texto);
    const rango = document.createRange();
    rango.setStart(nodo, inicio);
    rango.setEnd(nodo, inicio + texto.length);
    const seleccion = window.getSelection()!;
    seleccion.removeAllRanges();
    seleccion.addRange(rango);
  }, fragmento);
}

test.describe('flujo completo docente ↔ estudiante (HU-27 · T01)', () => {
  test.skip(!hayCredencialesEstudiante, MOTIVO_SIN_ESTUDIANTE);

  test.beforeAll(() => registrarEstudiantePrueba());
  test.afterAll(() => (codigo ? limpiarCodigos([codigo]) : undefined));

  test('código de acceso, simulación, revisión y retroalimentación publicada', async ({
    browser,
    page,
  }) => {
    test.slow(); // Escena 3D por software (SwiftShader) e IA real.
    test.setTimeout(360_000);

    // 1. El docente configura el caso E-01 para el estudiante y genera el código.
    await iniciarSesionComoDocente(page);
    await page.getByTestId('escenario-E-01').click();
    await page.getByRole('combobox', { name: 'Busca al estudiante' }).fill('Prueba Uno');
    await page.getByRole('option', { name: new RegExp(ESTUDIANTE) }).click();
    await page.getByRole('button', { name: 'Generar código de acceso' }).click();
    const dialogo = page.getByRole('dialog', { name: 'Código de acceso listo' });
    codigo = (await dialogo.getByTestId('codigo-acceso').textContent())!.trim();
    await dialogo.getByRole('button', { name: 'Listo' }).click();

    // 2. El estudiante, en su propio navegador, canjea el código y conversa.
    const contextoEstudiante = await browser.newContext();
    const alumno = await contextoEstudiante.newPage();
    await iniciarSesionComoEstudiante(alumno);
    const sesionId = await canjearCodigoEnPracticas(alumno, codigo.toUpperCase());
    await comenzarSimulacion(alumno, /Duelo y pérdida/);
    const hud = alumno.getByRole('complementary', { name: 'Datos de la sesión' });
    await expect(hud).toContainText(ESTUDIANTE);

    // El docente solo ve que la simulación está en progreso (sin el chat).
    await page.goto(`/sesiones/${sesionId}`);
    await expect(page.getByRole('heading', { name: 'Simulación en progreso' })).toBeVisible();
    await expect(page.getByText(INTERVENCION)).toHaveCount(0);

    const panel = await abrirConversacion(alumno, 'Marta', 'Marta Lucía');
    const respuesta = await conversar(panel, 'Marta Lucía', INTERVENCION);
    expect(respuesta.length).toBeGreaterThan(0);
    // La etiqueta de emoción de la IA nunca llega al estudiante.
    expect(respuesta).not.toMatch(/^\[\p{L}+\]/u);

    // 3. El estudiante finaliza desde el HUD.
    await panel.getByRole('button', { name: 'Volver a explorar' }).click();
    await alumno.keyboard.press('Escape');
    await alumno.getByRole('button', { name: 'Finalizar sesión' }).click();
    const confirmacion = alumno.getByRole('alertdialog');
    await expect(confirmacion).toContainText('no podrá reanudarse');
    await confirmacion.getByRole('button', { name: 'Confirmar finalización' }).click();
    const cierre = alumno.getByRole('dialog', { name: 'Sesión finalizada' });
    await expect(cierre).toBeVisible({ timeout: 30_000 });
    await cierre.getByRole('button', { name: 'Ver mi práctica' }).click();
    await expect(alumno).toHaveURL(new RegExp(`/practicas/${sesionId}$`));
    await expect(alumno.getByText('Pendiente de retroalimentación.')).toBeVisible();

    // El docente revisa: subraya una frase, la comenta, pone la nota y publica.
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Conversación' })).toBeVisible();
    await seleccionarFragmento(page, 'Soy estudiante de psicología');
    await page.getByRole('button', { name: 'Comentar selección' }).click();
    await page
      .getByLabel('Comentario sobre la frase seleccionada')
      .fill('Bien: te presentas antes de preguntar.');
    await page.getByRole('button', { name: 'Guardar comentario' }).click();
    await expect(page.locator('mark')).toHaveText('Soy estudiante de psicología');

    await page.getByLabel('Comentario general').fill('Buen encuadre inicial y tono empático.');
    await page.getByLabel('Nota (0,0 a 5,0)').fill('4,5');
    await page.getByRole('button', { name: 'Publicar' }).click();
    await page.getByRole('button', { name: 'Sí, publicar' }).click();
    await expect(page.getByText(/Publicada el/)).toBeVisible();

    // 4. El estudiante ve la retroalimentación publicada.
    await alumno.reload();
    await expect(alumno.getByTestId('nota-publicada')).toHaveText('4,5');
    await expect(alumno.getByText('Buen encuadre inicial y tono empático.')).toBeVisible();
    await expect(alumno.locator('mark')).toHaveText('Soy estudiante de psicología');
    await expect(alumno.getByText('Bien: te presentas antes de preguntar.')).toBeVisible();

    // Y queda registrado en Supabase.
    const admin = clienteAdmin();
    if (admin) {
      const { data } = await admin
        .from('sesion')
        .select('estado, retroalimentacion ( nota, publicada_en, anotacion ( fragmento ) )')
        .eq('id', sesionId)
        .single();
      expect(data?.estado).toBe('finalizada');
      expect(data?.retroalimentacion).toMatchObject({
        nota: 4.5,
        anotacion: [{ fragmento: 'Soy estudiante de psicología' }],
      });
    }
    await contextoEstudiante.close();
  });
});
