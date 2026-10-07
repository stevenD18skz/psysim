'use client';

import { useMemo } from 'react';

import { climaDeConversacion, type EfectosAmbiente, efectosDeClima } from '@/lib/ambiente/clima';
import { useAppStore } from '@/store/app-store-provider';

/**
 * Efectos del ambiente según el clima emocional de la conversación. Solo cambia (y re-renderiza)
 * cuando llega un mensaje: las transiciones suaves las hace cada capa (escena 3D, velo, audio).
 */
export function useEfectosAmbiente(): EfectosAmbiente {
  const mensajes = useAppStore(state => state.conversacion.mensajes);
  return useMemo(() => efectosDeClima(climaDeConversacion(mensajes)), [mensajes]);
}
