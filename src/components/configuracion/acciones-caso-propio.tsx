'use client';

import { Loader2, Pencil, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { archivarCaso } from '@/lib/casos/actions';

interface AccionesCasoPropioProps {
  casoId: string;
  titulo: string;
  onEliminado: (id: string) => void;
}

/** Editar y eliminar un caso propio. La eliminación pide confirmación en línea. */
export function AccionesCasoPropio({ casoId, titulo, onEliminado }: AccionesCasoPropioProps) {
  const [confirmando, setConfirmando] = useState(false);
  const [eliminando, startTransition] = useTransition();

  const eliminar = () => {
    startTransition(async () => {
      const resultado = await archivarCaso({ id: casoId });
      if (!resultado.ok) {
        toast.error(resultado.error);
        setConfirmando(false);
        return;
      }
      toast.success(`Caso «${titulo}» eliminado.`);
      onEliminado(casoId);
    });
  };

  if (confirmando) {
    return (
      <div role="alert" className="flex flex-wrap items-center gap-2 px-1 text-sm">
        <span className="text-muted-foreground">¿Eliminar este caso?</span>
        <Button
          type="button"
          variant="destructive"
          size="sm"
          onClick={eliminar}
          disabled={eliminando}
        >
          {eliminando && <Loader2 className="animate-spin" aria-hidden />}
          Sí, eliminar
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setConfirmando(false)}
          disabled={eliminando}
        >
          Cancelar
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <Button asChild variant="ghost" size="sm">
        <Link href={`/configuracion/casos/${casoId}`} aria-label={`Editar el caso ${titulo}`}>
          <Pencil aria-hidden />
          Editar
        </Link>
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setConfirmando(true)}
        aria-label={`Eliminar el caso ${titulo}`}
      >
        <Trash2 aria-hidden />
        Eliminar
      </Button>
    </div>
  );
}
