import { type Ref } from 'react';

import { cn } from '@/lib/utils';

interface SpeechBubbleProps {
  texto: string;
  visible: boolean;
  /** La posición (left/top en píxeles) la actualiza el bucle de render del visor. */
  ref?: Ref<HTMLDivElement>;
}

/** Globo de diálogo que sigue la cabeza del NPC (proyección 3D → 2D). */
export function SpeechBubble({ texto, visible, ref }: SpeechBubbleProps) {
  return (
    <div
      ref={ref}
      role="status"
      aria-live="polite"
      className={cn(
        'pointer-events-none absolute top-0 left-0 z-10 -translate-x-1/2 -translate-y-full rounded-xl border bg-card px-3 py-1.5 font-heading text-base font-semibold whitespace-nowrap shadow-md transition-opacity duration-250',
        visible ? 'opacity-100' : 'opacity-0'
      )}
    >
      {texto}
      {/* Pico del globo */}
      <span
        aria-hidden
        className="absolute -bottom-1.5 left-1/2 size-3 -translate-x-1/2 rotate-45 border-r border-b bg-card"
      />
    </div>
  );
}
