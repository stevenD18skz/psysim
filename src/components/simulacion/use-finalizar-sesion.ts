'use client';

import { unstable_rethrow, useRouter } from 'next/navigation';
import { useCallback, useState, useTransition } from 'react';
import { toast } from 'sonner';

import { cerrarSesionPorInactividad, finalizarSesion } from '@/lib/escenarios/actions';
import { guardarMetricas } from '@/lib/conversacion/guardar-metricas';
import { type ResumenSesion, resumirSesion } from '@/lib/conversacion/resumen';
import { useAppStoreApi } from '@/store/app-store-provider';

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
 */
export function useFinalizarSesion() {
  const router = useRouter();
  const store = useAppStoreApi();
  const [finalizando, startTransition] = useTransition();
  const [resumen, setResumen] = useState<ResumenSesion | null>(null);
  const [motivo, setMotivo] = useState<MotivoCierre>('finalizada');

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
    const { sesion, npc } = store.getState();
    // Nunca se cierra con una petición a la IA en curso (evita cierres accidentales).
    if (!sesion.activa || npc.estado === 'procesando' || npc.estado === 'sesion_finalizada') {
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

  return { finalizar, finalizando, resumen, motivo, cerrarPorInactividad };
}
