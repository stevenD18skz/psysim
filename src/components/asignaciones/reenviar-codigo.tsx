'use client';

import { Check, Copy } from 'lucide-react';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { toast } from 'sonner';

import { BotonCompartir } from '@/components/asignaciones/boton-compartir';
import { mensajeParaEstudiante } from '@/components/asignaciones/codigo-generado';
import { Button } from '@/components/ui/button';
import { rutaUnirse } from '@/lib/asignaciones/codigo';

const sinSuscripcion = () => () => {};

/**
 * Vuelve a enviar un código que aún no se ha usado (desde la bandeja de inicio o la ficha del
 * estudiante), con el mismo mensaje que al generarlo.
 */
export function ReenviarCodigo({
  codigo,
  expiraEn,
  caso,
  estudiante,
  size = 'sm',
}: {
  codigo: string;
  expiraEn: string;
  caso: string;
  estudiante: { nombre: string; correo?: string | null };
  size?: 'default' | 'sm';
}) {
  const origen = useSyncExternalStore(
    sinSuscripcion,
    () => window.location.origin,
    () => ''
  );
  const enlace = `${origen}${rutaUnirse(codigo)}`;
  const mensaje = mensajeParaEstudiante({ codigo, expiraEn, caso, estudiante }, enlace);

  return (
    <BotonCompartir
      etiqueta="Reenviar"
      size={size}
      asunto={`Tu práctica en PsySim: ${caso}`}
      mensaje={mensaje}
      textoCopiable={mensaje}
      correo={estudiante.correo}
    />
  );
}

/** Botón compacto de un clic para copiar solo el código de acceso desde la bandeja de inicio. */
export function BotonCopiarCodigo({ codigo }: { codigo: string }) {
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    if (!copiado) return;
    const temporizador = setTimeout(() => setCopiado(false), 2000);
    return () => clearTimeout(temporizador);
  }, [copiado]);

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(codigo);
      setCopiado(true);
      toast.success('Código copiado.');
    } catch {
      toast.error('No pudimos copiar el código. Selecciónalo y cópialo a mano.');
    }
  };

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="size-8 shrink-0"
      title={copiado ? 'Código copiado' : 'Copiar código'}
      aria-label={`Copiar código ${codigo}`}
      onClick={() => void copiar()}
    >
      {copiado ? (
        <Check className="size-3.5 text-salvia-oscuro" aria-hidden />
      ) : (
        <Copy className="size-3.5 text-muted-foreground" aria-hidden />
      )}
    </Button>
  );
}
