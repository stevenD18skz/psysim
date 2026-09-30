import { createClient } from '@supabase/supabase-js';
import { expect, test } from '@playwright/test';

import { hayCredenciales, iniciarSesionComoDocente } from './helpers';

/**
 * Sprint 2 — HU-06 (configuración y datos del estudiante), HU-07 (configuraciones guardadas)
 * y HU-09 · T05 (flujo completo hasta la escena 3D). Registro en docs/pruebas/sprint-2.md.
 *
 * Los datos creados (configuraciones con prefijo "E2E", sesiones con el código de estudiante
 * reservado 2099000xx) se eliminan al terminar con la clave secreta.
 */

const PREFIJO = 'E2E';
/** Código reservado para las pruebas: identifica las sesiones que se limpian al terminar. */
const CODIGO_PRUEBAS = '2099000';
const ESTUDIANTE = { codigo: `${CODIGO_PRUEBAS}01`, nombre: 'Estudiante de Prueba Automatizada' };

function clienteAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const clave = process.env.SUPABASE_SECRET_KEY;
  return url && clave ? createClient(url, clave, { auth: { persistSession: false } }) : null;
}

async function limpiarDatosDePrueba() {
  const admin = clienteAdmin();
  if (!admin) return;
  await admin.from('sesion').delete().like('codigo_estudiante', `${CODIGO_PRUEBAS}%`);
  await admin.from('configuracion_guardada').delete().like('nombre_configuracion', `${PREFIJO}%`);
}

test.describe('configuración del escenario (Sprint 2)', () => {
  test.skip(!hayCredenciales, 'Define E2E_DOCENTE_CORREO y E2E_DOCENTE_CONTRASENA');
  test.describe.configure({ mode: 'serial' });

  test.beforeAll(limpiarDatosDePrueba);
  test.afterAll(limpiarDatosDePrueba);

  test.beforeEach(async ({ page }) => {
    await iniciarSesionComoDocente(page);
  });

  test('HU-06 · T02: muestra los seis escenarios y expande el perfil del NPC', async ({ page }) => {
    const opciones = page.getByRole('radio');
    await expect(opciones).toHaveCount(6);
    for (const codigo of ['E-01', 'E-02', 'E-03', 'E-04', 'E-05', 'E-06']) {
      await expect(page.getByTestId(`escenario-${codigo}`)).toBeVisible();
    }
    await expect(page.getByTestId('escenario-E-05')).toContainText('Cotidiano');
    await expect(page.getByTestId('escenario-E-04')).toContainText('Nivel avanzado');

    await expect(page.getByLabel('Comportamiento del paciente')).toBeHidden();
    await page.getByTestId('escenario-E-01').click();
    await expect(page.getByRole('heading', { name: 'Marta Lucía' })).toBeVisible();
    await expect(page.getByLabel('Comportamiento del paciente')).toHaveValue(/Eres Marta Lucía/);

    // Solo un escenario seleccionado a la vez.
    await page.getByTestId('escenario-E-02').click();
    await expect(page.getByRole('radio', { checked: true })).toHaveCount(1);
    await expect(page.getByLabel('Comportamiento del paciente')).toHaveValue(/Eres Andrés Felipe/);
  });

  test('HU-06 · T03: valida los datos del estudiante con mensajes inline', async ({ page }) => {
    await page.getByRole('button', { name: 'Iniciar simulación' }).click();
    await expect(page.getByText('Selecciona un escenario para continuar.')).toBeVisible();
    await expect(page.getByText('Ingresa el código institucional del estudiante.')).toBeVisible();
    await expect(page.getByText('Ingresa el nombre completo del estudiante.')).toBeVisible();

    await page.getByLabel('Código institucional').fill('20-ABC');
    await page.getByLabel('Nombre completo').fill('A');
    await page.getByLabel('Nombre completo').blur();
    await expect(page.getByText('El código solo puede contener números.')).toBeVisible();
    await expect(page.getByText('El nombre debe tener al menos 2 caracteres.')).toBeVisible();
    await expect(page).toHaveURL(/\/configuracion$/);
  });

  test('HU-07: guarda, lista, carga y elimina una configuración', async ({ page }) => {
    const nombre = `${PREFIJO} Duelo grupo A`;
    const prompt = `${PREFIJO}: Eres Marta Lucía y hoy estás especialmente reservada con el estudiante.`;

    const guardar = page.getByRole('button', { name: 'Guardar configuración' });
    await expect(guardar).toBeDisabled();

    await page.getByTestId('escenario-E-01').click();
    await page.getByLabel('Comportamiento del paciente').fill(prompt);
    await expect(page.getByText('Personalizado', { exact: true })).toBeVisible();
    await guardar.click();
    await page.getByLabel('Nombre de la configuración').fill(nombre);
    await page.getByRole('button', { name: 'Guardar', exact: true }).click();
    await expect(page.getByText(`Configuración «${nombre}» guardada.`)).toBeVisible();

    // Persiste tras recargar: se lee de Supabase.
    await page.reload();
    await page.getByRole('button', { name: /Mis configuraciones guardadas/ }).click();
    const lista = page.getByRole('list', { name: 'Configuraciones guardadas' });
    await expect(lista.getByText(nombre)).toBeVisible();
    await expect(lista).toContainText('E-01 · Duelo y pérdida');

    // Cargar no borra los datos del estudiante ya ingresados (T04).
    await page.getByTestId('escenario-E-03').click();
    await page.getByLabel('Código institucional').fill(ESTUDIANTE.codigo);
    await page.getByLabel('Nombre completo').fill(ESTUDIANTE.nombre);
    await page.getByRole('button', { name: `Cargar la configuración ${nombre}` }).click();
    await expect(page.getByRole('radio', { name: /Duelo y pérdida/ })).toBeChecked();
    await expect(page.getByLabel('Comportamiento del paciente')).toHaveValue(prompt);
    await expect(page.getByLabel('Código institucional')).toHaveValue(ESTUDIANTE.codigo);
    await expect(page.getByLabel('Nombre completo')).toHaveValue(ESTUDIANTE.nombre);

    // No se permiten nombres repetidos.
    await guardar.click();
    await page.getByLabel('Nombre de la configuración').fill(nombre);
    await page.getByRole('button', { name: 'Guardar', exact: true }).click();
    await expect(page.getByText('Ya tienes una configuración con ese nombre.')).toBeVisible();
    await page.getByRole('button', { name: 'Cancelar el guardado' }).click();

    await page.getByRole('button', { name: `Eliminar la configuración ${nombre}` }).click();
    await page.getByRole('button', { name: 'Sí, eliminar' }).click();
    await expect(lista.getByText(nombre)).toBeHidden();
  });

  test('HU-06 · T04 y HU-09 · T05: inicia la sesión y carga la escena 3D', async ({ page }) => {
    test.slow(); // La escena 3D se renderiza por software (SwiftShader) en CI.

    await page.getByTestId('escenario-E-01').click();
    await page.getByLabel('Código institucional').fill(ESTUDIANTE.codigo);
    await page.getByLabel('Nombre completo').fill(ESTUDIANTE.nombre);
    await page.getByRole('button', { name: 'Iniciar simulación' }).click();

    await expect(page).toHaveURL(/\/simulacion\?sesion=[0-9a-f-]{36}$/);
    const sesionId = new URL(page.url()).searchParams.get('sesion')!;

    const hud = page.getByRole('complementary', { name: 'Datos de la sesión' });
    await expect(hud).toContainText('E-01');
    await expect(hud).toContainText('Duelo y pérdida');
    await expect(hud).toContainText('Marta Lucía');
    await expect(hud).toContainText(ESTUDIANTE.nombre);

    // La pantalla de carga desaparece cuando la escena está lista.
    await expect(page.getByTestId('pantalla-carga')).toHaveAttribute('data-visible', 'false', {
      timeout: 60_000,
    });
    await expect(page.getByRole('img', { name: 'Escena 3D de la simulación' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Comenzar a explorar' })).toBeVisible();

    // El registro existe en Supabase con estado en_curso y el prompt copiado.
    const admin = clienteAdmin();
    if (admin) {
      const { data } = await admin
        .from('sesion')
        .select('estado, codigo_estudiante, nombre_estudiante, prompt_sistema, fin')
        .eq('id', sesionId)
        .single();
      expect(data).toMatchObject({
        estado: 'en_curso',
        codigo_estudiante: ESTUDIANTE.codigo,
        nombre_estudiante: ESTUDIANTE.nombre,
        fin: null,
      });
      expect(data?.prompt_sistema).toContain('Eres Marta Lucía');
    }

    // Recargar conserva la sesión (se hidrata desde el servidor).
    await page.reload();
    await expect(hud).toContainText(ESTUDIANTE.nombre);

    // /simulacion sin parámetro retoma la última sesión en curso.
    await page.goto('/simulacion');
    await expect(page).toHaveURL(`/simulacion?sesion=${sesionId}`);
  });

  test('HU-10: camina con el teclado y respeta muebles y límites', async ({ page }) => {
    test.slow();
    // SwiftShader renderiza por software: un viewport pequeño mantiene un FPS útil para la prueba.
    await page.setViewportSize({ width: 640, height: 400 });

    // Retoma la sesión creada en el test anterior, con el indicador de depuración activo.
    await page.goto('/simulacion');
    await expect(page).toHaveURL(/sesion=/);
    await page.goto(`${page.url()}&debug=1`);
    await expect(page.getByTestId('pantalla-carga')).toHaveAttribute('data-visible', 'false', {
      timeout: 60_000,
    });

    const indicador = page.getByTestId('indicador-fps');
    const posicion = async () =>
      ((await indicador.getAttribute('data-posicion')) ?? '0,0,0').split(',').map(Number) as [
        number,
        number,
        number,
      ];
    const mantener = async (tecla: string, ms: number) => {
      await page.keyboard.down(tecla);
      await page.waitForTimeout(ms);
      await page.keyboard.up(tecla);
      await page.waitForTimeout(800); // frena y el indicador se actualiza cada 0,5 s
    };

    // Posición inicial definida en scenes/e-01.json: [0, 1.6, 2.7].
    await expect.poll(async () => (await posicion())[2], { timeout: 10_000 }).toBeCloseTo(2.7, 1);

    // W: avanza hacia el paciente (-Z) manteniendo la altura de los ojos.
    await mantener('KeyW', 1500);
    const tras1 = await posicion();
    expect(tras1[2]).toBeLessThan(2.7 - 0.5);
    expect(tras1[1]).toBeCloseTo(1.6, 1);

    // Seguir avanzando: la mesa de centro (z ≈ -0.8) lo detiene antes del sillón del paciente.
    await mantener('KeyW', 6000);
    const bloqueado = await posicion();
    expect(bloqueado[2]).toBeGreaterThan(-0.5);
    expect(bloqueado[2]).toBeLessThan(tras1[2]);

    // D: se desliza a la derecha y nunca supera el límite de navegación (x ≤ 2.7).
    await mantener('KeyD', 4000);
    const lateral = await posicion();
    expect(lateral[0]).toBeGreaterThan(0.5);
    expect(lateral[0]).toBeLessThanOrEqual(2.7);

    // S: retrocede hasta el límite trasero de la sala (z ≤ 3.2).
    await mantener('KeyS', 5000);
    expect((await posicion())[2]).toBeLessThanOrEqual(3.2);
  });

  test('una sesión inexistente muestra un estado vacío', async ({ page }) => {
    await page.goto('/simulacion?sesion=00000000-0000-4000-8000-000000000000');
    await expect(
      page.getByRole('heading', { name: 'Esta sesión no está disponible' })
    ).toBeVisible();
    await page.goto('/simulacion?sesion=no-es-un-uuid');
    await expect(
      page.getByRole('heading', { name: 'Esta sesión no está disponible' })
    ).toBeVisible();
    await page.getByRole('link', { name: 'Preparar una sesión' }).click();
    await expect(page).toHaveURL(/\/configuracion$/);
  });
});
