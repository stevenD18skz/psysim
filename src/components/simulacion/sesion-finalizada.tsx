'use client';

import { CheckCircle2, Clock, MessageSquare, Timer } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';

import { Button } from '@/components/ui/button';
import { formatearDuracion, type ResumenSesion } from '@/lib/conversacion/resumen';
import { useAppStore } from '@/store/app-store-provider';
import { type SesionActiva } from '@/types';

/**
 * Cierre de la sesión (versión mínima del Sprint 3). El estudiante pasa a su práctica, donde
 * relee la conversación y, cuando el docente la publique, ve la retroalimentación. El Sprint 4
 * (HU-21) añade las métricas persistidas.
 */
export function SesionFinalizada({
  resumen,
  sesion,
}: {
  resumen: ResumenSesion;
  sesion: SesionActiva;
}) {
  const router = useRouter();
  const limpiarSesion = useAppStore(state => state.sesion.limpiar);
  const [navegando, startTransition] = useTransition();

  const verPractica = () =>
    startTransition(() => {
      limpiarSesion();
      router.push(`/practicas/${sesion.id}`);
    });

  const indicadores = [
    { icono: Clock, etiqueta: 'Duración', valor: formatearDuracion(resumen.duracionSegundos) },
    { icono: MessageSquare, etiqueta: 'Intervenciones', valor: String(resumen.intervenciones) },
    {
      icono: Timer,
      etiqueta: 'Respuesta media del paciente',
      valor:
        resumen.latenciaPromedioMs === null
          ? '—'
          : `${(resumen.latenciaPromedioMs / 1000).toLocaleString('es-CO', { maximumFractionDigits: 1 })} s`,
    },
  ];

  return (
    <div className="absolute inset-0 z-40 flex animate-in items-center justify-center bg-background/85 p-6 backdrop-blur-sm fade-in-0">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="sesion-finalizada-titulo"
        className="flex w-full max-w-md flex-col items-center gap-6 rounded-3xl border bg-card p-8 text-center shadow-2xl"
      >
        <span className="flex size-14 items-center justify-center rounded-2xl bg-sage text-sage-foreground">
          <CheckCircle2 className="size-7" aria-hidden />
        </span>
        <div className="flex flex-col gap-1">
          <h2 id="sesion-finalizada-titulo" className="text-2xl font-semibold tracking-tight">
            Sesión finalizada
          </h2>
          <p className="text-sm text-muted-foreground">
            {sesion.estudiante.nombre} · {sesion.escenario.codigo} {sesion.escenario.titulo}
          </p>
          <p className="mt-2 text-sm">
            Tu docente revisará la conversación y te dejará su retroalimentación.
          </p>
        </div>
        <dl className="grid w-full grid-cols-3 gap-3">
          {indicadores.map(({ icono: Icono, etiqueta, valor }) => (
            <div
              key={etiqueta}
              className="flex flex-col items-center gap-1 rounded-xl bg-muted/60 p-3"
            >
              <Icono className="size-4 text-primary" aria-hidden />
              <dd className="font-heading text-xl font-semibold tabular-nums">{valor}</dd>
              <dt className="text-[11px] leading-tight text-muted-foreground">{etiqueta}</dt>
            </div>
          ))}
        </dl>
        <Button size="lg" onClick={verPractica} disabled={navegando} autoFocus>
          Ver mi práctica
        </Button>
      </section>
    </div>
  );
}
