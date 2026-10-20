'use client';

import { useProgress } from '@react-three/drei';

import { cn } from '@/lib/utils';

interface LoadingScreenProps {
  visible: boolean;
  titulo: string;
  competencia: string;
}

const CONSEJOS = [
  'Busca un lugar tranquilo. Si quieres, usa auriculares: el consultorio tiene sonido.',
  'Caminas con W A S D o las flechas, miras con el ratón y hablas con la tecla E.',
  'El paciente es una IA: escribe como lo harías en consulta.',
];

/**
 * HU-09 · T04 — Pantalla de carga: el umbral del consultorio. Sobre el nogal, el vano de la puerta
 * se va llenando con la luz del cuarto a medida que cargan los modelos (con «reducir movimiento»
 * la luz aparece sin transición).
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
  const luz = determinado ? Math.max(0.15, porcentaje / 100) : 0.45;

  return (
    <div
      aria-hidden={!visible}
      data-testid="pantalla-carga"
      data-visible={visible}
      className={cn(
        'absolute inset-0 z-30 flex flex-col items-center justify-center gap-8 vetas-nogal px-6 text-center text-sidebar-foreground transition-opacity duration-700',
        visible ? 'opacity-100' : 'pointer-events-none opacity-0'
      )}
    >
      {/* El vano de la puerta: la luz del consultorio crece con la carga. */}
      <span
        aria-hidden
        className="relative h-36 w-28 overflow-hidden rounded-t-full border-[3px] border-laton bg-[#2a190f]"
      >
        <span
          className="absolute inset-0 bg-[radial-gradient(70%_60%_at_50%_70%,rgb(255_214_150/0.85),rgb(201_154_107/0.5)_55%,transparent_80%)] motion-safe:transition-opacity motion-safe:duration-700"
          style={{ opacity: luz }}
        />
        <span className="absolute inset-x-3 bottom-3 h-7 rounded-t-xl bg-salvia/90" />
        <span className="absolute bottom-9 left-1/2 size-5 -translate-x-1/2 rounded-full bg-terracota/90" />
      </span>

      <div className="flex flex-col gap-2">
        <p className="text-sm text-sidebar-muted">Preparando el consultorio</p>
        <h2 className="text-[1.75rem] leading-tight font-bold tracking-[-0.02em]">{titulo}</h2>
        <p className="text-sm text-sidebar-foreground/80">
          Competencia que practicarás:{' '}
          <span className="font-semibold text-sidebar-foreground">{competencia}</span>
        </p>
      </div>

      <div className="flex w-full max-w-xs flex-col gap-2">
        <div
          className="h-1.5 overflow-hidden rounded-full bg-lino/15"
          role="progressbar"
          aria-label="Cargando el consultorio"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={determinado ? porcentaje : undefined}
        >
          {determinado ? (
            <div
              className="h-full rounded-full bg-laton transition-[width] duration-300"
              style={{ width: `${porcentaje}%` }}
            />
          ) : (
            <div className="h-full w-1/3 rounded-full bg-laton motion-safe:animate-[carga_1.4s_ease-in-out_infinite]" />
          )}
        </div>
        {/* El porcentaje no se anuncia: el lector de pantalla oye solo el hito de la región de abajo. */}
        <p className="text-xs text-sidebar-muted" aria-hidden>
          {determinado && active ? `Cargando el consultorio… ${porcentaje} %` : 'Un momento…'}
        </p>
        <p role="status" className="sr-only">
          {visible ? `Preparando el consultorio de «${titulo}»…` : ''}
        </p>
      </div>

      <ul className="flex max-w-md flex-col gap-1.5 text-sm text-sidebar-foreground/80">
        {CONSEJOS.map(consejo => (
          <li key={consejo}>{consejo}</li>
        ))}
      </ul>
    </div>
  );
}
