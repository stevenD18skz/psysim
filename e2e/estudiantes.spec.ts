import { expect, test } from '@playwright/test';

import {
  clienteAdmin,
  crearCodigoAcceso,
  limpiarCodigos,
  registrarEstudiantePrueba,
} from './flujos';
import {
  estudiante,
  estudiante2,
  hayCredencialesEstudiante,
  iniciarSesionComoDocente,
  iniciarSesionComoEstudiante,
  MOTIVO_SIN_ESTUDIANTE,
} from './helpers';

/**
 * Gestión de estudiantes: el docente los registra con su correo institucional (se les crea la
 * cuenta para entrar con Google), ve su ficha con los códigos de acceso y puede anularlos; el
 * estudiante solo puede canjear sus propios códigos vigentes.
 */

const PREFIJO_CODIGOS = 'est';
/** Estudiante registrado desde la interfaz (correo inventado del dominio institucional). */
const sufijo = Date.now().toString().slice(-6);
const NUEVO = {
  codigo: `2099${sufijo}`,
  nombre: 'Estudiante Registro Prueba',
  correo: `psysim.e2e.${sufijo}@correounivalle.edu.co`,
};

/** Borra al estudiante registrado desde la interfaz: su registro, su perfil y su cuenta de Auth. */
async function borrarRegistrado() {
  const admin = clienteAdmin();
  if (!admin) return;
  await admin.from('estudiante').delete().eq('correo', NUEVO.correo);
  const { data } = await admin
    .from('usuario')
    .select('id')
    .eq('correo', NUEVO.correo)
    .maybeSingle();
  if (data) {
    await admin.from('usuario').delete().eq('id', data.id);
    await admin.auth.admin.deleteUser(data.id);
  }
}

test.describe('gestión de estudiantes', () => {
  test.skip(!hayCredencialesEstudiante, MOTIVO_SIN_ESTUDIANTE);
  test.describe.configure({ mode: 'serial' });

  test.beforeAll(async () => {
    await limpiarCodigos(PREFIJO_CODIGOS);
    await registrarEstudiantePrueba();
  });
  test.afterAll(async () => {
    await limpiarCodigos(PREFIJO_CODIGOS);
    await borrarRegistrado();
  });

  test('el docente registra a un estudiante y se le crea la cuenta', async ({ page }) => {
    await iniciarSesionComoDocente(page);
    await page.goto('/estudiantes');
    await page.getByRole('button', { name: 'Registrar estudiante' }).first().click();

    const dialogo = page.getByRole('dialog', { name: 'Registrar estudiante' });
    await dialogo.getByLabel('Código institucional').fill(NUEVO.codigo);
    await dialogo.getByLabel('Nombre completo').fill(NUEVO.nombre);
    // Un correo que no es institucional se rechaza en el formulario.
    await dialogo.getByLabel('Correo institucional').fill('alguien@gmail.com');
    await dialogo.getByRole('button', { name: 'Registrar' }).click();
    await expect(dialogo).toContainText('Usa el correo institucional (@correounivalle.edu.co).');

    await dialogo.getByLabel('Correo institucional').fill(NUEVO.correo.toUpperCase());
    await dialogo.getByRole('button', { name: 'Registrar' }).click();
    await expect(dialogo).toBeHidden();

    await page.getByLabel('Buscar estudiante').fill(NUEVO.codigo);
    const fila = page.getByRole('row', { name: new RegExp(NUEVO.nombre) });
    await expect(fila).toContainText(NUEVO.correo);
    // Con cuenta puede recibir códigos: la acción es "Asignar".
    await expect(fila.getByRole('link', { name: 'Asignar' })).toHaveAttribute(
      'href',
      `/configuracion?estudiante=${NUEVO.codigo}`
    );

    // La cuenta existe en Auth (sin contraseña) con perfil de estudiante, enlazada al registro.
    const admin = clienteAdmin();
    if (admin) {
      const { data: perfil } = await admin
        .from('usuario')
        .select('id, rol, codigo_institucional')
        .eq('correo', NUEVO.correo)
        .single();
      expect(perfil).toMatchObject({ rol: 'estudiante', codigo_institucional: NUEVO.codigo });
      const { data: registro } = await admin
        .from('estudiante')
        .select('usuario_id')
        .eq('correo', NUEVO.correo)
        .single();
      expect(registro?.usuario_id).toBe(perfil?.id);
    }
  });

  test('la ficha muestra los códigos de acceso y permite anular uno', async ({ page }) => {
    const codigo = await crearCodigoAcceso(PREFIJO_CODIGOS);
    const { estudianteId } = await registrarEstudiantePrueba();

    await iniciarSesionComoDocente(page);
    await page.goto(`/estudiantes/${estudianteId}`);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Estudiante de Prueba Uno');

    const fila = page
      .getByRole('region', { name: 'Códigos de acceso' })
      .getByRole('listitem')
      .filter({ hasText: codigo });
    await expect(fila).toContainText('Sin usar');
    await fila.getByRole('button', { name: 'Anular' }).click();
    await fila.getByRole('button', { name: 'Sí, anular' }).click();
    await expect(fila).toContainText('Anulado');

    // El estudiante ya no puede usarlo.
    const contexto = await page.context().browser()!.newContext();
    const alumno = await contexto.newPage();
    await iniciarSesionComoEstudiante(alumno);
    await alumno.getByLabel('Código de acceso').fill(codigo);
    await alumno.getByRole('button', { name: 'Entrar a la simulación' }).click();
    await expect(
      alumno.getByRole('form', { name: 'Unirse con código' }).getByRole('alert')
    ).toContainText('anuló ese código');
    await contexto.close();
  });

  test('un estudiante no puede usar el código de otro', async ({ page }) => {
    test.skip(!estudiante2.correo || !estudiante2.contrasena, 'Define E2E_ESTUDIANTE2_*');
    const codigo = await crearCodigoAcceso(PREFIJO_CODIGOS, { cuenta: estudiante });

    await iniciarSesionComoEstudiante(page, estudiante2);
    // El enlace directo lleva al formulario con el código cargado.
    await page.goto(`/unirse/${codigo}`);
    await expect(page.getByLabel('Código de acceso')).toHaveValue(codigo);
    await page.getByRole('button', { name: 'Entrar a la simulación' }).click();
    await expect(
      page.getByRole('form', { name: 'Unirse con código' }).getByRole('alert')
    ).toContainText('no es para tu cuenta');
    await expect(page).toHaveURL(new RegExp(`/unirse/${codigo}$`));
  });

  test('cada rol solo abre su panel', async ({ page }) => {
    await iniciarSesionComoEstudiante(page);
    await page.goto('/estudiantes');
    await expect(page).toHaveURL(/\/practicas$/);
    await page.goto('/configuracion');
    await expect(page).toHaveURL(/\/practicas$/);
  });
});
