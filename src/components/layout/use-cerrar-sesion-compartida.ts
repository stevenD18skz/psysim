'use client';

import { useTransition } from 'react';

import { cerrarSesionEquipoCompartido } from '@/lib/equipo-compartido/actions';
import { useAppStore } from '@/store/app-store-provider';

/**
 * Modo presencial: cierra la sesión del estudiante en el equipo del docente y lleva a la pantalla
 * que pide cerrar también la sesión de Google. La acción redirige; aquí solo se limpia el store.
 */
export function useCerrarSesionCompartida() {
  const limpiarAuth = useAppStore(state => state.auth.limpiar);
  const limpiarSesion = useAppStore(state => state.sesion.limpiar);
  const [cerrando, startTransition] = useTransition();

  const salir = () =>
    startTransition(async () => {
      limpiarSesion();
      limpiarAuth();
      await cerrarSesionEquipoCompartido();
    });

  return { salir, cerrando };
}
