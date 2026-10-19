import { expect, type Page, test } from '@playwright/test';

import { crearCodigoAcceso, limpiarCodigos, registrarEstudiantePrueba } from './flujos';
import {
  cookiesDeSesion,
  estudiante,
  hayCredencialesEstudiante,
  iniciarSesionComoDocente,
  MOTIVO_SIN_ESTUDIANTE,
} from './helpers';

/**
 * Modo presencial: el docente entrega su computador al estudiante. La sesión del docente se cierra
 * antes de la entrega, el estudiante entra con su cuenta y, al terminar, cierra la suya. En las
 * pruebas el estudiante entra con contraseña en lugar de Google.
 */

const PREFIJO_CODIGOS = 'pre';

/** El docente entrega el equipo desde la ficha del estudiante. */
async function entregarDesdeLaFicha(page: Page, codigo: string) {
  const { estudianteId } = await registrarEstudiantePrueba();
  await iniciarSesionComoDocente(page);
  await page.goto(`/estudiantes/${estudianteId}`);

  const codigos = page.getByRole('region', { name: 'Códigos de acceso' });
  const fila = codigos.getByRole('listitem').filter({ hasText: codigo });
  await fila.getByRole('button', { name: 'Practicar en este equipo' }).click();
  const confirmacion = page.getByRole('alertdialog', { name: /practica en este computador/ });
  await confirmacion.getByRole('button', { name: 'Cerrar mi sesión y entregar' }).click();
  await expect(page).toHaveURL(/\/entrega$/);
}

test.describe('modo presencial', () => {
  test.skip(!hayCredencialesEstudiante, MOTIVO_SIN_ESTUDIANTE);
  test.describe.configure({ mode: 'serial' });

  test.beforeAll(() => limpiarCodigos(PREFIJO_CODIGOS));
  test.afterAll(() => limpiarCodigos(PREFIJO_CODIGOS));

  test('el docente entrega su equipo y el estudiante practica en él', async ({ page }) => {
    const codigo = await crearCodigoAcceso(PREFIJO_CODIGOS, { escenario: 'E-06' });
    await entregarDesdeLaFicha(page, codigo);

    // La sesión del docente ya no existe: el estudiante no puede llegar a su panel.
    expect(await cookiesDeSesion(page.context())).toHaveLength(0);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Hola, Estudiante');
    await expect(page.getByText(`Equipo listo para ${'Estudiante de Prueba Uno'}`)).toBeVisible();
    await expect(page.getByText(codigo)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Continuar con Google' })).toBeVisible();

    // El estudiante entra (aquí con contraseña) y llega directo a su código.
    await page.goto(`/login?docente=1&siguiente=/unirse/${codigo}`);
    await page.getByLabel('Correo institucional').fill(estudiante.correo);
    await page.getByLabel('Contraseña', { exact: true }).fill(estudiante.contrasena);
    await page.getByRole('button', { name: 'Entrar', exact: true }).click();
    await expect(page).toHaveURL(url => url.pathname === `/unirse/${codigo}`);
    await expect(
      page.getByRole('heading', { name: 'Tu docente te asignó una práctica' })
    ).toBeVisible();

    // En el equipo compartido, cerrar sesión queda a la vista y lleva al último paso.
    await page.getByRole('button', { name: /Cerrar sesión/ }).click();
    await expect(page).toHaveURL(/\/entrega\/fin$/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'Cerraste tu sesión en PsySim'
    );
    await expect(page.getByRole('link', { name: 'Cerrar mi sesión de Google' })).toHaveAttribute(
      'href',
      'https://accounts.google.com/Logout'
    );
    expect(await cookiesDeSesion(page.context())).toHaveLength(0);
    const marcas = (await page.context().cookies()).filter(c => c.name.startsWith('psysim-'));
    expect(marcas).toHaveLength(0);
  });

  test('el docente puede cancelar la entrega y volver a entrar', async ({ page }) => {
    const codigo = await crearCodigoAcceso(PREFIJO_CODIGOS, { escenario: 'E-06' });
    await entregarDesdeLaFicha(page, codigo);

    await page.getByRole('button', { name: /Volver a entrar como docente/ }).click();
    await expect(page).toHaveURL(/\/login\?docente=1$/);

    // Sin entrega en curso, la pantalla de entrega ya no existe.
    await page.goto('/entrega');
    await expect(page).toHaveURL(/\/login$/);
  });
});
