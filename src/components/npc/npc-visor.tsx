'use client';

import { type Ref, use, useImperativeHandle, useMemo, useRef } from 'react';

import { NpcPanel } from '@/components/npc/npc-panel';
import { NpcViewer, type RefsOverlay } from '@/components/npc/npc-viewer';
import { SpeechBubble } from '@/components/npc/speech-bubble';
import { useNpcController } from '@/hooks/use-npc-controller';
import { type AccionNpc, metaAccion } from '@/lib/npc/acciones';
import { cargarGlb } from '@/lib/npc/cargar-glb';
import { type ModeloNpc, urlModeloNpc } from '@/lib/npc/catalogo';
import { cn } from '@/lib/utils';

/** API imperativa para controlar el NPC desde fuera (p. ej. desde la lógica de un juego). */
export interface NpcApi {
  /** Reproduce una acción con crossfade. Las que no se repiten vuelven a reposo al terminar. */
  play: (accion: AccionNpc) => void;
  /** Muestra un globo de diálogo sobre la cabeza durante unos segundos. */
  say: (texto: string) => void;
  /** Velocidad de reproducción (0,25× a 2×). */
  setSpeed: (velocidad: number) => void;
}

export interface NpcVisorProps {
  /** NPC del catálogo que se muestra (GLB con esqueleto y animaciones). */
  modelo: ModeloNpc;
  apiRef?: Ref<NpcApi>;
  /** Se llama al terminar una acción que no se repite (saludar, saltar, asentir…). */
  onActionEnd?: (accion: AccionNpc) => void;
  /** Muestra el panel de controles del laboratorio. */
  mostrarPanel?: boolean;
  /** Activa los atajos de teclado. */
  atajos?: boolean;
  className?: string;
}

/**
 * Visor de un NPC en GLB: escena 3D, HUD con el progreso del clip, globo de diálogo y (opcional)
 * panel de controles. Suspende mientras se descarga el GLB, así que debe ir dentro de
 * `<Suspense>`; se importa con `next/dynamic` y `ssr: false` (ver `/laboratorio/npc`).
 * Para cambiar de NPC, móntalo con otra `key`: cada NPC tiene su propio controlador.
 */
export default function NpcVisor({
  modelo,
  apiRef,
  onActionEnd,
  mostrarPanel = true,
  atajos = true,
  className,
}: NpcVisorProps) {
  const glb = use(cargarGlb(urlModeloNpc(modelo)));
  const npc = useNpcController(glb, { onActionEnd, atajos });
  const { controlador, estado } = npc;

  useImperativeHandle(
    apiRef,
    () => ({ play: controlador.play, say: controlador.say, setSpeed: controlador.setSpeed }),
    [controlador]
  );

  const globo = useRef<HTMLDivElement>(null);
  const barra = useRef<HTMLSpanElement>(null);
  const meta = useRef<HTMLSpanElement>(null);
  const overlay = useMemo<RefsOverlay>(() => ({ globo, barra, meta }), []);

  const nombreAccion = estado.accion ? metaAccion(estado.accion).etiqueta : 'Pose manual';

  return (
    <div
      className={cn(
        'grid min-h-0 grid-rows-[62vh_auto] lg:grid-cols-[minmax(0,1fr)_340px] lg:grid-rows-1',
        className
      )}
    >
      <div className="relative min-h-0 overflow-hidden">
        <NpcViewer npc={npc} overlay={overlay} />

        <SpeechBubble ref={globo} texto={estado.globo.texto} visible={estado.globo.visible} />

        {/* HUD: acción actual y progreso del clip */}
        <div className="pointer-events-none absolute top-4 left-4 w-[min(320px,calc(100%-2rem))] rounded-xl border bg-card/90 px-4 py-3 shadow-sm backdrop-blur">
          <div className="flex items-baseline justify-between gap-2">
            <span className="font-heading text-xl leading-none font-semibold">{nombreAccion}</span>
            <span ref={meta} className="text-[11px] text-muted-foreground tabular-nums" />
          </div>
          <div className="mt-2 h-0.5 bg-border">
            <span ref={barra} className="block h-full w-0 bg-primary" />
          </div>
        </div>

        <p className="pointer-events-none absolute bottom-3 left-4 text-xs text-muted-foreground">
          Arrastra para orbitar · rueda para acercar · clic derecho para desplazar
        </p>
      </div>

      {mostrarPanel && <NpcPanel npc={npc} modelo={modelo} />}
    </div>
  );
}
