import { expect, test } from '@playwright/test';

import { hayCredenciales, iniciarSesionComoDocente } from './helpers';

/** Laboratorio — visor de NPC en GLB con esqueleto y animaciones (/laboratorio/npc). */

test('el laboratorio exige sesión de docente', async ({ page }) => {
  await page.goto('/laboratorio/npc');
  await expect(page).toHaveURL(/\/login\?siguiente=%2Flaboratorio%2Fnpc/);
});

test.describe('NPC del laboratorio', () => {
  test.skip(!hayCredenciales, 'Define E2E_DOCENTE_CORREO y E2E_DOCENTE_CONTRASENA');

  test('se controla con el panel, el teclado y la API pública', async ({ page }) => {
    const errores: string[] = [];
    page.on('pageerror', error => errores.push(error.message));

    await iniciarSesionComoDocente(page);
    await page.goto('/laboratorio');
    await page.getByRole('link', { name: /NPC con esqueleto/ }).click();
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

  test('abre el NPC indicado en la URL y usa el predeterminado si no existe', async ({ page }) => {
    await iniciarSesionComoDocente(page);
    await page.goto('/laboratorio/npc?npc=lucia');
    await expect(page.getByRole('radio', { name: 'Lucía' })).toBeChecked();
    await expect(page.getByRole('heading', { name: 'Lucía' })).toBeVisible({ timeout: 15_000 });

    await page.goto('/laboratorio/npc?npc=nadie');
    await expect(page.getByRole('radio', { name: 'Tomás' })).toBeChecked();
    await expect(page.getByRole('heading', { name: 'Tomás' })).toBeVisible({ timeout: 15_000 });
  });
});
