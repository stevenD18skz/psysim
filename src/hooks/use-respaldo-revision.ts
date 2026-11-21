'use client';

import { useRef, useState, useSyncExternalStore } from 'react';
import { type ZodType } from 'zod';

const sinSuscripcion = () => () => {};

function leer(clave: string) {
  try {
    return window.sessionStorage.getItem(clave);
  } catch {
    return null;
  }
}

/** Respaldo inmediato en la pestaña. La entrega del equipo limpia el prefijo de revisión. */
export function useRespaldoRevision<T>(clave: string, esquema: ZodType<T>) {
  const guardado = useSyncExternalStore(
    sinSuscripcion,
    () => leer(clave),
    () => null
  );
  const ultimo = useRef<{ valor: T | null } | null>(null);
  const [editado, setEditado] = useState<{ valor: T | null } | null>(null);

  function interpretar(texto: string | null): T | null {
    try {
      return texto === null ? null : (esquema.safeParse(JSON.parse(texto)).data ?? null);
    } catch {
      return null;
    }
  }

  function actualizar(cambiar: (anterior: T | null) => T | null) {
    const valor = cambiar(ultimo.current ? ultimo.current.valor : interpretar(leer(clave)));
    ultimo.current = { valor };
    setEditado(ultimo.current);
    try {
      if (valor === null) window.sessionStorage.removeItem(clave);
      else window.sessionStorage.setItem(clave, JSON.stringify(valor));
    } catch {
      // La edición sigue en el formulario si la pestaña impide acceder al almacenamiento.
    }
  }

  return { borrador: editado ? editado.valor : interpretar(guardado), actualizar };
}
