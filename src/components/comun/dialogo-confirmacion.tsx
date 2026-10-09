'use client';

import { Loader2 } from 'lucide-react';
import { useId, useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface DialogoConfirmacionProps {
  abierto: boolean;
  onAbiertoCambia: (abierto: boolean) => void;
  titulo: string;
  descripcion: React.ReactNode;
  /** Detalle adicional bajo la descripción (p. ej. qué se pierde). */
  children?: React.ReactNode;
  etiquetaConfirmar: string;
  destructivo?: boolean;
  pendiente?: boolean;
  /**
   * Para acciones irreversibles con mucho en juego: el botón se habilita solo al escribir este
   * texto exacto (p. ej. el código del estudiante).
   */
  textoConfirmacion?: string;
  onConfirmar: () => void;
}

/**
 * Confirmación de una acción importante en un diálogo accesible (foco atrapado, Escape cierra).
 * Mientras la acción está pendiente no se puede cerrar.
 */
export function DialogoConfirmacion({
  abierto,
  onAbiertoCambia,
  titulo,
  descripcion,
  children,
  pendiente = false,
  ...acciones
}: DialogoConfirmacionProps) {
  const cambiar = (valor: boolean) => {
    if (!pendiente) onAbiertoCambia(valor);
  };

  return (
    <Dialog open={abierto} onOpenChange={cambiar}>
      <DialogContent className="sm:max-w-md" showCloseButton={!pendiente}>
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
          <DialogDescription>{descripcion}</DialogDescription>
        </DialogHeader>
        {children}
        {/* Dentro del contenido: lo escrito se descarta al cerrar el diálogo. */}
        <Confirmacion {...acciones} pendiente={pendiente} onCancelar={() => cambiar(false)} />
      </DialogContent>
    </Dialog>
  );
}

function Confirmacion({
  etiquetaConfirmar,
  destructivo = false,
  pendiente,
  textoConfirmacion,
  onConfirmar,
  onCancelar,
}: Pick<
  DialogoConfirmacionProps,
  'etiquetaConfirmar' | 'destructivo' | 'textoConfirmacion' | 'onConfirmar'
> & { pendiente: boolean; onCancelar: () => void }) {
  const id = useId();
  const [escrito, setEscrito] = useState('');
  const confirmado = !textoConfirmacion || escrito.trim() === textoConfirmacion;

  return (
    <>
      {textoConfirmacion && (
        <div className="flex flex-col gap-2">
          <Label htmlFor={id} className="font-normal">
            Para confirmar, escribe{' '}
            <span className="font-mono font-semibold">{textoConfirmacion}</span>
          </Label>
          <Input
            id={id}
            autoComplete="off"
            spellCheck={false}
            value={escrito}
            onChange={evento => setEscrito(evento.target.value)}
            disabled={pendiente}
          />
        </div>
      )}

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancelar} disabled={pendiente}>
          Cancelar
        </Button>
        <Button
          type="button"
          variant={destructivo ? 'destructive' : 'default'}
          onClick={onConfirmar}
          disabled={pendiente || !confirmado}
          aria-busy={pendiente}
        >
          {pendiente && <Loader2 className="animate-spin" aria-hidden />}
          {etiquetaConfirmar}
        </Button>
      </DialogFooter>
    </>
  );
}
