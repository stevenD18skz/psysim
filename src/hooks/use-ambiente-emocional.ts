'use client';

import { useSyncExternalStore } from 'react';

/**
 * Preferencia del estudiante sobre el «Ambiente emocional» (la luz, el velo y el sonido que cambian
 * con el ánimo del paciente). Activado por defecto; se recuerda en este navegador.
 */
const CLAVE = 'psysim:ambiente-emocional';
const EVENTO = 'psysim:ambiente-emocional';

/** Respaldo en memoria: con el almacenamiento bloqueado, el interruptor sigue funcionando en esta visita. */
let enMemoria: boolean | null = null;

function leer(): boolean {
  if (enMemoria !== null) return enMemoria;
  try {
    return localStorage.getItem(CLAVE) !== 'off';
  } catch {
    return true;
  }
}

function suscribir(alCambiar: () => void) {
  // Un cambio desde otra pestaña manda sobre el respaldo en memoria de esta.
  const desdeOtraPestana = () => {
    enMemoria = null;
    alCambiar();
  };
  window.addEventListener(EVENTO, alCambiar);
  window.addEventListener('storage', desdeOtraPestana);
  return () => {
    window.removeEventListener(EVENTO, alCambiar);
    window.removeEventListener('storage', desdeOtraPestana);
  };
}

export function fijarAmbienteEmocional(activado: boolean) {
  enMemoria = activado;
  try {
    localStorage.setItem(CLAVE, activado ? 'on' : 'off');
  } catch {
    // Sin almacenamiento: la preferencia dura solo esta visita.
  }
  window.dispatchEvent(new Event(EVENTO));
}

export function useAmbienteEmocional(): boolean {
  return useSyncExternalStore(suscribir, leer, () => true);
}
