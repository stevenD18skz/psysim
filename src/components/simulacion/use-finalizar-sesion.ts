'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';

import { finalizarSesion } from '@/lib/escenarios/actions';
import { type ResumenSesion, resumirSesion } from '@/lib/conversacion/resumen';
import { useAppStoreApi } from '@/store/app-store-provider';

/**
 * HU-16 · T02 — Cierra la sesión activa: la marca como finalizada en Supabase (la hora de fin
 * la pone la base de datos), pasa el NPC a `sesion_finalizada` y devuelve el resumen.
 * El Sprint 4 (HU-20) amplía este flujo con la persistencia de métricas y la pantalla de
 * resultados.
 */
export function useFinalizarSesion() {
  const store = useAppStoreApi();
  const [finalizando, startTransition] = useTransition();
  const [resumen, setResumen] = useState<ResumenSesion | null>(null);

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
      const actual = store.getState();
      actual.npc.actualizarEstadoNPC('sesion_finalizada');
      setResumen(resumirSesion(resultado.datos.inicio, resultado.datos.fin, actual.metricas));
    });
  };

  return { finalizar, finalizando, resumen };
}
