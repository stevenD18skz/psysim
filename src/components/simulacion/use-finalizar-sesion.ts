'use client';

import { useCallback, useState, useTransition } from 'react';
import { toast } from 'sonner';

import { cerrarSesionPorInactividad, finalizarSesion } from '@/lib/escenarios/actions';
import { type ResumenSesion, resumirSesion } from '@/lib/conversacion/resumen';
import { useAppStoreApi } from '@/store/app-store-provider';

/** Por qué terminó la sesión: el estudiante la finalizó o se cerró por inactividad. */
export type MotivoCierre = 'finalizada' | 'inactividad';

/**
 * HU-16 · T02 — Cierra la sesión activa: la marca como finalizada en Supabase (la hora de fin
 * la pone la base de datos), pasa el NPC a `sesion_finalizada` y devuelve el resumen.
 * El Sprint 4 (HU-20) amplía este flujo con la persistencia de métricas y la pantalla de
 * resultados. Tras 10 minutos sin interacción, `cerrarPorInactividad` la da por interrumpida.
 */
export function useFinalizarSesion() {
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
      const resultado = await finalizarSesion({ sesionId });
      if (!resultado.ok) {
        toast.error(resultado.error);
        return;
      }
      mostrarCierre(resultado.datos.inicio, resultado.datos.fin, 'finalizada');
    });
  };

  /** Devuelve `false` si no se pudo cerrar (el aviso de inactividad lo reintenta). */
  const cerrarPorInactividad = useCallback(async () => {
    const sesionId = store.getState().sesion.activa?.id;
    if (!sesionId) return false;

    const resultado = await cerrarSesionPorInactividad({ sesionId });
    if (!resultado.ok) return false;
    const { inicio, fin, estado } = resultado.datos;
    mostrarCierre(inicio, fin, estado === 'interrumpida' ? 'inactividad' : 'finalizada');
    return true;
  }, [store, mostrarCierre]);

  return { finalizar, finalizando, resumen, motivo, cerrarPorInactividad };
}
