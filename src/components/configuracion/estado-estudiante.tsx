'use client';

import { BadgeCheck, Info, UserPlus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  contarSesiones,
  formatearDia,
  formatearTiempoPractica,
  normalizarTexto,
} from '@/lib/estudiantes/estudiantes';
import { type EstudianteRegistrado } from '@/types';

interface EstadoEstudianteProps {
  /** Estudiante registrado con el código escrito, si existe. */
  registrado: EstudianteRegistrado | undefined;
  nombre: string;
  /** El código escrito es válido (si no, no se muestra nada). */
  codigoValido: boolean;
  onUsarNombre: (nombre: string) => void;
}

/**
 * Dice qué pasará con el estudiante al iniciar: si ya está registrado (con su historial), si el
 * nombre escrito corregirá el registrado o si quedará registrado como nuevo.
 */
export function EstadoEstudiante({
  registrado,
  nombre,
  codigoValido,
  onUsarNombre,
}: EstadoEstudianteProps) {
  if (!codigoValido) return null;

  if (!registrado) {
    return (
      <p
        aria-live="polite"
        className="flex items-center gap-2 text-sm text-muted-foreground sm:col-span-2"
      >
        <UserPlus className="size-4 shrink-0" aria-hidden />
        Estudiante nuevo: quedará registrado al iniciar la sesión.
      </p>
    );
  }

  const { metricas } = registrado;
  const mismoNombre = normalizarTexto(nombre) === normalizarTexto(registrado.nombre);

  if (!mismoNombre) {
    return (
      <div
        aria-live="polite"
        className="flex flex-col gap-2 rounded-xl border border-dashed bg-muted/40 p-3 text-sm sm:col-span-2 sm:flex-row sm:items-center"
      >
        <Info className="size-4 shrink-0 text-primary" aria-hidden />
        <p className="flex-1">
          Este código ya está registrado a nombre de{' '}
          <span className="font-medium">{registrado.nombre}</span>.
          {nombre.trim() && ' Si inicias así, se corregirá el nombre registrado.'}
        </p>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => onUsarNombre(registrado.nombre)}
        >
          Usar «{registrado.nombre}»
        </Button>
      </div>
    );
  }

  return (
    <div
      aria-live="polite"
      className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl bg-success/10 px-3 py-2.5 text-sm sm:col-span-2"
    >
      <span className="flex items-center gap-1.5 font-medium">
        <BadgeCheck className="size-4 text-success" aria-hidden />
        Estudiante registrado
      </span>
      <span className="text-muted-foreground">{contarSesiones(metricas.sesiones)}</span>
      {metricas.segundosPractica > 0 && (
        <span className="text-muted-foreground">
          {formatearTiempoPractica(metricas.segundosPractica)} de práctica
        </span>
      )}
      {metricas.ultimaSesion && (
        <span className="text-muted-foreground">Última: {formatearDia(metricas.ultimaSesion)}</span>
      )}
    </div>
  );
}
