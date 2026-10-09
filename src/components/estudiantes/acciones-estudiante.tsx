'use client';

import { ArrowRight, Eye, MailPlus, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';

import { DialogoConfirmacion } from '@/components/comun/dialogo-confirmacion';
import { DialogoEstudiante } from '@/components/estudiantes/dialogo-estudiante';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { contarSesiones } from '@/lib/estudiantes/estudiantes';
import { eliminarEstudiante } from '@/lib/estudiantes/actions';
import { type EstudianteRegistrado } from '@/types';

type Estudiante = Pick<
  EstudianteRegistrado,
  'id' | 'codigo' | 'nombre' | 'correo' | 'cuentaVinculada' | 'metricas'
>;

/**
 * Menú "⋯" de un estudiante: ver su ficha, asignarle una simulación, editar sus datos y
 * eliminarlo. En la ficha (`enFicha`) solo ofrece eliminar (lo demás ya está a la vista) y, al
 * eliminar, vuelve a la lista.
 */
export function AccionesEstudiante({
  estudiante,
  enFicha = false,
}: {
  estudiante: Estudiante;
  enFicha?: boolean;
}) {
  const router = useRouter();
  const [editando, setEditando] = useState(false);
  const [eliminando, setEliminando] = useState(false);

  return (
    <>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button
            variant={enFicha ? 'outline' : 'ghost'}
            size={enFicha ? 'icon-lg' : 'icon-sm'}
            aria-label={`Más acciones para ${estudiante.nombre}`}
          >
            <MoreHorizontal aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          {!enFicha && (
            <DropdownMenuItem asChild>
              <Link href={`/estudiantes/${estudiante.id}`}>
                <Eye aria-hidden />
                Ver ficha
              </Link>
            </DropdownMenuItem>
          )}
          {!enFicha && estudiante.cuentaVinculada && (
            <DropdownMenuItem asChild>
              <Link href={`/configuracion?estudiante=${estudiante.codigo}`}>
                <ArrowRight aria-hidden />
                Asignar simulación
              </Link>
            </DropdownMenuItem>
          )}
          {!enFicha && (
            <>
              <DropdownMenuItem onSelect={() => setEditando(true)}>
                {estudiante.correo ? <Pencil aria-hidden /> : <MailPlus aria-hidden />}
                {estudiante.correo ? 'Editar datos' : 'Agregar correo'}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}
          <DropdownMenuItem variant="destructive" onSelect={() => setEliminando(true)}>
            <Trash2 aria-hidden />
            Eliminar estudiante
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <DialogoEstudiante
        estudiante={estudiante}
        abierto={editando}
        onAbiertoCambia={setEditando}
        onGuardado={() => router.refresh()}
      />
      <EliminarEstudiante
        estudiante={estudiante}
        abierto={eliminando}
        onAbiertoCambia={setEliminando}
        alEliminar={() => (enFicha ? router.push('/estudiantes') : router.refresh())}
      />
    </>
  );
}

function EliminarEstudiante({
  estudiante,
  abierto,
  onAbiertoCambia,
  alEliminar,
}: {
  estudiante: Estudiante;
  abierto: boolean;
  onAbiertoCambia: (abierto: boolean) => void;
  alEliminar: () => void;
}) {
  const [pendiente, startTransition] = useTransition();
  const { sesiones, codigosPendientes } = estudiante.metricas;
  const conHistorial = sesiones > 0;

  const eliminar = () =>
    startTransition(async () => {
      const resultado = await eliminarEstudiante({ id: estudiante.id });
      if (!resultado.ok) {
        toast.error(resultado.error);
        return;
      }
      toast.success(`${estudiante.nombre} fue eliminado.`);
      onAbiertoCambia(false);
      alEliminar();
    });

  return (
    <DialogoConfirmacion
      abierto={abierto}
      onAbiertoCambia={onAbiertoCambia}
      titulo={`¿Eliminar a ${estudiante.nombre}?`}
      descripcion="Esta acción no se puede deshacer."
      etiquetaConfirmar="Eliminar estudiante"
      destructivo
      pendiente={pendiente}
      textoConfirmacion={conHistorial ? estudiante.codigo : undefined}
      onConfirmar={eliminar}
    >
      <ul className="flex list-disc flex-col gap-1 rounded-lg bg-muted/60 py-3 pr-3 pl-7 text-sm">
        {conHistorial ? (
          <li>
            Se borrarán sus <strong>{contarSesiones(sesiones)}</strong> con las conversaciones y la
            retroalimentación.
          </li>
        ) : (
          <li>Aún no tiene sesiones: no se pierde ningún historial.</li>
        )}
        {codigosPendientes > 0 && (
          <li>
            Sus {codigosPendientes === 1 ? 'código sin usar dejará' : 'códigos sin usar dejarán'} de
            funcionar.
          </li>
        )}
        {estudiante.cuentaVinculada && (
          <li>Si ningún otro docente lo tiene registrado, también se eliminará su cuenta.</li>
        )}
      </ul>
    </DialogoConfirmacion>
  );
}
