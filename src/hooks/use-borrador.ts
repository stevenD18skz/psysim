'use client';

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react';

/** Espera tras la última edición antes de guardar el borrador (no escribe en cada tecla). */
export const ESPERA_BORRADOR_MS = 800;

export interface Borrador<T> {
  valores: T;
  /** Momento (ISO 8601) en que se guardó. */
  guardadoEn: string;
}

function leerTexto(clave: string): string | null {
  try {
    return localStorage.getItem(clave);
  } catch {
    return null;
  }
}

function interpretar<T>(texto: string | null): Borrador<T> | null {
  if (!texto) return null;
  try {
    const borrador = JSON.parse(texto) as Partial<Borrador<T>>;
    return borrador.valores !== undefined && typeof borrador.guardadoEn === 'string'
      ? (borrador as Borrador<T>)
      : null;
  } catch {
    return null;
  }
}

const sinSuscripcion = () => () => {};

function escribir<T>(clave: string, borrador: Borrador<T>) {
  try {
    localStorage.setItem(clave, JSON.stringify(borrador));
  } catch {
    // Sin almacenamiento (modo privado, cuota llena): la advertencia al salir sigue protegiendo.
  }
}

function borrar(clave: string) {
  try {
    localStorage.removeItem(clave);
  } catch {
    // Nada que borrar.
  }
}

interface OpcionesBorrador<T> {
  /** Identifica el formulario (y el caso que se edita) en el almacenamiento del navegador. */
  clave: string;
  /** Valores actuales del formulario. */
  valores: T;
  /** `true` si el estudiante ya cambió algo respecto a lo guardado en el servidor. */
  sucio: boolean;
}

/**
 * Protege el trabajo de un formulario largo (WCAG 3.3.4, heurística 5 de Nielsen: no perder lo
 * escrito). Mientras hay cambios sin guardar:
 * - guarda un borrador en el navegador (con espera, no en cada tecla);
 * - pide confirmación si se cierra o recarga la pestaña.
 *
 * Al volver, `borrador` trae lo que había, para ofrecer restaurarlo o descartarlo. Tras guardar de
 * verdad, `limpiar` borra el borrador y quita la advertencia.
 */
export function useBorrador<T>({ clave, valores, sucio }: OpcionesBorrador<T>) {
  const [terminado, setTerminado] = useState(false);
  const [descartado, setDescartado] = useState(false);

  // Se lee del navegador sin desajustar la hidratación: en el servidor no hay borrador.
  const guardado = useSyncExternalStore(
    sinSuscripcion,
    () => leerTexto(clave),
    () => null
  );
  // Se fija lo que había al llegar: lo que el estudiante escriba después no cambia la oferta.
  const [inicial, setInicial] = useState<string | null>(null);
  const [visto, setVisto] = useState(false);
  if (!visto && (sucio || guardado !== null)) {
    setVisto(true);
    if (!sucio) setInicial(guardado);
  }
  const borrador = useMemo(
    () => (descartado ? null : interpretar<T>(inicial)),
    [descartado, inicial]
  );

  useEffect(() => {
    if (!sucio || terminado) return;
    const temporizador = setTimeout(
      () => escribir(clave, { valores, guardadoEn: new Date().toISOString() }),
      ESPERA_BORRADOR_MS
    );
    return () => clearTimeout(temporizador);
  }, [clave, valores, sucio, terminado]);

  useEffect(() => {
    if (!sucio || terminado) return;
    const advertir = (evento: BeforeUnloadEvent) => {
      evento.preventDefault();
      // Los navegadores antiguos exigen asignar un valor.
      evento.returnValue = '';
    };
    window.addEventListener('beforeunload', advertir);
    return () => window.removeEventListener('beforeunload', advertir);
  }, [sucio, terminado]);

  /** Descarta el borrador guardado (el formulario sigue como está). */
  const descartar = useCallback(() => {
    borrar(clave);
    setDescartado(true);
  }, [clave]);

  /** Se guardó de verdad: ya no hay nada que proteger. */
  const limpiar = useCallback(() => {
    borrar(clave);
    setDescartado(true);
    setTerminado(true);
  }, [clave]);

  return { borrador, descartar, limpiar };
}
