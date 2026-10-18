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

// `click` cubre a quien activa «Sigo aquí» con un lector de pantalla, control por voz o
// conmutador: esas tecnologías suelen enviar solo el clic, sin puntero ni teclado.
const EVENTOS_INTERACCION = [
  'pointermove',
  'pointerdown',
  'keydown',
  'wheel',
  'touchstart',
  'click',
];
/** Como mucho, un aviso a las otras pestañas de la misma práctica cada 5 s. */
const INTERVALO_DIFUSION_MS = 5_000;

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
 *
 * Con la misma práctica abierta en varias pestañas, todas comparten la última interacción (por
 * `BroadcastChannel`): una pestaña olvidada no cierra la práctica que sigue activa en otra. Un
 * latido que falla (sin conexión) no detiene los siguientes.
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
    let ultimaDifusion = 0;
    let avisando = false;

    const canal =
      typeof BroadcastChannel === 'undefined'
        ? null
        : new BroadcastChannel(`psysim:actividad:${sesionId}`);
    canal?.addEventListener('message', (evento: MessageEvent<number>) => {
      if (typeof evento.data === 'number' && evento.data > ultimaInteraccion) {
        ultimaInteraccion = evento.data;
      }
    });

    const marcar = () => {
      const ahora = Date.now();
      ultimaInteraccion = ahora;
      // Responder al aviso lo cierra en el acto, sin esperar al próximo tic.
      if (avisando) {
        avisando = false;
        setSegundosRestantes(null);
      }
      if (canal && ahora - ultimaDifusion >= INTERVALO_DIFUSION_MS) {
        ultimaDifusion = ahora;
        canal.postMessage(ahora);
      }
    };

    const cerrar = () => {
      if (Date.now() < proximoCierre) return;
      proximoCierre = Date.now() + REINTENTO_CIERRE_MS;
      void vencer();
    };

    const latir = async () => {
      latiendo = true;
      ultimoLatido = Date.now();
      try {
        const resultado = await registrarActividad({ sesionId });
        if (!cancelado && resultado.ok && !resultado.datos.enCurso) cerrar();
      } catch {
        // Sin conexión: se reintenta en el próximo intervalo de latido con interacción.
      } finally {
        latiendo = false;
      }
    };

    const revisar = () => {
      const ahora = Date.now();
      const estadoNpc = store.getState().npc.estado;
      if (estadoNpc === 'procesando' || estadoNpc === 'respondiendo') ultimaInteraccion = ahora;

      const restantes = segundosParaCierre(ahora - ultimaInteraccion);
      avisando = restantes !== null;
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
      canal?.close();
      for (const evento of EVENTOS_INTERACCION) {
        window.removeEventListener(evento, marcar, { capture: true });
      }
    };
  }, [activo, sesionId, store]);

  return activo ? segundosRestantes : null;
}
