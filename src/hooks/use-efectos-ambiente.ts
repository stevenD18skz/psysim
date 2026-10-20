'use client';

import { useMemo } from 'react';

import { useAmbienteEmocional } from '@/hooks/use-ambiente-emocional';
import { climaDeConversacion, type EfectosAmbiente, efectosDeClima } from '@/lib/ambiente/clima';
import { useAppStore } from '@/store/app-store-provider';

/** Efectos de una conversación sin carga emocional: el consultorio en calma. */
const EFECTOS_NEUTROS = efectosDeClima(climaDeConversacion([]));

/**
 * Efectos del ambiente según el clima emocional de la conversación. Solo cambia (y re-renderiza)
 * cuando llega un mensaje: las transiciones suaves las hace cada capa (escena 3D, velo, audio).
 * Si el estudiante apagó el «Ambiente emocional», todas las capas reciben los efectos neutros.
 */
export function useEfectosAmbiente(): EfectosAmbiente {
  const mensajes = useAppStore(state => state.conversacion.mensajes);
  const activado = useAmbienteEmocional();
  return useMemo(
    () => (activado ? efectosDeClima(climaDeConversacion(mensajes)) : EFECTOS_NEUTROS),
    [mensajes, activado]
  );
}
