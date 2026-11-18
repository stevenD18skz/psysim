'use client';

import { type Route } from 'next';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { FormularioCambiarContrasena } from '@/components/layout/formulario-cambiar-contrasena';
import { useCerrarSesion } from '@/components/layout/use-cerrar-sesion';
import { Button } from '@/components/ui/button';

/**
 * El cambio de la contraseña temporal, sin forma de saltarlo: al guardar se entra al panel; la
 * otra salida es cerrar la sesión.
 */
export function CambioObligatorioDeContrasena({ destino }: { destino: Route }) {
  const router = useRouter();
  const { salir, cerrando } = useCerrarSesion();

  return (
    <div className="flex flex-col gap-4">
      <FormularioCambiarContrasena
        onListo={() => {
          toast.success('Contraseña actualizada.');
          router.replace(destino);
          router.refresh();
        }}
      />
      <Button
        type="button"
        variant="ghost"
        className="w-fit self-center text-muted-foreground"
        onClick={salir}
        disabled={cerrando}
      >
        Cerrar sesión
      </Button>
    </div>
  );
}
