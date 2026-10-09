'use client';

import { Flag, Loader2 } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

/**
 * HU-17 (versión mínima) — El estudiante termina la simulación desde el HUD. Pide confirmación
 * porque la sesión no se puede reanudar: queda lista para que el docente la revise. El Sprint 4
 * amplía el cierre con las métricas y la pantalla de resultados.
 */
export function BotonFinalizar({
  onFinalizar,
  finalizando,
  deshabilitado = false,
}: {
  onFinalizar: () => void;
  finalizando: boolean;
  deshabilitado?: boolean;
}) {
  const [abierto, setAbierto] = useState(false);

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="pointer-events-auto bg-card/90 backdrop-blur"
        onClick={() => {
          // Con el ratón capturado no se puede usar el diálogo: se libera primero.
          document.exitPointerLock?.();
          setAbierto(true);
        }}
        disabled={deshabilitado || finalizando}
      >
        {finalizando ? <Loader2 className="animate-spin" aria-hidden /> : <Flag aria-hidden />}
        Finalizar sesión
      </Button>
      <Dialog open={abierto} onOpenChange={setAbierto}>
        <DialogContent role="alertdialog" className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>¿Finalizar la simulación?</DialogTitle>
            <DialogDescription>
              La sesión terminará y no podrá reanudarse. Tu docente revisará la conversación y te
              dejará su retroalimentación.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAbierto(false)} disabled={finalizando}>
              Seguir practicando
            </Button>
            <Button
              onClick={() => {
                setAbierto(false);
                onFinalizar();
              }}
              disabled={finalizando}
            >
              Confirmar finalización
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
