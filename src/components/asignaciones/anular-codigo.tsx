'use client';

import { Ban, KeyRound, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, useTransition } from 'react';
import { toast } from 'sonner';

import { BotonCopiarCodigo, ReenviarCodigo } from '@/components/asignaciones/reenviar-codigo';
import { sinPerderElPanel } from '@/components/comun/sin-perder-el-panel';
import { Button } from '@/components/ui/button';
import { anularAsignacion } from '@/lib/asignaciones/actions';

/**
 * Lógica compartida para anular un código pendiente con confirmación accesible y retorno de foco
 * al botón disparador cuando se cancela.
 */
export function useAnularCodigo({ id, codigo }: { id: string; codigo: string }) {
  const router = useRouter();
  const [confirmando, setConfirmando] = useState(false);
  const [anulando, startTransition] = useTransition();
  const botonAnular = useRef<HTMLButtonElement>(null);
  const volverAlBoton = useRef(false);

  useEffect(() => {
    if (!confirmando && volverAlBoton.current) {
      volverAlBoton.current = false;
      botonAnular.current?.focus();
    }
  }, [confirmando]);

  const abrir = () => setConfirmando(true);

  const cancelar = () => {
    volverAlBoton.current = true;
    setConfirmando(false);
  };

  const confirmar = () =>
    startTransition(
      sinPerderElPanel(async () => {
        const resultado = await anularAsignacion({ id });
        if (!resultado.ok) {
          toast.error(resultado.error);
        } else {
          toast.success(`Anulamos el código ${codigo}.`);
        }
        setConfirmando(false);
        router.refresh();
      })
    );

  return { confirmando, anulando, botonAnular, abrir, cancelar, confirmar };
}

/** Franja de confirmación reutilizada al anular desde el inicio o la ficha del estudiante. */
export function ConfirmacionAnularCodigo({
  codigo,
  anulando,
  onConfirmar,
  onCancelar,
  compacto = false,
}: {
  codigo: string;
  anulando: boolean;
  onConfirmar: () => void;
  onCancelar: () => void;
  compacto?: boolean;
}) {
  return (
    <>
      <span
        role="alert"
        className={
          compacto ? 'text-xs font-medium text-foreground' : 'text-sm text-muted-foreground'
        }
      >
        ¿Anular <code className="font-mono font-semibold">{codigo}</code>? Dejará de funcionar.
      </span>
      <div className="flex shrink-0 items-center gap-1.5">
        <Button
          type="button"
          size="sm"
          variant="destructive"
          onClick={onConfirmar}
          disabled={anulando}
          // El botón que abrió la confirmación desaparece: el foco pasa a la acción.
          autoFocus
        >
          {anulando && <Loader2 className="animate-spin" aria-hidden />}
          Sí, anular
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onCancelar} disabled={anulando}>
          No
        </Button>
      </div>
    </>
  );
}

/**
 * Barra inferior de un código pendiente en el tablero de inicio: muestra el código con copia de
 * un clic, reenvío por canales y anulación inmediata con confirmación inline.
 */
export function BarraCodigoPendiente({
  id,
  codigo,
  expiraEn,
  caso,
  estudiante,
}: {
  id: string;
  codigo: string;
  expiraEn: string;
  caso: string;
  estudiante: { nombre: string; correo?: string | null } | null;
}) {
  const { confirmando, anulando, botonAnular, abrir, cancelar, confirmar } = useAnularCodigo({
    id,
    codigo,
  });

  if (confirmando) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2">
        <ConfirmacionAnularCodigo
          codigo={codigo}
          anulando={anulando}
          onConfirmar={confirmar}
          onCancelar={cancelar}
          compacto
        />
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/75 bg-muted/35 px-3 py-1.5">
      <div className="flex min-w-0 items-center gap-2">
        <KeyRound className="size-3.5 shrink-0 text-laton" aria-hidden />
        <code className="font-mono text-sm font-semibold tracking-[0.06em] whitespace-nowrap text-foreground select-all">
          {codigo}
        </code>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <BotonCopiarCodigo codigo={codigo} />
        {estudiante && (
          <ReenviarCodigo codigo={codigo} expiraEn={expiraEn} caso={caso} estudiante={estudiante} />
        )}
        <Button
          ref={botonAnular}
          type="button"
          variant="ghost"
          size="icon"
          className="size-8 shrink-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
          title="Anular código"
          aria-label={`Anular el código ${codigo}`}
          onClick={abrir}
        >
          <Ban className="size-3.5" aria-hidden />
        </Button>
      </div>
    </div>
  );
}
