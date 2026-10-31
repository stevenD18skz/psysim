'use client';

import { Clock, UserRound } from 'lucide-react';
import { useEffect, useState } from 'react';

import { CodigoCaso } from '@/components/casos/codigo-caso';
import { ETIQUETA_ESTADO_HUD } from '@/lib/conversacion/estados-npc';
import { formatearDuracion } from '@/lib/conversacion/resumen';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/store/app-store-provider';
import { type SesionActiva } from '@/types';

/**
 * Cronómetro de la sesión. Aislado para que el tic de cada segundo no re-renderice el resto.
 * Al finalizar la sesión se detiene y muestra la duración calculada por la base de datos.
 */
function Cronometro({
  inicio,
  comenzada,
  duracionFinal,
}: {
  inicio: string;
  comenzada: boolean;
  duracionFinal?: number;
}) {
  const [ahora, setAhora] = useState<number | null>(null);
  const detenido = duracionFinal !== undefined || !comenzada;

  useEffect(() => {
    if (detenido) return;
    const actualizar = () => setAhora(Date.now());
    const primero = requestAnimationFrame(actualizar);
    const intervalo = setInterval(actualizar, 1000);
    return () => {
      cancelAnimationFrame(primero);
      clearInterval(intervalo);
    };
  }, [detenido]);

  // HU-23: el tiempo empieza cuando el estudiante confirma las instrucciones del caso.
  if (!comenzada) return <span className="tabular-nums">Sin iniciar</span>;
  if (duracionFinal !== undefined) {
    return (
      <time className="tabular-nums" aria-label="Duración total de la práctica">
        {formatearDuracion(duracionFinal)}
      </time>
    );
  }
  if (ahora === null) return <span className="tabular-nums">--:--</span>;
  return (
    <time className="tabular-nums" aria-label="Tiempo de práctica">
      {formatearDuracion((ahora - new Date(inicio).getTime()) / 1000)}
    </time>
  );
}

/**
 * HU-17 · T02 — Estado del paciente en palabras («Escuchando», «Pensando…»). Aislado para que los
 * cambios de estado no re-rendericen el resto del HUD. `role="status"` lo anuncia a los lectores
 * de pantalla sin interrumpir.
 */
function EstadoPaciente() {
  const estado = useAppStore(state => state.npc.estado);
  return (
    <span role="status" data-testid="estado-npc-hud" className="flex items-center gap-1.5">
      <span
        aria-hidden
        className={cn(
          'size-2 rounded-full',
          estado === 'error_comunicacion' ? 'bg-destructive' : 'bg-salvia',
          estado === 'procesando' && 'motion-safe:animate-pulse'
        )}
      />
      {ETIQUETA_ESTADO_HUD[estado]}
    </span>
  );
}

/**
 * Tarjeta superpuesta con los datos de la práctica: el caso, el paciente y el tiempo de práctica
 * (pequeño, sin protagonismo). Mientras se conversa se reduce a una píldora para que el paciente
 * sea el centro.
 */
export function HudSesion({
  sesion,
  duracionFinalSegundos,
  compacto = false,
}: {
  sesion: SesionActiva;
  duracionFinalSegundos?: number;
  compacto?: boolean;
}) {
  const cronometro = (
    <Cronometro
      inicio={sesion.inicio}
      comenzada={sesion.comenzada}
      duracionFinal={duracionFinalSegundos}
    />
  );

  if (compacto) {
    return (
      <aside
        aria-label="Datos de la práctica"
        className="pointer-events-auto flex items-center gap-2 rounded-full border bg-card/90 py-1.5 pr-3.5 pl-3 text-sm shadow-md backdrop-blur"
      >
        <CodigoCaso
          codigo={sesion.escenario.codigo}
          className="font-mono text-xs font-medium text-muted-foreground"
        />
        <h1 className="max-w-48 truncate font-semibold" title={sesion.escenario.titulo}>
          {sesion.escenario.titulo}
        </h1>
        <span aria-hidden className="text-muted-foreground">
          ·
        </span>
        <span className="text-xs text-muted-foreground">{cronometro}</span>
      </aside>
    );
  }

  return (
    <aside
      aria-label="Datos de la práctica"
      className="pointer-events-auto flex max-w-xs flex-col gap-2 rounded-2xl border bg-card/90 p-4 text-sm shadow-lg backdrop-blur"
    >
      <div className="flex items-baseline gap-2">
        <CodigoCaso
          codigo={sesion.escenario.codigo}
          className="font-mono text-xs font-medium text-muted-foreground"
        />
        <h1
          className="truncate text-base font-bold tracking-[-0.01em]"
          title={sesion.escenario.titulo}
        >
          {sesion.escenario.titulo}
        </h1>
      </div>
      <dl className="flex flex-col gap-1.5 text-muted-foreground">
        <div className="flex items-center gap-2">
          <dt>
            <UserRound className="size-4" aria-hidden />
            <span className="sr-only">Paciente</span>
          </dt>
          <dd>
            <span className="font-medium text-terracota">{sesion.npc.nombre}</span>,{' '}
            {sesion.npc.edad} años
          </dd>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <dt className="sr-only">Estado del paciente</dt>
          <dd className="pl-6">
            <EstadoPaciente />
          </dd>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <dt>
            <Clock className="size-3.5" aria-hidden />
            <span className="sr-only">Tiempo de práctica</span>
          </dt>
          <dd>{cronometro}</dd>
        </div>
      </dl>
    </aside>
  );
}
