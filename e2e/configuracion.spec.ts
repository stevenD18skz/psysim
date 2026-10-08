import { createClient } from '@supabase/supabase-js';
import { expect, test } from '@playwright/test';

import { limpiarCodigos, prepararSesion, registrarEstudiantePrueba } from './flujos';
import {
  hayCredenciales,
  hayCredencialesEstudiante,
  iniciarSesionComoDocente,
  iniciarSesionComoEstudiante,
  MOTIVO_SIN_ESTUDIANTE,
} from './helpers';

/**
 * Sprint 2 — HU-06 (configuración y asignación al estudiante), HU-07 (casos propios) y HU-09 · T05
 * (flujo completo hasta la escena 3D). Registro en docs/pruebas/sprint-2.md.
 *
 * El docente configura y genera un código de acceso; el estudiante lo canjea y la simulación
 * corre en su sesión. Los datos creados (casos propios con prefijo "E2E", códigos con el prefijo
 * "cfg" y sus sesiones) se eliminan al terminar con la clave secreta.
 */

const PREFIJO = 'E2E';
/** Prefijo de los códigos de acceso de este archivo: identifica lo que se limpia al terminar. */
const PREFIJO_CODIGOS = 'cfg';
/** Nombre del estudiante de prueba (E2E_ESTUDIANTE_*, creado por pnpm db:seed). */
const ESTUDIANTE = { codigo: '209990001', nombre: 'Estudiante de Prueba Uno' };
/** Códigos generados desde la interfaz (aleatorios): se limpian por su valor. */
const codigosGenerados: string[] = [];

function clienteAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const clave = process.env.SUPABASE_SECRET_KEY;
  return url && clave ? createClient(url, clave, { auth: { persistSession: false } }) : null;
}

async function limpiarDatosDePrueba() {
  const admin = clienteAdmin();
  if (!admin) return;
  await limpiarCodigos(PREFIJO_CODIGOS);
  if (codigosGenerados.length) await limpiarCodigos(codigosGenerados);
  // El NPC se elimina en cascada. Las sesiones ya se borraron arriba (referencian el escenario).
  await admin.from('escenario').delete().like('titulo', `${PREFIJO}%`);
}

test.describe('configuración del escenario (Sprint 2)', () => {
  test.skip(!hayCredenciales, 'Define E2E_DOCENTE_CORREO y E2E_DOCENTE_CONTRASENA');
  test.describe.configure({ mode: 'serial' });

  test.beforeAll(async () => {
    await limpiarDatosDePrueba();
    // El estudiante de prueba debe estar registrado (con cuenta) para recibir códigos.
    if (hayCredencialesEstudiante) await registrarEstudiantePrueba();
  });
  test.afterAll(limpiarDatosDePrueba);

  test.beforeEach(async ({ page }) => {
    await iniciarSesionComoDocente(page);
  });

  test('HU-06 · T02: muestra los seis escenarios y expande el perfil del NPC', async ({ page }) => {
    // Los seis escenarios oficiales (el docente puede tener además casos propios en "Mis casos").
    await expect(page.locator('[data-testid^="escenario-E-"]')).toHaveCount(6);
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
    await expect(
      page.getByRole('radiogroup', { name: /Elige el caso/ }).getByRole('radio', { checked: true })
    ).toHaveCount(1);
    await expect(page.getByLabel('Comportamiento del paciente')).toHaveValue(/Eres Andrés Felipe/);
  });

  test('HU-06 · T03: exige el caso y el estudiante con mensajes inline', async ({ page }) => {
    await page.getByRole('button', { name: 'Generar código de acceso' }).click();
    await expect(page.getByText('Selecciona un escenario para continuar.')).toBeVisible();
    await expect(page.getByText('Elige al estudiante que va a practicar.')).toBeVisible();
    await expect(page).toHaveURL(/\/configuracion$/);
  });

  test('HU-06 · T04: asigna el caso a un estudiante y genera su código de acceso', async ({
    page,
  }) => {
    test.skip(!hayCredencialesEstudiante, MOTIVO_SIN_ESTUDIANTE);

    await page.getByTestId('escenario-E-01').click();
    await page.getByRole('combobox', { name: 'Busca al estudiante' }).fill(ESTUDIANTE.codigo);
    await page.getByRole('option', { name: new RegExp(ESTUDIANTE.nombre) }).click();
    await expect(page.getByTestId('estudiante-elegido')).toHaveText(ESTUDIANTE.nombre);
    await page.getByRole('radio', { name: '1 día' }).check({ force: true });
    await page.getByRole('button', { name: 'Generar código de acceso' }).click();

    const dialogo = page.getByRole('dialog', { name: 'Código de acceso listo' });
    const codigo = (await dialogo.getByTestId('codigo-acceso').textContent())!.trim();
    codigosGenerados.push(codigo);
    expect(codigo).toMatch(/^[a-z]{3}-[a-z]{4}-[a-z]{3}$/);
    await expect(dialogo).toContainText(`/unirse/${codigo}`);
    // La simulación ya no se abre en el equipo del docente.
    await expect(page).toHaveURL(/\/configuracion/);

    // Queda en la base de datos con el prompt copiado y una vigencia de un día.
    const admin = clienteAdmin();
    if (admin) {
      const { data } = await admin
        .from('asignacion')
        .select('prompt_sistema, expira_en, creado_en, sesion_id')
        .eq('codigo', codigo)
        .single();
      expect(data?.prompt_sistema).toContain('Eres Marta Lucía');
      expect(data?.sesion_id).toBeNull();
      const horas =
        (new Date(data!.expira_en).getTime() - new Date(data!.creado_en).getTime()) / 3_600_000;
      expect(horas).toBeCloseTo(24, 0);
    }
  });

  test('HU-07: guarda un escenario ajustado como caso propio y lo elimina', async ({ page }) => {
    const nombre = `${PREFIJO} Duelo grupo A`;
    const prompt = `${PREFIJO}: Eres Marta Lucía y hoy estás especialmente reservada con el estudiante.`;

    const guardar = page.getByRole('button', { name: 'Guardar como mi caso' });
    await expect(guardar).toBeDisabled();

    await page.getByTestId('escenario-E-01').click();
    await page.getByLabel('Comportamiento del paciente').fill(prompt);
    await expect(page.getByText('Personalizado', { exact: true })).toBeVisible();
    await guardar.click();
    await page.getByLabel('Nombre del caso').fill(nombre);
    await page.getByRole('button', { name: 'Guardar', exact: true }).click();
    await expect(page.getByText(`«${nombre}» guardado en Mis casos.`)).toBeVisible();

    // Persiste tras recargar: se lee de Supabase.
    await page.reload();
    const propio = page.getByRole('radio', { name: new RegExp(nombre) });
    await expect(propio).toBeVisible();

    // Al elegirlo se carga el prompt guardado, sin las reglas fijas del servidor.
    await page.getByTestId('escenario-E-03').click();
    await propio.check({ force: true });
    await expect(page.getByLabel('Comportamiento del paciente')).toHaveValue(prompt);

    await page.getByRole('button', { name: `Eliminar el caso ${nombre}` }).click();
    await page.getByRole('button', { name: 'Sí, eliminar' }).click();
    await expect(page.getByRole('radio', { name: new RegExp(nombre) })).toBeHidden();
  });

  test('HU-07: crea un caso con el constructor guiado y lo edita', async ({ page }) => {
    const titulo = `${PREFIJO} Caso del constructor`;

    await page.getByRole('link', { name: /Crear (caso nuevo|mi primer caso)/ }).click();
    await expect(page).toHaveURL(/\/configuracion\/casos\/nuevo$/);

    await page.getByLabel('Título del caso').fill(titulo);
    await page.getByLabel('Competencia que se entrena').fill('Escucha activa');
    await page.getByLabel('Nombre', { exact: true }).fill('Camila Rojas');
    await page.getByLabel('Edad').fill('29');
    await page
      .getByLabel('Situación y motivo de consulta')
      .fill('Llega a consulta tras perder su empleo y sentirse sin rumbo.');
    await page.getByRole('button', { name: 'tristeza persistente' }).click();
    await page.getByRole('button', { name: 'reservado' }).click();
    await page.getByLabel('Frase de apertura').fill('Hola, no sé por dónde empezar.');

    // La vista previa se arma con los campos y no incluye las reglas fijas.
    const vista = page.getByLabel('Prompt generado');
    await expect(vista).toContainText('Eres Camila Rojas, una persona de 29 años.');
    await expect(vista).toContainText('tristeza persistente');
    await expect(vista).not.toContainText('Reglas de interpretación');

    await page.getByRole('button', { name: 'Guardar caso' }).click();
    await expect(page).toHaveURL(/\/configuracion\?caso=[0-9a-f-]{36}$/);
    await expect(page.getByRole('radio', { name: new RegExp(titulo) })).toBeChecked();

    // Editar recupera los campos del constructor.
    await page.getByRole('link', { name: `Editar el caso ${titulo}` }).click();
    // En desarrollo, la primera visita compila la ruta: puede tardar más que la espera por defecto.
    await expect(page).toHaveURL(/\/configuracion\/casos\/[0-9a-f-]{36}$/, { timeout: 30_000 });
    await expect(page.getByLabel('Nombre', { exact: true })).toHaveValue('Camila Rojas');
    await expect(page.getByRole('button', { name: 'tristeza persistente' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
  });
});

test.describe('simulación del estudiante (Sprint 2)', () => {
  test.skip(!hayCredencialesEstudiante, MOTIVO_SIN_ESTUDIANTE);
  test.describe.configure({ mode: 'serial' });

  test.beforeAll(() => limpiarCodigos(PREFIJO_CODIGOS));
  test.afterAll(() => limpiarCodigos(PREFIJO_CODIGOS));

  test.beforeEach(async ({ page }) => {
    await iniciarSesionComoEstudiante(page);
  });

  test('HU-09 · T05: el estudiante canjea el código y carga la escena 3D', async ({ page }) => {
    test.slow(); // La escena 3D se renderiza por software (SwiftShader) en CI.

    const sesionId = await prepararSesion(page, PREFIJO_CODIGOS);

    const hud = page.getByRole('complementary', { name: 'Datos de la sesión' });

    // La pantalla de carga desaparece cuando la escena está lista.
    await expect(page.getByTestId('pantalla-carga')).toHaveAttribute('data-visible', 'false', {
      timeout: 60_000,
    });
    // HU-23: antes de interactuar, el estudiante lee las instrucciones del caso. Es un modal:
    // mientras está abierto, el resto de la página queda fuera del árbol de accesibilidad.
    const instrucciones = page.getByRole('dialog', { name: /Duelo y pérdida/ });
    await expect(instrucciones).toBeVisible();
    await expect(instrucciones).toContainText('Empatía y validación emocional');
    await expect(instrucciones).toContainText('cuatro meses después de la muerte repentina');
    await expect(instrucciones).toContainText('Marta Lucía');
    await expect(instrucciones).toContainText(ESTUDIANTE.nombre);
    await expect(instrucciones).toContainText(ESTUDIANTE.codigo);
    await expect(page.getByText('Sin iniciar')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Comenzar a explorar' })).toBeHidden();

    // La ficha del paciente incluye su perfil y las instrucciones no tienen "Revisar nuevamente".
    await expect(instrucciones).toContainText('Viuda desde hace cuatro meses');
    await expect(page.getByRole('button', { name: 'Revisar nuevamente' })).toHaveCount(0);

    // Es obligatorio: Escape no lo cierra.
    await page.keyboard.press('Escape');
    await expect(instrucciones).toBeVisible();

    // El registro existe en Supabase con estado en_curso, el prompt copiado y sin comenzar.
    const admin = clienteAdmin();
    const leerSesion = async () => {
      const { data } = await admin!
        .from('sesion')
        .select(
          'estado, comenzada, inicio, codigo_estudiante, nombre_estudiante, prompt_sistema, fin'
        )
        .eq('id', sesionId)
        .single();
      return data;
    };
    const creada = admin ? await leerSesion() : null;
    if (admin) {
      expect(creada).toMatchObject({
        estado: 'en_curso',
        comenzada: false,
        codigo_estudiante: ESTUDIANTE.codigo,
        nombre_estudiante: ESTUDIANTE.nombre,
        fin: null,
      });
      expect(creada?.prompt_sistema).toContain('Eres Marta Lucía');
    }

    // Al confirmar, la simulación comienza: el tiempo corre desde ahora (hora del servidor).
    await page.getByRole('button', { name: 'Entendido · Iniciar simulación' }).click();
    await expect(instrucciones).toBeHidden();
    await expect(page.getByRole('img', { name: 'Escena 3D de la simulación' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Comenzar a explorar' })).toBeVisible();
    await expect(hud).toContainText('E-01');
    await expect(hud).toContainText('Duelo y pérdida');
    await expect(hud).toContainText('Marta Lucía');
    await expect(hud).toContainText(ESTUDIANTE.nombre);
    await expect(hud).not.toContainText('Sin iniciar');
    if (admin) {
      const comenzada = await leerSesion();
      expect(comenzada?.comenzada).toBe(true);
      expect(new Date(comenzada!.inicio).getTime()).toBeGreaterThan(
        new Date(creada!.inicio).getTime()
      );
    }

    // Recargar conserva la sesión (se hidrata desde el servidor) y no repite las instrucciones.
    await page.reload();
    await expect(hud).toContainText(ESTUDIANTE.nombre);
    await expect(page.getByTestId('pantalla-carga')).toHaveAttribute('data-visible', 'false', {
      timeout: 60_000,
    });
    await expect(page.getByRole('button', { name: 'Comenzar a explorar' })).toBeVisible();
    await expect(instrucciones).toBeHidden();

    // /simulacion sin parámetro retoma la última sesión en curso. Otros archivos de tests corren
    // en paralelo con el mismo estudiante y pueden haber creado una más reciente: se compara con
    // la última en curso según la base de datos, no necesariamente la de este test.
    await page.goto('/simulacion');
    await expect(page).toHaveURL(/\/simulacion\?sesion=[0-9a-f-]{36}$/);
    if (admin) {
      const retomada = new URL(page.url()).searchParams.get('sesion');
      const { data } = await admin.from('sesion').select('estado').eq('id', retomada!).single();
      expect(data?.estado).toBe('en_curso');
    } else {
      await expect(page).toHaveURL(`/simulacion?sesion=${sesionId}`);
    }
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
    // Con buen FPS el primer tramo ya llega a la mesa: no avanza más, pero tampoco retrocede.
    expect(bloqueado[2]).toBeLessThanOrEqual(tras1[2]);

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
    await page.getByRole('link', { name: 'Ir a mis prácticas' }).click();
    await expect(page).toHaveURL(/\/practicas$/);
  });
});
