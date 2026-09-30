'use client';

import { Clock, GraduationCap, UserRound } from 'lucide-react';
import { useEffect, useState } from 'react';

import { type SesionActiva } from '@/types';

function formatearDuracion(segundos: number): string {
  const s = Math.max(0, Math.floor(segundos));
  const horas = Math.floor(s / 3600);
  const minutos = Math.floor((s % 3600) / 60);
  const resto = s % 60;
  const mm = String(minutos).padStart(2, '0');
  const ss = String(resto).padStart(2, '0');
  return horas > 0 ? `${horas}:${mm}:${ss}` : `${mm}:${ss}`;
}

/** Cronómetro de la sesión. Aislado para que el tic de cada segundo no re-renderice el resto. */
function Cronometro({ inicio }: { inicio: string }) {
  const [ahora, setAhora] = useState<number | null>(null);

  useEffect(() => {
    const actualizar = () => setAhora(Date.now());
    actualizar();
    const intervalo = setInterval(actualizar, 1000);
    return () => clearInterval(intervalo);
  }, []);

  if (ahora === null) return <span className="tabular-nums">--:--</span>;
  return (
    <time className="tabular-nums" aria-label="Tiempo transcurrido de la sesión">
      {formatearDuracion((ahora - new Date(inicio).getTime()) / 1000)}
    </time>
  );
}

/** Tarjeta superpuesta con los datos de la sesión en curso. */
export function HudSesion({ sesion }: { sesion: SesionActiva }) {
  return (
    <aside
      aria-label="Datos de la sesión"
      className="pointer-events-auto flex max-w-xs flex-col gap-2 rounded-2xl border bg-card/90 p-4 text-sm shadow-lg backdrop-blur"
    >
      <div className="flex items-center gap-2">
        <span className="rounded-md bg-secondary px-2 py-0.5 font-mono text-xs font-medium">
          {sesion.escenario.codigo}
        </span>
        <h1 className="truncate font-heading text-base font-semibold">{sesion.escenario.titulo}</h1>
      </div>
      <dl className="flex flex-col gap-1.5 text-muted-foreground">
        <div className="flex items-center gap-2">
          <dt>
            <UserRound className="size-4" aria-hidden />
            <span className="sr-only">Paciente</span>
          </dt>
          <dd>
            <span className="text-foreground">{sesion.npc.nombre}</span>, {sesion.npc.edad} años
          </dd>
        </div>
        <div className="flex items-center gap-2">
          <dt>
            <GraduationCap className="size-4" aria-hidden />
            <span className="sr-only">Estudiante</span>
          </dt>
          <dd className="truncate">
            <span className="text-foreground">{sesion.estudiante.nombre}</span> ·{' '}
            {sesion.estudiante.codigo}
          </dd>
        </div>
        <div className="flex items-center gap-2">
          <dt>
            <Clock className="size-4" aria-hidden />
            <span className="sr-only">Duración</span>
          </dt>
          <dd>
            <Cronometro inicio={sesion.inicio} />
          </dd>
        </div>
      </dl>
    </aside>
  );
}
