import 'server-only';

import { after } from 'next/server';

import { getProveedorIa, hayOrquestador } from '@/lib/env/orquestador';

import { cerrarEnOrquestador, cerrarPendientes } from './practica';
import { sincronizarCasoGuardado } from './sincronizar';

/*
 * Trabajo con el orquestador que no debe frenar la respuesta al usuario: se agenda con `after` y
 * corre cuando la respuesta ya salió. Ninguna de estas tareas lanza (registran el fallo y el
 * barrido lo reintenta después).
 */

/**
 * El docente acaba de crear o editar un caso: se deja al día su perfil y su escenario del
 * orquestador. Si no se logra, se sincroniza cuando empiece su primera práctica.
 */
export function sincronizarCasoDespues(escenarioId: string): void {
  if (getProveedorIa() !== 'orquestador') return;
  after(async () => {
    await sincronizarCasoGuardado(escenarioId);
  });
}

/** La práctica acaba de terminar en PsySim: reporta su duración y cierra su sesión allá. */
export function cerrarDespues(sesionId: string): void {
  if (!hayOrquestador()) return;
  after(async () => {
    await cerrarEnOrquestador(sesionId);
  });
}

/**
 * Cierra allá las sesiones de prácticas que PsySim terminó por otro camino (el barrido de
 * inactividad de la base de datos, una pestaña cerrada antes de avisar).
 */
export function barrerDespues(): void {
  if (!hayOrquestador()) return;
  after(async () => {
    await cerrarPendientes();
  });
}
