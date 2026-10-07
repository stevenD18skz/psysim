'use client';

import { useEfectosAmbiente } from '@/hooks/use-efectos-ambiente';
import { cn } from '@/lib/utils';

/**
 * Velo emocional: oscurece los bordes de la pantalla cuando el paciente se tensa o se entristece
 * y, con mucha tensión, late como un pulso acelerado. Es CSS sobre el canvas (sin coste para la
 * GPU) y no recibe eventos. Con "reducir movimiento" no late. Ver `efectosDeClima`.
 */
export function VeloEmocional() {
  const { vineta, pulso, tension, pesadumbre } = useEfectosAmbiente();
  // La tensión tiñe los bordes de rojo oscuro; la pesadumbre, de azul gris.
  const tinte = tension >= pesadumbre ? '40 8 12' : '12 20 36';

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 z-[5] transition-opacity duration-[3000ms] ease-in-out"
      style={{ opacity: vineta }}
    >
      {/* El latido va en una capa interior: la animación de opacidad no pisa la intensidad. */}
      <div
        className={cn(
          'absolute inset-0 transition-[background] duration-[3000ms]',
          pulso && 'motion-safe:animate-[latido_1.1s_ease-in-out_infinite]'
        )}
        style={{
          background: `radial-gradient(ellipse at center, transparent 42%, rgb(${tinte} / 0.6) 76%, rgb(${tinte} / 0.9) 100%)`,
        }}
      />
    </div>
  );
}
