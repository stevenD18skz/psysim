'use client';

import { useEffect, useRef, useState } from 'react';

import { FIN_POR_TIEMPO } from '@/lib/conversacion/cierre';
import { consultarTiempo } from '@/lib/escenarios/actions';
import {
  consultaAhora,
  faseDeConsulta,
  type FaseConsulta,
  type TiempoConsulta,
} from '@/lib/sesiones/tiempo-consulta';
import { useAppStore, useAppStoreApi } from '@/store/app-store-provider';
import { respuestaEnCamino } from '@/store/conversacion-slice';

/** Cada cuánto se recalcula lo que se muestra del tiempo de consulta. */
export const INTERVALO_CONSULTA_MS = 1000;
/** Si el servidor todavía no da por vencida la consulta (o no respondió), cuándo volver a mirar. */
export const REINTENTO_FIN_MS = 15_000;

/**
 * El tiempo de consulta tal como se muestra ahora: el último dato del servidor más lo que avanzó
 * el reloj monotónico del navegador. Solo se recalcula mientras la consulta corre.
 */
export function useTiempoConsulta(
  ahora: () => number = () => performance.now()
): (TiempoConsulta & { fase: FaseConsulta }) | null {
  const consulta = useAppStore(state => state.conversacion.consulta);
  const [instante, setInstante] = useState(ahora);
  const corre = consulta !== null && consulta.transcurridoS !== null;

  useEffect(() => {
    if (!corre) return;
    const actualizar = () => setInstante(ahora());
    actualizar();
    const intervalo = setInterval(actualizar, INTERVALO_CONSULTA_MS);
    return () => clearInterval(intervalo);
    // `ahora` se inyecta solo en las pruebas; no cambia entre renders.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [corre]);

  if (!consulta) return null;
  const tiempo = consultaAhora(consulta, Math.max(instante, consulta.medidoEn));
  return { ...tiempo, fase: faseDeConsulta(tiempo) };
}

/**
 * Pasado el tiempo de la consulta y su margen de cierre, la práctica termina sola. El reloj del
 * navegador solo decide cuándo preguntar: el fin lo confirma el servidor con la hora de la base de
 * datos (`consultarTiempo`). Si todavía no corresponde, se corrige lo que se muestra.
 */
export function useFinPorTiempo({ sesionId, activo }: { sesionId: string; activo: boolean }) {
  const store = useAppStoreApi();
  const tiempo = useTiempoConsulta();
  const vencida = tiempo?.fase === 'vencida';
  const enCamino = useAppStore(respuestaEnCamino);
  const preguntando = useRef(false);
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    if (!activo || !vencida || enCamino || preguntando.current) return;
    preguntando.current = true;
    let vigente = true;
    let reintento: ReturnType<typeof setTimeout> | undefined;

    void (async () => {
      let resultado: Awaited<ReturnType<typeof consultarTiempo>> | null = null;
      try {
        resultado = await consultarTiempo({ sesionId });
      } catch {
        resultado = null;
      }
      preguntando.current = false;
      // Cambió algo mientras se preguntaba (p. ej. llegó una respuesta): se vuelve a evaluar.
      if (!vigente) {
        setIntento(n => n + 1);
        return;
      }
      const { conversacion } = store.getState();
      if (resultado?.ok && faseDeConsulta(resultado.datos) === 'vencida') {
        if (!conversacion.cierre) conversacion.establecerCierre(FIN_POR_TIEMPO);
        return;
      }
      if (resultado?.ok) conversacion.actualizarConsulta(resultado.datos);
      reintento = setTimeout(() => setIntento(n => n + 1), REINTENTO_FIN_MS);
    })();

    return () => {
      vigente = false;
      if (reintento) clearTimeout(reintento);
    };
  }, [activo, vencida, enCamino, sesionId, store, intento]);
}
