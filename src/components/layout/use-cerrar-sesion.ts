'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';

import { cerrarSesion } from '@/lib/auth/actions';
import { RUTA_LOGIN } from '@/lib/auth/routes';
import { useAppStore } from '@/store/app-store-provider';

/** HU-04: cierra la sesión, limpia el slice `auth` y vuelve a /login. */
export function useCerrarSesion() {
  const router = useRouter();
  const limpiarAuth = useAppStore(state => state.auth.limpiar);
  const [cerrando, startTransition] = useTransition();

  const salir = () => {
    startTransition(async () => {
      await cerrarSesion();
      limpiarAuth();
      // `refresh` descarta la caché del router para no mostrar una versión almacenada
      // de una ruta protegida.
      router.replace(RUTA_LOGIN);
      router.refresh();
    });
  };

  return { salir, cerrando };
}
