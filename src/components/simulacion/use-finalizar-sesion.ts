'use client';

import { unstable_rethrow, useRouter } from 'next/navigation';
import { useCallback, useRef, useState, useTransition } from 'react';
import { toast } from 'sonner';

import { cerrarSesionPorInactividad, finalizarSesion } from '@/lib/escenarios/actions';
import { guardarMetricas } from '@/lib/conversacion/guardar-metricas';
import { type ResumenSesion, resumirSesion } from '@/lib/conversacion/resumen';
import { useAppStoreApi } from '@/store/app-store-provider';
import { respuestaEnCamino } from '@/store/conversacion-slice';

/** Por qué terminó la sesión: el estudiante la finalizó o se cerró por inactividad. */
export type MotivoCierre = 'finalizada' | 'inactividad';

/**
 * HU-20 — Cierra la sesión activa. `finalizar` (el estudiante pulsa «Terminar práctica») envía las
 * métricas a /api/metrics/save, que las guarda y marca la sesión como finalizada en una sola
 * operación (la hora de fin la pone la base de datos), pasa el NPC a `sesion_finalizada` y lleva
 * a la pantalla de resultados. Si el guardado falla, cierra la sesión sin las medidas del navegador
 * para que nadie se quede atrapado: la base de datos calcula las demás métricas con la conversación
 * guardada (trigger `sesion_registrar_metrica`). Tras 10
 * minutos sin interacción, `cerrarPorInactividad` la da por interrumpida y devuelve el resumen.
 *
 * Si el paciente dio por terminada la consulta (crisis o trato inapropiado), `terminarPorCierre`
 * recorre el mismo camino sin salir de la pantalla: el estudiante lee el aviso y sigue a los
 * resultados con `verResultados`.
 */
export function useFinalizarSesion() {
  const router = useRouter();
  const store = useAppStoreApi();
  const [finalizando, startTransition] = useTransition();
  const [resumen, setResumen] = useState<ResumenSesion | null>(null);
  const [motivo, setMotivo] = useState<MotivoCierre>('finalizada');
  const cierreEnMarcha = useRef(false);

  const mostrarCierre = useCallback(
    (inicio: string, fin: string, motivoCierre: MotivoCierre) => {
      const actual = store.getState();
      actual.npc.actualizarEstadoNPC('sesion_finalizada');
      setMotivo(motivoCierre);
      setResumen(resumirSesion(inicio, fin, actual.metricas));
    },
    [store]
  );

  const finalizar = () => {
    const estado = store.getState();
    const { sesion, npc } = estado;
    // Nunca se cierra con una respuesta de la IA en camino (evita cierres accidentales).
    if (!sesion.activa || respuestaEnCamino(estado) || npc.estado === 'sesion_finalizada') {
      return;
    }
    const sesionId = sesion.activa.id;

    startTransition(async () => {
      const guardado = await guardarMetricas(store);
      if (guardado.estado === 'fallo') {
        let resultado;
        try {
          resultado = await finalizarSesion({ sesionId });
        } catch (error) {
          unstable_rethrow(error);
          toast.error('No pudimos terminar la práctica: revisa tu conexión e inténtalo de nuevo.');
          return;
        }
        if (!resultado.ok) {
          toast.error(resultado.error);
          return;
        }
      }
      // `limpiar` del store lo hace la pantalla de resultados al montarse: hasta entonces la
      // simulación sigue en pantalla (sin parpadear a la pantalla de carga).
      store.getState().npc.actualizarEstadoNPC('sesion_finalizada');
      router.push(`/resultados?sesion=${sesionId}`);
    });
  };

  /**
   * El paciente cerró la consulta: guarda las métricas y termina la práctica, en silencio y sin
   * navegar. Si no se puede (sin conexión), la práctica queda como estaba y `verResultados` lo
   * vuelve a intentar con los avisos de siempre.
   */
  const terminarPorCierre = useCallback(() => {
    const estado = store.getState();
    const { sesion, npc } = estado;
    if (
      !sesion.activa ||
      cierreEnMarcha.current ||
      respuestaEnCamino(estado) ||
      npc.estado === 'sesion_finalizada'
    ) {
      return;
    }
    cierreEnMarcha.current = true;
    const sesionId = sesion.activa.id;

    startTransition(async () => {
      try {
        const guardado = await guardarMetricas(store);
        if (guardado.estado === 'fallo') {
          const resultado = await finalizarSesion({ sesionId });
          if (!resultado.ok) return;
        }
        store.getState().npc.actualizarEstadoNPC('sesion_finalizada');
      } catch (error) {
        unstable_rethrow(error);
      } finally {
        cierreEnMarcha.current = false;
      }
    });
  }, [store]);

  /** Botón «Continuar» del aviso de cierre: a los resultados, terminando antes si hizo falta. */
  const verResultados = () => {
    const { sesion, npc } = store.getState();
    if (!sesion.activa) return;
    if (npc.estado === 'sesion_finalizada') router.push(`/resultados?sesion=${sesion.activa.id}`);
    else finalizar();
  };

  /** Devuelve `false` si no se pudo cerrar (el aviso de inactividad lo reintenta). */
  const cerrarPorInactividad = useCallback(async () => {
    const sesionId = store.getState().sesion.activa?.id;
    if (!sesionId) return false;

    let resultado;
    try {
      resultado = await cerrarSesionPorInactividad({ sesionId });
    } catch {
      return false;
    }
    if (!resultado.ok) return false;
    const { inicio, fin, estado } = resultado.datos;
    mostrarCierre(inicio, fin, estado === 'interrumpida' ? 'inactividad' : 'finalizada');
    return true;
  }, [store, mostrarCierre]);

  return {
    finalizar,
    finalizando,
    resumen,
    motivo,
    cerrarPorInactividad,
    terminarPorCierre,
    verResultados,
  };
}
