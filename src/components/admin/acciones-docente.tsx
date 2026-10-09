'use client';

import { Eye, KeyRound, MoreHorizontal, Pencil, Power, PowerOff, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';

import { CredencialesAcceso } from '@/components/admin/credenciales-acceso';
import { DialogoDocente } from '@/components/admin/dialogo-docente';
import { DialogoConfirmacion } from '@/components/comun/dialogo-confirmacion';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  cambiarEstadoDocente,
  eliminarDocente,
  restablecerContrasenaDocente,
} from '@/lib/admin/actions';
import { type DocenteAdmin } from '@/types';

type Dialogo = 'editar' | 'contrasena' | 'estado' | 'eliminar' | null;

/**
 * Menú "⋯" de una cuenta del equipo docente: ver su ficha, editarla, generar una contraseña
 * temporal, desactivarla o reactivarla y eliminarla (solo sin historial). Sobre la propia cuenta
 * solo permite editar los datos.
 */
export function AccionesDocente({
  docente,
  esPropio,
  enFicha = false,
}: {
  docente: DocenteAdmin;
  esPropio: boolean;
  enFicha?: boolean;
}) {
  const router = useRouter();
  const [dialogo, setDialogo] = useState<Dialogo>(null);
  const [contrasena, setContrasena] = useState<string | null>(null);
  const [pendiente, startTransition] = useTransition();
  const { metricas } = docente;
  const conHistorial = metricas.estudiantes + metricas.sesiones + metricas.casosPropios > 0;
  const primerNombre = docente.nombre.split(' ')[0];

  const cerrar = (abierto: boolean) => {
    if (!abierto) setDialogo(null);
  };

  const ejecutar = (
    accion: () => Promise<{ ok: boolean; error?: string }>,
    exito: string,
    despues: () => void = () => router.refresh()
  ) =>
    startTransition(async () => {
      const resultado = await accion();
      if (!resultado.ok) {
        toast.error(resultado.error);
        return;
      }
      toast.success(exito);
      setDialogo(null);
      despues();
    });

  const restablecer = () =>
    startTransition(async () => {
      const resultado = await restablecerContrasenaDocente({ id: docente.id });
      if (!resultado.ok) {
        toast.error(resultado.error);
        return;
      }
      setDialogo(null);
      setContrasena(resultado.datos.contrasena);
      router.refresh();
    });

  return (
    <>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button
            variant={enFicha ? 'outline' : 'ghost'}
            size={enFicha ? 'icon-lg' : 'icon-sm'}
            aria-label={`Más acciones para ${docente.nombre}`}
          >
            <MoreHorizontal aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-60">
          {!enFicha && (
            <DropdownMenuItem asChild>
              <Link href={`/admin/docentes/${docente.id}`}>
                <Eye aria-hidden />
                Ver ficha
              </Link>
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onSelect={() => setDialogo('editar')}>
            <Pencil aria-hidden />
            Editar datos y rol
          </DropdownMenuItem>
          {!esPropio && (
            <>
              <DropdownMenuItem onSelect={() => setDialogo('contrasena')}>
                <KeyRound aria-hidden />
                Generar contraseña temporal
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => setDialogo('estado')}>
                {docente.activo ? <PowerOff aria-hidden /> : <Power aria-hidden />}
                {docente.activo ? 'Desactivar cuenta' : 'Reactivar cuenta'}
              </DropdownMenuItem>
              {conHistorial ? (
                <DropdownMenuLabel className="flex gap-2 text-xs font-normal text-muted-foreground">
                  <Trash2 className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                  Tiene historial: desactívala en lugar de eliminarla.
                </DropdownMenuLabel>
              ) : (
                <DropdownMenuItem variant="destructive" onSelect={() => setDialogo('eliminar')}>
                  <Trash2 aria-hidden />
                  Eliminar cuenta
                </DropdownMenuItem>
              )}
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <DialogoDocente
        docente={docente}
        esPropio={esPropio}
        abierto={dialogo === 'editar'}
        onAbiertoCambia={cerrar}
        onGuardado={() => router.refresh()}
      />

      <DialogoConfirmacion
        abierto={dialogo === 'contrasena'}
        onAbiertoCambia={cerrar}
        titulo="¿Generar una contraseña temporal?"
        descripcion={`${primerNombre} dejará de poder entrar con su contraseña actual. Te mostraremos la nueva para que se la envíes.`}
        etiquetaConfirmar="Generar contraseña"
        pendiente={pendiente}
        onConfirmar={restablecer}
      />

      <DialogoConfirmacion
        abierto={dialogo === 'estado'}
        onAbiertoCambia={cerrar}
        titulo={
          docente.activo ? `¿Desactivar a ${docente.nombre}?` : `¿Reactivar a ${docente.nombre}?`
        }
        descripcion={
          docente.activo
            ? 'No podrá entrar a PsySim, y si tiene una sesión abierta se cerrará en su próximo clic. Sus estudiantes, casos y sesiones se conservan.'
            : 'Podrá volver a entrar con su cuenta y retomar su trabajo.'
        }
        etiquetaConfirmar={docente.activo ? 'Desactivar' : 'Reactivar'}
        destructivo={docente.activo}
        pendiente={pendiente}
        onConfirmar={() =>
          ejecutar(
            () => cambiarEstadoDocente({ id: docente.id, activo: !docente.activo }),
            docente.activo ? 'Cuenta desactivada.' : 'Cuenta reactivada.'
          )
        }
      />

      <DialogoConfirmacion
        abierto={dialogo === 'eliminar'}
        onAbiertoCambia={cerrar}
        titulo={`¿Eliminar la cuenta de ${docente.nombre}?`}
        descripcion="Aún no tiene estudiantes, casos ni sesiones. La cuenta se borra por completo y no se puede deshacer."
        etiquetaConfirmar="Eliminar cuenta"
        destructivo
        pendiente={pendiente}
        textoConfirmacion={docente.correo}
        onConfirmar={() =>
          ejecutar(
            () => eliminarDocente({ id: docente.id }),
            'Cuenta eliminada.',
            enFicha ? () => router.push('/admin') : undefined
          )
        }
      />

      <Dialog open={contrasena !== null} onOpenChange={abierto => !abierto && setContrasena(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Nueva contraseña temporal</DialogTitle>
            <DialogDescription>
              Envíasela a {primerNombre}. Al entrar le pediremos cambiarla.
            </DialogDescription>
          </DialogHeader>
          {contrasena && (
            <CredencialesAcceso
              nombre={docente.nombre}
              correo={docente.correo}
              contrasena={contrasena}
            />
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setContrasena(null)}>
              Listo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
