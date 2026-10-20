'use client';

import { useEfectosAmbiente } from '@/hooks/use-efectos-ambiente';
import { cn } from '@/lib/utils';

/**
 * Velo emocional: atenúa los bordes de la pantalla cuando el paciente se tensa o se entristece,
 * como la luz de un cuarto que cambia. Es sutil a propósito y nunca rojo ni con latido: refleja el
 * ánimo del paciente, no mide al estudiante. Con mucha tensión respira lentamente (no con
 * «reducir movimiento»). Es CSS sobre el canvas y no recibe eventos. Ver `efectosDeClima`.
 */
export function VeloEmocional() {
  const { vineta, pulso, tension, pesadumbre } = useEfectosAmbiente();
  // La tensión oscurece hacia el nogal; la pesadumbre, hacia un gris azulado.
  const tinte = tension >= pesadumbre ? '29 20 14' : '18 24 34';

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 z-[5] transition-opacity duration-[3000ms] ease-in-out"
      style={{ opacity: vineta * 0.8 }}
    >
      {/* La respiración va en una capa interior: la animación de opacidad no pisa la intensidad. */}
      <div
        className={cn(
          'absolute inset-0 transition-[background] duration-[3000ms]',
          pulso && 'motion-safe:animate-[respiracion_6s_ease-in-out_infinite]'
        )}
        style={{
          background: `radial-gradient(ellipse at center, transparent 50%, rgb(${tinte} / 0.35) 80%, rgb(${tinte} / 0.6) 100%)`,
        }}
      />
    </div>
  );
}
