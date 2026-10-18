'use client';

import { Ban, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';

import { ReenviarCodigo } from '@/components/asignaciones/reenviar-codigo';
import { InsigniaEstado } from '@/components/sesiones/insignia-estado';
import { Button } from '@/components/ui/button';
import { anularAsignacion } from '@/lib/asignaciones/actions';
import { formatearFechaHora } from '@/lib/estudiantes/estudiantes';
import { type EstadoVisible } from '@/lib/sesiones/estados';
import { type Asignacion, type EstadoAsignacion } from '@/types';

const ESTADOS: Record<EstadoAsignacion, EstadoVisible> = {
  pendiente: { texto: 'Sin usar', tono: 'pendiente' },
  usada: { texto: 'Usado', tono: 'listo' },
  anulada: { texto: 'Anulado', tono: 'neutro' },
  vencida: { texto: 'Vencido', tono: 'neutro' },
};

/**
 * Códigos de acceso de un estudiante: los que aún no se han usado se pueden compartir de nuevo
 * (con el mismo mensaje que al generarlos) o anular.
 */
export function ListaCodigos({
  asignaciones,
  estudiante,
}: {
  asignaciones: Asignacion[];
  estudiante: { nombre: string; correo: string | null };
}) {
  if (asignaciones.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-input/50 p-6 text-center text-sm text-muted-foreground">
        Aún no le has asignado prácticas.
      </p>
    );
  }

  return (
    <ul className="flex flex-col divide-y overflow-hidden rounded-xl border bg-card">
      {asignaciones.map(asignacion => (
        <FilaCodigo key={asignacion.id} asignacion={asignacion} estudiante={estudiante} />
      ))}
    </ul>
  );
}

function FilaCodigo({
  asignacion,
  estudiante,
}: {
  asignacion: Asignacion;
  estudiante: { nombre: string; correo: string | null };
}) {
  const router = useRouter();
  const [confirmando, setConfirmando] = useState(false);
  const [anulando, startTransition] = useTransition();
  const pendiente = asignacion.estado === 'pendiente';

  const anular = () =>
    startTransition(async () => {
      const resultado = await anularAsignacion({ id: asignacion.id });
      if (!resultado.ok) {
        toast.error(resultado.error);
      } else {
        toast.success(`Anulamos el código ${asignacion.codigo}.`);
      }
      setConfirmando(false);
      router.refresh();
    });

  return (
    <li className="flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center">
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-base font-semibold tracking-wider">
            {asignacion.codigo}
          </span>
          <InsigniaEstado estado={ESTADOS[asignacion.estado]} />
        </div>
        <p className="text-sm text-muted-foreground">
          {asignacion.escenario.titulo} · generado el {formatearFechaHora(asignacion.creadoEn)}
          {pendiente && <> · vence el {formatearFechaHora(asignacion.expiraEn)}</>}
        </p>
      </div>
      {pendiente && (
        <div className="flex flex-wrap items-center gap-2">
          {confirmando ? (
            <>
              <span className="text-sm text-muted-foreground">
                ¿Anular el código {asignacion.codigo}? Dejará de funcionar.
              </span>
              <Button size="sm" variant="destructive" onClick={anular} disabled={anulando}>
                {anulando && <Loader2 className="animate-spin" aria-hidden />}
                Sí, anular
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setConfirmando(false)}
                disabled={anulando}
              >
                No
              </Button>
            </>
          ) : (
            <>
              <ReenviarCodigo
                codigo={asignacion.codigo}
                expiraEn={asignacion.expiraEn}
                caso={asignacion.escenario.titulo}
                estudiante={estudiante}
              />
              <Button size="sm" variant="ghost" onClick={() => setConfirmando(true)}>
                <Ban aria-hidden />
                Anular
              </Button>
            </>
          )}
        </div>
      )}
    </li>
  );
}
