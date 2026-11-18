'use client';

import { CopyPlus, Loader2, Pencil, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { archivarCaso } from '@/lib/casos/actions';
import { cn } from '@/lib/utils';
import { sinPerderElPanel } from '@/components/comun/sin-perder-el-panel';

interface AccionesCasoPropioProps {
  casoId: string;
  titulo: string;
  onEliminado: (id: string) => void;
  /** Solo íconos (con su nombre en el tooltip): para tarjetas de tres por fila, sin espacio para texto. */
  soloIconos?: boolean;
  /** Acción principal de la tarjeta, a la derecha; se oculta mientras se confirma la eliminación. */
  extra?: React.ReactNode;
}

/**
 * Editar y eliminar un caso propio, en el pie de su tarjeta. La eliminación pide confirmación en
 * la misma fila (el foco pasa a "Sí, eliminar"; Cancelar vuelve atrás).
 */
export function AccionesCasoPropio({
  casoId,
  titulo,
  onEliminado,
  soloIconos = false,
  extra,
}: AccionesCasoPropioProps) {
  const [confirmando, setConfirmando] = useState(false);
  const [eliminando, startTransition] = useTransition();

  const eliminar = () => {
    startTransition(
      sinPerderElPanel(async () => {
        const resultado = await archivarCaso({ id: casoId });
        if (!resultado.ok) {
          toast.error(resultado.error);
          setConfirmando(false);
          return;
        }
        toast.success(
          <>
            Caso <strong className="font-semibold">{titulo}</strong> eliminado.
          </>
        );
        onEliminado(casoId);
      })
    );
  };

  if (confirmando) {
    return (
      <div role="alert" className="flex w-full items-center gap-1 pl-2 text-sm">
        <span className="mr-auto font-medium text-destructive">¿Eliminar?</span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setConfirmando(false)}
          disabled={eliminando}
        >
          Cancelar
        </Button>
        <Button
          type="button"
          variant="destructive"
          size="sm"
          onClick={eliminar}
          disabled={eliminando}
          autoFocus
        >
          {eliminando && <Loader2 className="animate-spin" aria-hidden />}
          Sí, eliminar
        </Button>
      </div>
    );
  }

  const tamano = soloIconos ? 'icon-sm' : 'sm';
  return (
    <div className="flex w-full items-center gap-1">
      <Button asChild variant="ghost" size={tamano}>
        <Link
          href={`/configuracion/casos/${casoId}`}
          aria-label={`Editar el caso ${titulo}`}
          title="Editar"
        >
          <Pencil aria-hidden />
          {!soloIconos && 'Editar'}
        </Link>
      </Button>
      <Button asChild variant="ghost" size={tamano}>
        <Link
          href={`/configuracion/casos/nuevo?desde=${casoId}`}
          aria-label={`Usar de base el caso ${titulo}`}
          title="Usar de base para otro caso"
        >
          <CopyPlus aria-hidden />
          {!soloIconos && 'Usar de base'}
        </Link>
      </Button>
      <Button
        type="button"
        variant="ghost"
        size={tamano}
        onClick={() => setConfirmando(true)}
        aria-label={`Eliminar el caso ${titulo}`}
        title="Eliminar"
        className={cn(
          'text-muted-foreground hover:bg-destructive/10 hover:text-destructive',
          !extra && 'ml-auto'
        )}
      >
        <Trash2 aria-hidden />
        {!soloIconos && 'Eliminar'}
      </Button>
      {extra && <div className="ml-auto">{extra}</div>}
    </div>
  );
}
