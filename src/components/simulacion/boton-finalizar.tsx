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
 * HU-17 — El estudiante termina la práctica desde el HUD. Pide confirmación porque no se puede
 * reanudar: queda lista para que el docente la revise. Se deshabilita mientras el paciente responde.
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
        className="pointer-events-auto bg-card/90 font-semibold backdrop-blur"
        onClick={() => {
          // Con el ratón capturado no se puede usar el diálogo: se libera primero.
          document.exitPointerLock?.();
          setAbierto(true);
        }}
        disabled={deshabilitado || finalizando}
        title={deshabilitado ? 'Espera a que el paciente termine de responder.' : undefined}
      >
        {finalizando ? <Loader2 className="animate-spin" aria-hidden /> : <Flag aria-hidden />}
        {finalizando ? 'Terminando…' : 'Terminar práctica'}
      </Button>
      <Dialog open={abierto} onOpenChange={setAbierto}>
        <DialogContent role="alertdialog" className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>¿Terminar la práctica?</DialogTitle>
            <DialogDescription>
              No se puede reanudar. Tu docente leerá la conversación y te dejará sus comentarios.
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
              Terminar práctica
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
