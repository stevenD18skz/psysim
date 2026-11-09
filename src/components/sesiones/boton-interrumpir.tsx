'use client';

import { Loader2, OctagonX } from 'lucide-react';
import { unstable_rethrow, useRouter } from 'next/navigation';
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
      try {
        const resultado = await interrumpirSesion({ sesionId });
        setConfirmando(false);
        if (!resultado.ok) {
          toast.error(resultado.error);
        } else {
          toast.success('Terminamos la práctica. Ya puedes revisarla.');
        }
        router.refresh();
      } catch (error) {
        // Sin esto, un corte de red o un despliegue nuevo reemplaza el panel por la página de error.
        unstable_rethrow(error);
        toast.error('No pudimos terminar la práctica: revisa tu conexión e inténtalo de nuevo.');
      }
    });

  if (!confirmando) {
    return (
      <div className="flex flex-col items-center gap-1.5">
        <Button variant="outline" onClick={() => setConfirmando(true)}>
          <OctagonX aria-hidden />
          Terminar la práctica
        </Button>
        <p className="text-xs text-muted-foreground">
          Normalmente no hace falta: termina sola tras 10 minutos sin actividad.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-xl border bg-background p-3 text-sm">
      <p role="alert">
        Si el estudiante sigue practicando, la práctica terminará y no podrá continuarla. ¿Terminar
        la práctica?
      </p>
      <div className="flex gap-2">
        <Button
          variant="destructive"
          size="sm"
          onClick={interrumpir}
          disabled={pendiente}
          // El botón que abrió la confirmación desaparece: el foco pasa a la acción.
          autoFocus
        >
          {pendiente && <Loader2 className="animate-spin" aria-hidden />}
          Sí, terminar la práctica
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
