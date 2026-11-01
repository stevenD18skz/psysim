'use client';

import { useTransition } from 'react';

import { olvidarDatosDeLaCuenta } from '@/lib/datos-locales';
import { cerrarSesionEquipoCompartido } from '@/lib/equipo-compartido/actions';
import { useAppStore } from '@/store/app-store-provider';

/**
 * Modo presencial: cierra la sesión del estudiante en el equipo del docente y lleva a la pantalla
 * que pide cerrar también la sesión de Google. La acción redirige; aquí se limpian el store y las
 * notas que el estudiante dejó en el navegador.
 */
export function useCerrarSesionCompartida() {
  const limpiarAuth = useAppStore(state => state.auth.limpiar);
  const limpiarSesion = useAppStore(state => state.sesion.limpiar);
  const [cerrando, startTransition] = useTransition();

  const salir = () =>
    startTransition(async () => {
      olvidarDatosDeLaCuenta();
      limpiarSesion();
      limpiarAuth();
      await cerrarSesionEquipoCompartido();
    });

  return { salir, cerrando };
}
