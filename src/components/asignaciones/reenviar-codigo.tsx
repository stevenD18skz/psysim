'use client';

import { useSyncExternalStore } from 'react';

import { BotonCompartir } from '@/components/asignaciones/boton-compartir';
import { mensajeParaEstudiante } from '@/components/asignaciones/codigo-generado';
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

  return (
    <BotonCompartir
      etiqueta="Reenviar"
      size={size}
      asunto={`Tu práctica en PsySim: ${caso}`}
      mensaje={mensajeParaEstudiante({ codigo, expiraEn, caso, estudiante }, enlace)}
      correo={estudiante.correo}
    />
  );
}
