'use client';

import { useSyncExternalStore } from 'react';

import { COOKIE_EQUIPO_COMPARTIDO } from '@/lib/equipo-compartido/entrega';

const sinSuscripcion = () => () => {};

function leer(): boolean {
  return document.cookie.split('; ').includes(`${COOKIE_EQUIPO_COMPARTIDO}=1`);
}

/**
 * ¿El docente entregó este computador al estudiante (modo presencial)? Entonces la práctica
 * termina cerrando la sesión del estudiante. En el servidor se asume que no: la marca se lee al
 * hidratar.
 */
export function useEquipoCompartido(): boolean {
  return useSyncExternalStore(sinSuscripcion, leer, () => false);
}
