'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

import { FormularioCambiarContrasena } from '@/components/layout/formulario-cambiar-contrasena';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { LONGITUD_MINIMA_CONTRASENA } from '@/schemas/auth.schema';

/** Cambio de contraseña desde el menú de la cuenta. */
export function DialogoCambiarContrasena({
  abierto,
  onAbiertoCambia,
}: {
  abierto: boolean;
  onAbiertoCambia: (abierto: boolean) => void;
}) {
  const router = useRouter();
  const [guardando, setGuardando] = useState(false);

  // Al cerrarse, el contenido se desmonta: el formulario vuelve a abrirse vacío.
  const cambiarAbierto = (valor: boolean) => {
    if (!guardando) onAbiertoCambia(valor);
  };

  return (
    <Dialog open={abierto} onOpenChange={cambiarAbierto}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Cambiar contraseña</DialogTitle>
          <DialogDescription>
            Usa al menos {LONGITUD_MINIMA_CONTRASENA} caracteres. Una frase corta es fácil de
            recordar y difícil de adivinar.
          </DialogDescription>
        </DialogHeader>
        <FormularioCambiarContrasena
          onGuardando={setGuardando}
          onCancelar={() => cambiarAbierto(false)}
          onListo={() => {
            toast.success('Contraseña actualizada.');
            onAbiertoCambia(false);
            router.refresh();
          }}
          // El pie del diálogo: de borde a borde, como `DialogFooter`.
          claseAcciones="-mx-4 -mb-4 rounded-b-xl border-t bg-muted/50 p-4"
        />
      </DialogContent>
    </Dialog>
  );
}
