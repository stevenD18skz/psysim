'use client';

import { Loader2, OctagonX } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { interrumpirSesion } from '@/lib/retroalimentacion/actions';

/**
 * Da por interrumpida una sesión que el estudiante dejó abierta (p. ej. cerró el navegador y no
 * volvió). Pide confirmación: el estudiante ya no podrá continuarla.
 */
export function BotonInterrumpir({ sesionId }: { sesionId: string }) {
  const router = useRouter();
  const [confirmando, setConfirmando] = useState(false);
  const [pendiente, startTransition] = useTransition();

  const interrumpir = () =>
    startTransition(async () => {
      const resultado = await interrumpirSesion({ sesionId });
      setConfirmando(false);
      if (!resultado.ok) {
        toast.error(resultado.error);
      } else {
        toast.success('Cerramos la práctica. Ya puedes revisarla.');
      }
      router.refresh();
    });

  if (!confirmando) {
    return (
      <div className="flex flex-col items-center gap-1.5">
        <Button variant="outline" onClick={() => setConfirmando(true)}>
          <OctagonX aria-hidden />
          Cerrar la práctica
        </Button>
        <p className="text-xs text-muted-foreground">
          Normalmente no hace falta: se cierra sola tras 10 minutos sin actividad.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-xl border bg-background p-3 text-sm">
      <p>
        Si el estudiante sigue practicando, se le cerrará y no podrá continuarla. ¿Cerrar la
        práctica?
      </p>
      <div className="flex gap-2">
        <Button variant="destructive" size="sm" onClick={interrumpir} disabled={pendiente}>
          {pendiente && <Loader2 className="animate-spin" aria-hidden />}
          Sí, cerrar la práctica
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setConfirmando(false)}
          disabled={pendiente}
        >
          Cancelar
        </Button>
      </div>
    </div>
  );
}
