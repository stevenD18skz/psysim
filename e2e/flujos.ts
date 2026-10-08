import { createClient } from '@supabase/supabase-js';
import { expect, type Locator, type Page } from '@playwright/test';

import { existe } from '../test/pendiente';

import { docente, estudiante } from './helpers';

/**
 * Pasos reutilizables de los flujos E2E (Sprint 6, HU-27). El Canvas 3D es un bloque de píxeles
 * para Playwright: cada paso se verifica con el DOM que lo rodea (pantalla de carga, modales,
 * HUD, panel de conversación).
 */

/**
 * Sprint 4 (HUD con "Finalizar sesión", cierre con métricas y /resultados). Los tests que lo
 * necesitan se omiten hasta que exista la página de resultados y se activan solos después.
 */
export const SPRINT_4_LISTO = existe(
  'src/app/(protected)/resultados/page.tsx',
  'src/app/(protected)/(panel)/resultados/page.tsx'
);
export const MOTIVO_SPRINT_4 = 'Pendiente del Sprint 4 (HU-17 a HU-21): finalizar y /resultados';

/** Cliente con la clave secreta para preparar y limpiar datos (o `null` si no está definida). */
export function clienteAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const clave = process.env.SUPABASE_SECRET_KEY;
  return url && clave ? createClient(url, clave, { auth: { persistSession: false } }) : null;
}

/** Cliente con la clave secreta; falla si no está definida (los tests que lo usan lo exigen). */
function admin() {
  const cliente = clienteAdmin();
  if (!cliente) throw new Error('Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SECRET_KEY.');
  return cliente;
}

const LETRAS = 'abcdefghijklmnopqrstuvwxyz';
const letras = (n: number) =>
  Array.from({ length: n }, () => LETRAS[Math.floor(Math.random() * LETRAS.length)]).join('');

/**
 * Código de acceso de prueba. Las tres primeras letras son el prefijo reservado de cada archivo de
 * tests: así cada uno limpia solo sus datos aunque corran en paralelo.
 */
export function codigoDePrueba(prefijo: string) {
  return `${prefijo}-${letras(4)}-${letras(3)}`;
}

interface Registro {
  docenteId: string;
  estudianteId: string;
}

/**
 * Registro del estudiante de prueba por el docente de prueba (como si el docente lo hubiera
 * registrado desde Estudiantes). Es idempotente: el trigger lo enlaza a la cuenta por el correo.
 */
export async function registrarEstudiantePrueba(cuenta = estudiante): Promise<Registro> {
  const cliente = admin();
  const [{ data: profesor }, { data: alumno }] = await Promise.all([
    cliente.from('usuario').select('id').eq('correo', docente.correo.toLowerCase()).single(),
    cliente
      .from('usuario')
      .select('nombre, codigo_institucional')
      .eq('correo', cuenta.correo.toLowerCase())
      .single(),
  ]);
  if (!profesor || !alumno) throw new Error('Faltan las cuentas de prueba: ejecuta pnpm db:seed.');

  const { data, error } = await cliente
    .from('estudiante')
    .upsert(
      {
        docente_id: profesor.id,
        codigo: alumno.codigo_institucional,
        nombre: alumno.nombre,
        correo: cuenta.correo.toLowerCase(),
      },
      { onConflict: 'docente_id,codigo' }
    )
    .select('id')
    .single();
  if (error) throw error;
  return { docenteId: profesor.id, estudianteId: data.id };
}

interface OpcionesCodigo {
  escenario?: string;
  /** Prompt de la sesión; por defecto, el del paciente del escenario. */
  prompt?: string;
  cuenta?: typeof estudiante;
}

/** El docente de prueba asigna un caso al estudiante de prueba: devuelve el código de acceso. */
export async function crearCodigoAcceso(
  prefijo: string,
  { escenario = 'E-01', prompt, cuenta }: OpcionesCodigo = {}
): Promise<string> {
  const cliente = admin();
  const { docenteId, estudianteId } = await registrarEstudiantePrueba(cuenta);
  const { data: caso } = await cliente
    .from('escenario')
    .select('id, npc ( prompt_sistema )')
    .eq('codigo', escenario)
    .single();
  // Sin los tipos de la base de datos, PostgREST tipa el NPC (1:1) como lista.
  const npc = (caso?.npc ?? null) as unknown as { prompt_sistema: string } | null;
  if (!caso || !npc) throw new Error(`No existe el escenario ${escenario}.`);

  const codigo = codigoDePrueba(prefijo);
  const { error } = await cliente.from('asignacion').insert({
    docente_id: docenteId,
    estudiante_id: estudianteId,
    escenario_id: caso.id,
    prompt_sistema: prompt ?? npc.prompt_sistema,
    codigo,
    expira_en: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  });
  if (error) throw error;
  return codigo;
}

/**
 * Sesión en curso del estudiante de prueba creada directamente en la base de datos (sin pasar por
 * la interfaz), enlazada a un código de prueba para poder limpiarla.
 */
export async function crearSesionEstudiante(
  prefijo: string,
  { comenzada = true, ...opciones }: OpcionesCodigo & { comenzada?: boolean } = {}
): Promise<string> {
  const cliente = admin();
  const codigo = await crearCodigoAcceso(prefijo, opciones);
  const { data: asignacion } = await cliente
    .from('asignacion')
    .select('id, docente_id, escenario_id, prompt_sistema, estudiante ( id, codigo, nombre )')
    .eq('codigo', codigo)
    .single();
  const alumno = asignacion!.estudiante as unknown as {
    id: string;
    codigo: string;
    nombre: string;
  };

  const { data: sesion, error } = await cliente
    .from('sesion')
    .insert({
      usuario_id: asignacion!.docente_id,
      escenario_id: asignacion!.escenario_id,
      estudiante_id: alumno.id,
      codigo_estudiante: alumno.codigo,
      nombre_estudiante: alumno.nombre,
      prompt_sistema: asignacion!.prompt_sistema,
      comenzada,
    })
    .select('id')
    .single();
  if (error) throw error;
  await cliente.from('asignacion').update({ sesion_id: sesion.id }).eq('id', asignacion!.id);
  return sesion.id;
}

/**
 * Borra los códigos indicados (o los que empiezan por el prefijo de 3 letras) y sus sesiones, con
 * los mensajes y la retroalimentación en cascada.
 */
export async function limpiarCodigos(prefijoOCodigos: string | string[]) {
  const cliente = clienteAdmin();
  if (!cliente) return;
  const consulta = cliente.from('asignacion').select('id, sesion_id');
  const { data } = await (typeof prefijoOCodigos === 'string'
    ? consulta.like('codigo', `${prefijoOCodigos}-%`)
    : consulta.in('codigo', prefijoOCodigos));
  const sesiones = (data ?? []).flatMap(a => (a.sesion_id ? [a.sesion_id] : []));
  if (sesiones.length) await cliente.from('sesion').delete().in('id', sesiones);
  if (data?.length) {
    await cliente
      .from('asignacion')
      .delete()
      .in(
        'id',
        data.map(a => a.id)
      );
  }
}

/**
 * El estudiante (con la sesión ya iniciada) escribe el código en «Mis prácticas» y entra a la
 * simulación. Devuelve el id de la sesión (de la URL de /simulacion).
 */
export async function canjearCodigoEnPracticas(page: Page, codigo: string): Promise<string> {
  // SwiftShader renderiza por software: un viewport pequeño mantiene un FPS útil.
  await page.setViewportSize({ width: 800, height: 600 });
  await page.goto('/practicas');
  await page.getByLabel('Código de acceso').fill(codigo);
  await page.getByRole('button', { name: 'Entrar a la simulación' }).click();

  await expect(page).toHaveURL(/\/simulacion\?sesion=[0-9a-f-]{36}$/);
  return new URL(page.url()).searchParams.get('sesion')!;
}

/**
 * Atajo de los tests de la simulación: el docente de prueba asigna el caso (en la base de datos) y
 * el estudiante, ya con la sesión iniciada, canjea el código desde la interfaz.
 */
export async function prepararSesion(
  page: Page,
  prefijo: string,
  opciones: OpcionesCodigo = {}
): Promise<string> {
  const codigo = await crearCodigoAcceso(prefijo, opciones);
  return canjearCodigoEnPracticas(page, codigo);
}

/** Espera a que cargue la escena, confirma las instrucciones del caso (HU-23) y la inicia. */
export async function comenzarSimulacion(page: Page, tituloCaso: RegExp) {
  await expect(page.getByTestId('pantalla-carga')).toHaveAttribute('data-visible', 'false', {
    timeout: 60_000,
  });
  const instrucciones = page.getByRole('dialog', { name: tituloCaso });
  await expect(instrucciones).toBeVisible();
  await page.getByRole('button', { name: 'Entendido · Iniciar simulación' }).click();
  await expect(instrucciones).toBeHidden();
  await expect(page.getByRole('img', { name: 'Escena 3D de la simulación' })).toBeVisible();
}

/**
 * Camina hacia el paciente (W) hasta que la interfaz ofrece conversar y abre el panel.
 * `nombreCorto` es el del botón ("Marta"); `nombreCompleto`, el del panel ("Marta Lucía").
 */
export async function abrirConversacion(
  page: Page,
  nombreCorto: string,
  nombreCompleto: string
): Promise<Locator> {
  const conversar = page.getByRole('button', { name: `Conversar con ${nombreCorto}` });
  for (let intento = 0; intento < 20 && !(await conversar.isVisible()); intento++) {
    await page.keyboard.down('KeyW');
    await page.waitForTimeout(400);
    await page.keyboard.up('KeyW');
  }
  await expect(conversar).toBeVisible();
  await conversar.click();

  const panel = page.getByRole('region', { name: `Conversación con ${nombreCompleto}` });
  await expect(panel).toBeVisible();
  await expect(panel.getByTestId('estado-npc')).toHaveText('Escuchando');
  return panel;
}

/** Envía una intervención y espera a que el paciente termine de responder. */
export async function conversar(panel: Locator, nombreCompleto: string, texto: string) {
  const respuestas = panel.locator('[data-remitente="npc"]');
  const antes = await respuestas.count();
  const campo = panel.getByLabel(`Tu intervención para ${nombreCompleto}`);
  await campo.fill(texto);
  await campo.press('Enter');

  await expect(respuestas).toHaveCount(antes + 1, { timeout: 40_000 });
  await expect(panel.getByTestId('estado-npc')).toHaveText('Escuchando', { timeout: 15_000 });
  return (await respuestas.last().textContent())?.trim() ?? '';
}

/**
 * Sprint 4 (HU-17 · T03, HU-20): finaliza desde el HUD con su modal de confirmación y espera la
 * pantalla de resultados.
 */
export async function finalizarDesdeHud(page: Page, sesionId: string) {
  await page.getByRole('button', { name: 'Finalizar sesión' }).click();
  const confirmacion = page.getByRole('alertdialog');
  await expect(confirmacion).toContainText('no podrá reanudarse');
  await confirmacion.getByRole('button', { name: 'Confirmar finalización' }).click();
  await expect(page).toHaveURL(new RegExp(`/resultados\\?sesion=${sesionId}`), {
    timeout: 30_000,
  });
}

/** Tarjetas de indicadores de la pantalla de resultados (HU-21 · T02). */
export const TARJETAS_RESULTADOS = [
  'Total de intervenciones',
  'Latencia promedio',
  'Latencia máxima',
  'Duración de la sesión',
] as const;
