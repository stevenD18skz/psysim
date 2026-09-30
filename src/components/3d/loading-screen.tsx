'use client';

import { useProgress } from '@react-three/drei';
import { Armchair } from 'lucide-react';

import { cn } from '@/lib/utils';

interface LoadingScreenProps {
  visible: boolean;
  titulo: string;
  competencia: string;
}

/**
 * HU-09 · T04 — Pantalla de carga del escenario.
 *
 * `useProgress` se conecta al `DefaultLoadingManager` de Three.js y expone el porcentaje de
 * los assets cargados, sin atar estados de React a callbacks manuales de cada modelo.
 */
export function LoadingScreen({ visible, titulo, competencia }: LoadingScreenProps) {
  const { progress, active } = useProgress();
  // Sin modelos que descargar (escena procedural) el progreso se queda en 0: se muestra una
  // barra indeterminada en lugar de un 0 % engañoso.
  const determinado = active || progress > 0;
  const porcentaje = Math.round(progress);

  return (
    <div
      role="status"
      aria-live="polite"
      aria-hidden={!visible}
      data-testid="pantalla-carga"
      data-visible={visible}
      className={cn(
        'absolute inset-0 z-30 flex flex-col items-center justify-center gap-6 bg-background px-6 text-center transition-opacity duration-700',
        visible ? 'opacity-100' : 'pointer-events-none opacity-0'
      )}
    >
      <span className="flex size-16 animate-pulse items-center justify-center rounded-2xl bg-accent text-accent-foreground">
        <Armchair className="size-8" aria-hidden />
      </span>
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium tracking-wide text-primary uppercase">
          Preparando el consultorio
        </p>
        <h2 className="text-2xl font-semibold tracking-tight">{titulo}</h2>
      </div>

      <div className="flex w-full max-w-xs flex-col gap-2">
        <div
          className="h-2 overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-label="Progreso de carga del escenario"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={determinado ? porcentaje : undefined}
        >
          {determinado ? (
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-300"
              style={{ width: `${porcentaje}%` }}
            />
          ) : (
            <div className="h-full w-1/3 animate-[carga_1.4s_ease-in-out_infinite] rounded-full bg-primary" />
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          {determinado && active
            ? `Cargando modelos 3D… ${porcentaje} %`
            : 'Un momento, estamos acomodando todo para la sesión.'}
        </p>
      </div>

      <p className="max-w-sm text-sm text-muted-foreground">
        Competencia a practicar: <span className="font-medium text-foreground">{competencia}</span>
      </p>
    </div>
  );
}
