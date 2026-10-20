import { expect, test } from '@playwright/test';

import { clienteAdmin, crearSesionEstudiante, limpiarCodigos } from './flujos';
import {
  hayCredencialesEstudiante,
  iniciarSesionComoDocente,
  MOTIVO_SIN_ESTUDIANTE,
} from './helpers';

/**
 * Revisiones a escala: búsqueda y filtros en la URL, vistas por estudiante y matriz estudiantes ×
 * casos, y exportación a CSV con los mismos filtros.
 */

const PREFIJO_CODIGOS = 'rev';

/** Práctica terminada (con una intervención) que queda por revisar. */
async function crearPracticaTerminada(): Promise<string> {
  const cliente = clienteAdmin()!;
  const sesionId = await crearSesionEstudiante(PREFIJO_CODIGOS);
  await cliente.from('mensaje').insert([
    { sesion_id: sesionId, remitente: 'estudiante', contenido: 'Buenas tardes, ¿cómo está?' },
    { sesion_id: sesionId, remitente: 'npc', contenido: 'Pues… no muy bien.' },
  ]);
  await cliente.from('sesion').update({ estado: 'finalizada' }).eq('id', sesionId);
  return sesionId;
}

test.describe('revisiones del docente', () => {
  test.skip(!hayCredencialesEstudiante, MOTIVO_SIN_ESTUDIANTE);
  test.describe.configure({ mode: 'serial' });

  const limpiar = () => limpiarCodigos(PREFIJO_CODIGOS);
  test.beforeAll(limpiar);
  test.afterAll(limpiar);

  test('busca, agrupa, muestra la matriz y exporta lo filtrado', async ({ page }) => {
    const sesionId = await crearPracticaTerminada();
    const { data: sesion } = await clienteAdmin()!
      .from('sesion')
      .select('nombre_estudiante, codigo_estudiante')
      .eq('id', sesionId)
      .single();

    await iniciarSesionComoDocente(page);
    // El estudiante de prueba acumula prácticas: las más recientes primero para ver la nueva.
    await page.goto('/sesiones?orden=recientes');
    await expect(page.getByRole('heading', { name: 'Revisiones', level: 1 })).toBeVisible();

    // La búsqueda vive en la URL y filtra la lista.
    await page.getByLabel('Buscar por estudiante o caso').fill(sesion!.codigo_estudiante);
    await expect(page).toHaveURL(new RegExp(`q=${sesion!.codigo_estudiante}`));
    // El estudiante de prueba acumula otras prácticas: se ubica la fila por su enlace.
    const fila = page.locator(`li:has(> a[href="/sesiones/${sesionId}"])`);
    await expect(fila).toBeVisible();
    await expect(fila).toContainText(sesion!.nombre_estudiante);
    await expect(fila).toContainText('1 intervención');

    // Agrupada por estudiante: el grupo con lo pendiente aparece abierto.
    await page.getByLabel('Ver').selectOption('estudiante');
    await expect(page).toHaveURL(/agrupar=estudiante/);
    await expect(page.getByText(/por revisar/).first()).toBeVisible();

    // Matriz estudiantes × casos.
    await page.getByLabel('Ver').selectOption('matriz');
    const matriz = page.getByRole('region', { name: 'Estudiantes × casos' });
    await expect(
      matriz.getByRole('rowheader', { name: new RegExp(sesion!.nombre_estudiante) })
    ).toBeVisible();
    await expect(matriz.getByRole('link', { name: /Por revisar/ }).first()).toBeVisible();

    // El CSV exporta lo mismo que se ve.
    const descarga = page.waitForEvent('download');
    await page.getByRole('link', { name: 'Exportar CSV' }).click();
    const archivo = await descarga;
    expect(archivo.suggestedFilename()).toMatch(/^practicas-pendientes-\d{4}-\d{2}-\d{2}\.csv$/);
    const ruta = await archivo.path();
    const { readFile } = await import('node:fs/promises');
    const contenido = await readFile(ruta, 'utf8');
    expect(contenido).toContain('Estudiante,Código estudiante,Caso');
    expect(contenido).toContain(sesion!.codigo_estudiante);

    // Quitar filtros vuelve a la vista completa.
    await page.getByRole('button', { name: 'Quitar filtros' }).click();
    await expect(page).not.toHaveURL(/q=/);
  });
});
