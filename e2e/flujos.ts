import { createClient } from '@supabase/supabase-js';
import { expect, type Locator, type Page } from '@playwright/test';

import { existe } from '../test/pendiente';

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

/**
 * Borra las sesiones (con sus mensajes y métricas, en cascada) y los estudiantes cuyo código
 * empieza por `prefijo`. Cada archivo de tests usa un prefijo reservado propio para no borrar
 * los datos de otro que corre en paralelo.
 */
export async function limpiarPorCodigo(prefijo: string) {
  const admin = clienteAdmin();
  if (!admin) return;
  await admin.from('sesion').delete().like('codigo_estudiante', `${prefijo}%`);
  await admin.from('estudiante').delete().like('codigo', `${prefijo}%`);
}

export interface DatosEstudiante {
  codigo: string;
  nombre: string;
}

/**
 * En /configuracion: elige el escenario, escribe los datos del estudiante e inicia la sesión.
 * Devuelve el id de la sesión creada (de la URL de /simulacion).
 */
export async function prepararSesion(
  page: Page,
  { escenario = 'E-01', estudiante }: { escenario?: string; estudiante: DatosEstudiante }
): Promise<string> {
  // SwiftShader renderiza por software: un viewport pequeño mantiene un FPS útil.
  await page.setViewportSize({ width: 800, height: 600 });
  await page.goto('/configuracion');
  await page.getByTestId(`escenario-${escenario}`).click();
  await page.getByLabel('Código institucional').fill(estudiante.codigo);
  await page.getByLabel('Nombre completo').fill(estudiante.nombre);
  await page.getByRole('button', { name: 'Iniciar simulación' }).click();

  await expect(page).toHaveURL(/\/simulacion\?sesion=[0-9a-f-]{36}$/);
  return new URL(page.url()).searchParams.get('sesion')!;
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
