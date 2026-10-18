import { expect, test } from '@playwright/test';

import {
  hayCredenciales,
  hayCredencialesAdmin,
  iniciarSesionComoAdmin,
  iniciarSesionComoDocente,
  MOTIVO_SIN_ADMIN,
} from './helpers';

/**
 * Laboratorio — visor de NPC en GLB con esqueleto y animaciones (/laboratorio/npc). Es una
 * herramienta de desarrollo: solo la abre el Administrador.
 */

test('el laboratorio exige sesión', async ({ page }) => {
  await page.goto('/laboratorio/npc');
  await expect(page).toHaveURL(/\/login\?siguiente=%2Flaboratorio%2Fnpc/);
});

test('un docente no abre el laboratorio', async ({ page }) => {
  test.skip(!hayCredenciales, 'Define E2E_DOCENTE_CORREO y E2E_DOCENTE_CONTRASENA');
  await iniciarSesionComoDocente(page);
  await page.goto('/laboratorio');
  await expect(page).toHaveURL(/\/inicio$/);
});

test.describe('NPC del laboratorio', () => {
  test.skip(!hayCredencialesAdmin, MOTIVO_SIN_ADMIN);

  test('se controla con el panel, el teclado y la API pública', async ({ page }) => {
    const errores: string[] = [];
    page.on('pageerror', error => errores.push(error.message));

    await iniciarSesionComoAdmin(page);
    await page.goto('/laboratorio');
    await page.getByRole('link', { name: /Personajes con esqueleto/ }).click();
    await expect(page.getByRole('img', { name: 'Vista 3D del NPC' })).toBeVisible();
    await expect(page.getByRole('radio', { name: 'Tomás' })).toBeChecked();
    await expect(page.getByRole('heading', { name: 'Tomás' })).toBeVisible();

    // Selector: cambiar de NPC actualiza la URL y carga su GLB.
    await page.getByRole('radio', { name: 'Rosa' }).click();
    await expect(page).toHaveURL(/\/laboratorio\/npc\?npc=rosa$/);
    await expect(page.getByRole('heading', { name: 'Rosa' })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole('button', { name: /Reposo/ })).toHaveAttribute(
      'aria-pressed',
      'true'
    );

    // API: play('wave') → al terminar, onActionEnd y vuelta a reposo.
    await page.getByLabel('Acción').selectOption('wave');
    await page.getByRole('button', { name: 'play()' }).click();
    await expect(page.getByRole('button', { name: /Saludar/ })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    await expect(page.getByRole('status').filter({ hasText: '¡Hola, viajero!' })).toBeVisible();
    await expect(page.getByText('onActionEnd: Saludar terminó')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole('button', { name: /Reposo/ })).toHaveAttribute(
      'aria-pressed',
      'true'
    );

    // API: say()
    await page.getByRole('button', { name: 'say()' }).click();
    await expect(
      page.getByRole('status').filter({ hasText: 'Buenas tardes, ¿cómo te puedo ayudar?' })
    ).toBeVisible();

    // Teclado: 6 = bailar, Espacio = pausa, S = esqueleto.
    await page.getByRole('img', { name: 'Vista 3D del NPC' }).click();
    await page.keyboard.press('6');
    await expect(page.getByRole('button', { name: /Bailar/ })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    await page.keyboard.press('Space');
    await expect(page.getByRole('button', { name: 'Reanudar' })).toBeVisible();
    await page.keyboard.press('s');
    await expect(page.getByRole('button', { name: /Esqueleto/ })).toHaveAttribute(
      'aria-pressed',
      'true'
    );

    // Pose manual: mover un deslizador detiene la animación.
    await page.getByLabel('Hueso').selectOption('upperArm_R');
    await page.getByLabel('Rot. Z').fill('-120');
    await expect(page.getByText('activa', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: /Bailar/ })).toHaveAttribute(
      'aria-pressed',
      'false'
    );

    expect(errores).toEqual([]);
  });

  test('la vista «Paciente sentado» muestra sus gestos a pedido', async ({ page }) => {
    const errores: string[] = [];
    page.on('pageerror', error => errores.push(error.message));

    await iniciarSesionComoAdmin(page);
    await page.goto('/laboratorio/npc?npc=rosa');
    await page.getByRole('radio', { name: 'Paciente sentado' }).click();
    await expect(page).toHaveURL(/\/laboratorio\/npc\?npc=rosa&vista=paciente$/);
    await expect(page.getByRole('img', { name: 'Vista 3D del paciente sentado' })).toBeVisible({
      timeout: 15_000,
    });
    // La barra de la API de clips solo aplica a la vista de pie.
    await expect(page.getByRole('button', { name: 'play()' })).toBeHidden();

    await page.getByLabel('Emoción').selectOption('molesto');
    await page.getByRole('radio', { name: '3' }).click();
    await page.getByRole('button', { name: 'Cruzar los brazos', exact: true }).click();
    await page.getByRole('button', { name: 'Decir la frase' }).click();
    await page.getByLabel('Movimiento reducido').check();
    await expect(page.getByRole('img', { name: 'Vista 3D del paciente sentado' })).toBeVisible();

    // De vuelta a la vista de clips, con el mismo personaje.
    await page.getByRole('radio', { name: 'De pie (clips)' }).click();
    await expect(page).toHaveURL(/\/laboratorio\/npc\?npc=rosa$/);
    await expect(page.getByRole('img', { name: 'Vista 3D del NPC' })).toBeVisible();
    expect(errores).toEqual([]);
  });

  test('abre el NPC indicado en la URL y usa el predeterminado si no existe', async ({ page }) => {
    await iniciarSesionComoAdmin(page);
    await page.goto('/laboratorio/npc?npc=lucia');
    await expect(page.getByRole('radio', { name: 'Lucía' })).toBeChecked();
    await expect(page.getByRole('heading', { name: 'Lucía' })).toBeVisible({ timeout: 15_000 });

    await page.goto('/laboratorio/npc?npc=nadie');
    await expect(page.getByRole('radio', { name: 'Tomás' })).toBeChecked();
    await expect(page.getByRole('heading', { name: 'Tomás' })).toBeVisible({ timeout: 15_000 });
  });
});
