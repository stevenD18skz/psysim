import { expect, test } from '@playwright/test';

import {
  abrirConversacion,
  clienteAdmin,
  comenzarSimulacion,
  conversar,
  finalizarDesdeHud,
  limpiarPorCodigo,
  MOTIVO_SPRINT_4,
  prepararSesion,
  SPRINT_4_LISTO,
  TARJETAS_RESULTADOS,
} from './flujos';
import { hayCredenciales, iniciarSesionComoDocente } from './helpers';

/**
 * HU-27 · T01 (Sprint 6) — El test más importante: una sesión completa desde la interfaz, con la
 * IA real. Hoy recorre login → configuración → instrucciones → escena 3D → conversación; cuando
 * exista el Sprint 4 continúa solo con finalizar → resultados (ver `SPRINT_4_LISTO`).
 */

/** Código reservado de este archivo: identifica sus datos para limpiarlos. */
const CODIGO_PRUEBAS = '2099100';
const ESTUDIANTE = { codigo: `${CODIGO_PRUEBAS}01`, nombre: 'Estudiante Flujo Completo' };

test.describe('flujo completo de una simulación (HU-27 · T01)', () => {
  test.skip(!hayCredenciales, 'Define E2E_DOCENTE_CORREO y E2E_DOCENTE_CONTRASENA');

  test.beforeAll(() => limpiarPorCodigo(CODIGO_PRUEBAS));
  test.afterAll(() => limpiarPorCodigo(CODIGO_PRUEBAS));

  test('login, configuración, instrucciones, escena 3D, conversación y resultados', async ({
    page,
  }) => {
    test.slow(); // Escena 3D por software (SwiftShader) e IA real.

    // 1. Login y configuración del escenario E-01 con un estudiante de prueba.
    await iniciarSesionComoDocente(page);
    const sesionId = await prepararSesion(page, { escenario: 'E-01', estudiante: ESTUDIANTE });

    // 2. Instrucciones del caso (HU-23) y escena 3D cargada.
    await comenzarSimulacion(page, /Duelo y pérdida/);
    const hud = page.getByRole('complementary', { name: 'Datos de la sesión' });
    await expect(hud).toContainText(ESTUDIANTE.nombre);
    await expect(hud).not.toContainText('Sin iniciar');

    // 3. Conversación con el paciente (IA real).
    const panel = await abrirConversacion(page, 'Marta', 'Marta Lucía');
    const respuesta = await conversar(
      panel,
      'Marta Lucía',
      'Buenas tardes, Marta. Soy estudiante de psicología. ¿Cómo se ha sentido esta semana?'
    );
    expect(respuesta.length).toBeGreaterThan(0);
    // La etiqueta de emoción de la IA nunca llega al estudiante.
    expect(respuesta).not.toMatch(/^\[\p{L}+\]/u);

    // El intercambio y el estudiante quedan registrados en Supabase.
    const admin = clienteAdmin();
    if (admin) {
      const { data: mensajes } = await admin
        .from('mensaje')
        .select('remitente')
        .eq('sesion_id', sesionId);
      expect(mensajes?.map(m => m.remitente).sort()).toEqual(['estudiante', 'npc']);
      const { data: sesion } = await admin
        .from('sesion')
        .select('estudiante ( codigo, nombre )')
        .eq('id', sesionId)
        .single();
      expect(sesion?.estudiante).toMatchObject(ESTUDIANTE);
    }

    // 4. Sprint 4: finalizar desde el HUD y revisar los resultados.
    if (!SPRINT_4_LISTO) {
      test.info().annotations.push({ type: 'pendiente', description: MOTIVO_SPRINT_4 });
      return;
    }
    await panel.getByRole('button', { name: 'Volver a explorar' }).click();
    await finalizarDesdeHud(page, sesionId);

    const intervenciones = page.getByRole('region', { name: TARJETAS_RESULTADOS[0] });
    await expect(intervenciones).toBeVisible();
    // Al menos un indicador con un valor distinto de cero: una intervención del estudiante.
    await expect(intervenciones).toContainText(/[1-9]/);
    if (admin) {
      const { data } = await admin.from('sesion').select('estado').eq('id', sesionId).single();
      expect(data?.estado).not.toBe('en_curso');
    }
  });
});
