'use client';

import { useEffect, useEffectEvent, useState } from 'react';

import { registrarActividad } from '@/lib/escenarios/actions';
import { useAppStoreApi } from '@/store/app-store-provider';

/** Tiempo sin interacción tras el que la sesión se cierra (el mismo límite que la base de datos). */
export const LIMITE_INACTIVIDAD_MS = 10 * 60_000;
/** El aviso aparece un minuto antes del cierre. */
export const AVISO_INACTIVIDAD_MS = 9 * 60_000;
/** Como mucho, un latido a la base de datos cada 30 s (solo si hubo interacción). */
export const INTERVALO_LATIDO_MS = 30_000;
/** Si el cierre falla (p. ej. sin conexión), se reintenta pasado este tiempo. */
const REINTENTO_CIERRE_MS = 15_000;

const EVENTOS_INTERACCION = ['pointermove', 'pointerdown', 'keydown', 'wheel', 'touchstart'];

/**
 * Segundos que faltan para el cierre, o `null` mientras no haga falta avisar.
 * Con 0 la sesión ya venció.
 */
export function segundosParaCierre(inactivoMs: number): number | null {
  if (inactivoMs < AVISO_INACTIVIDAD_MS) return null;
  return Math.max(0, Math.ceil((LIMITE_INACTIVIDAD_MS - inactivoMs) / 1000));
}

/**
 * Vigila la interacción del estudiante con la simulación (ratón, teclado, toque). Mientras la hay,
 * envía un latido a la base de datos para que el barrido de pg_cron no cierre la sesión. Tras 9
 * minutos sin interacción devuelve la cuenta atrás del aviso y, a los 10, llama a `alVencer`.
 * Esperar o leer la respuesta del paciente cuenta como actividad.
 *
 * Si el latido revela que la sesión ya terminó (la cerró el barrido mientras el estudiante estaba
 * fuera), también llama a `alVencer` para mostrar el cierre.
 */
export function useInactividad({
  sesionId,
  activo,
  alVencer,
}: {
  sesionId: string;
  activo: boolean;
  /** Cierra la sesión; devuelve `false` si no pudo (se reintenta). */
  alVencer: () => Promise<boolean>;
}): number | null {
  const store = useAppStoreApi();
  const [segundosRestantes, setSegundosRestantes] = useState<number | null>(null);
  const vencer = useEffectEvent(alVencer);

  useEffect(() => {
    if (!activo) return;

    let cancelado = false;
    let ultimaInteraccion = Date.now();
    let ultimoLatido = 0;
    let latiendo = false;
    let proximoCierre = 0;

    const marcar = () => {
      ultimaInteraccion = Date.now();
    };

    const cerrar = () => {
      if (Date.now() < proximoCierre) return;
      proximoCierre = Date.now() + REINTENTO_CIERRE_MS;
      void vencer();
    };

    const latir = async () => {
      latiendo = true;
      ultimoLatido = Date.now();
      const resultado = await registrarActividad({ sesionId });
      latiendo = false;
      if (!cancelado && resultado.ok && !resultado.datos.enCurso) cerrar();
    };

    const revisar = () => {
      const ahora = Date.now();
      const estadoNpc = store.getState().npc.estado;
      if (estadoNpc === 'procesando' || estadoNpc === 'respondiendo') ultimaInteraccion = ahora;

      const restantes = segundosParaCierre(ahora - ultimaInteraccion);
      setSegundosRestantes(restantes);
      if (restantes === 0) {
        cerrar();
      } else if (
        !latiendo &&
        ultimaInteraccion > ultimoLatido &&
        ahora - ultimoLatido >= INTERVALO_LATIDO_MS
      ) {
        void latir();
      }
    };

    for (const evento of EVENTOS_INTERACCION) {
      window.addEventListener(evento, marcar, { capture: true, passive: true });
    }
    // Abrir o retomar la simulación cuenta como actividad (y detecta si ya venció).
    void latir();
    const intervalo = setInterval(revisar, 1000);

    return () => {
      cancelado = true;
      clearInterval(intervalo);
      for (const evento of EVENTOS_INTERACCION) {
        window.removeEventListener(evento, marcar, { capture: true });
      }
    };
  }, [activo, sesionId, store]);

  return activo ? segundosRestantes : null;
}
