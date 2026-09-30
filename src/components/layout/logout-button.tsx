'use client';

import { Loader2, LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';

import { Button } from '@/components/ui/button';
import { cerrarSesion } from '@/lib/auth/actions';
import { RUTA_LOGIN } from '@/lib/auth/routes';
import { useAppStore } from '@/store/app-store-provider';

/** HU-04: cierra la sesión, limpia el slice `auth` y vuelve a /login. */
export function LogoutButton() {
  const router = useRouter();
  const limpiarAuth = useAppStore(state => state.auth.limpiar);
  const [cerrando, startTransition] = useTransition();

  const onClick = () => {
    startTransition(async () => {
      await cerrarSesion();
      limpiarAuth();
      // `refresh` descarta la caché del router para no mostrar una versión almacenada
      // de una ruta protegida.
      router.replace(RUTA_LOGIN);
      router.refresh();
    });
  };

  return (
    <Button variant="outline" size="sm" onClick={onClick} disabled={cerrando}>
      {cerrando ? <Loader2 className="animate-spin" aria-hidden /> : <LogOut aria-hidden />}
      Cerrar sesión
    </Button>
  );
}
