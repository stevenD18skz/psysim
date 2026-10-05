'use client';

import {
  ClipboardCheck,
  GraduationCap,
  Armchair,
  Loader2,
  MessageSquareText,
  Target,
} from 'lucide-react';
import { useRef, useTransition } from 'react';
import { toast } from 'sonner';

import { AvatarPaciente } from '@/components/pacientes/avatar-paciente';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { CONSULTORIOS } from '@/lib/casos/opciones';
import { comenzarSesion } from '@/lib/escenarios/actions';
import {
  ETIQUETA_CATEGORIA,
  ETIQUETA_DIFICULTAD,
  NIVEL_DIFICULTAD,
} from '@/lib/escenarios/etiquetas';
import { avatarDeEscena } from '@/lib/pacientes/avatar';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/store/app-store-provider';
import { type SesionActiva } from '@/types';

/** Pasos de la práctica que el estudiante debe conocer antes de empezar. */
const DESARROLLO = [
  'Recorre el consultorio con W A S D (o las flechas) y mira con el ratón.',
  'Acércate al paciente y presiona E para iniciar la conversación.',
  'Escribe tus intervenciones como lo harías en una entrevista real; el paciente responde según su caso.',
  'El tiempo de la sesión empieza a contar cuando confirmes estas instrucciones.',
  'La conversación queda registrada para la evaluación de tu docente.',
];

/**
 * HU-23 — Instrucciones del caso clínico. Aparece cuando el consultorio ya cargó (se ve al fondo,
 * pero bloqueado) y antes de cualquier interacción: el estudiante lee el caso, la competencia a
 * evaluar y verifica sus datos. Al confirmar, la base de datos marca el inicio real de la sesión.
 *
 * Es un modal obligatorio: no se cierra con Escape ni haciendo clic fuera.
 */
export function InstruccionesCaso({ sesion }: { sesion: SesionActiva }) {
  const comenzarEnStore = useAppStore(state => state.sesion.comenzar);
  const [comenzando, startTransition] = useTransition();
  const contenido = useRef<HTMLDivElement>(null);
  const { escenario, npc, estudiante } = sesion;
  const nivel = NIVEL_DIFICULTAD[escenario.dificultad];
  const consultorio = CONSULTORIOS.find(c => c.ruta === escenario.configuracion3d);

  const comenzar = () =>
    startTransition(async () => {
      const resultado = await comenzarSesion({ sesionId: sesion.id });
      if (!resultado.ok) {
        toast.error(resultado.error);
        return;
      }
      comenzarEnStore(resultado.datos.inicio);
    });

  return (
    <Dialog open>
      <DialogContent
        showCloseButton={false}
        onEscapeKeyDown={evento => evento.preventDefault()}
        onInteractOutside={evento => evento.preventDefault()}
        // El foco empieza en el texto (no en un botón) para leer el caso antes de confirmar.
        onOpenAutoFocus={evento => {
          evento.preventDefault();
          contenido.current?.focus();
        }}
        className="flex max-h-[min(90dvh,48rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl"
      >
        <div aria-hidden className="h-1 shrink-0 bg-marca" />

        <DialogHeader className="gap-1 border-b px-6 pt-5 pb-4">
          <p className="text-xs font-semibold tracking-[0.08em] text-primary uppercase">
            Instrucciones del caso
          </p>
          <DialogTitle className="flex flex-wrap items-baseline gap-x-2 text-2xl leading-tight font-semibold">
            <span className="font-mono text-base font-medium text-muted-foreground">
              {escenario.codigo}
            </span>
            {escenario.titulo}
          </DialogTitle>
          <DialogDescription className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span>Caso {ETIQUETA_CATEGORIA[escenario.categoria].toLowerCase()}</span>
            <span aria-hidden>·</span>
            <span className="inline-flex items-center gap-1.5">
              Nivel {ETIQUETA_DIFICULTAD[escenario.dificultad].toLowerCase()}
              <span aria-hidden className="flex gap-0.5">
                {[1, 2, 3].map(n => (
                  <span
                    key={n}
                    className={cn(
                      'h-2.5 w-1.5 rounded-[1px]',
                      n <= nivel ? 'bg-primary' : 'bg-border'
                    )}
                  />
                ))}
              </span>
            </span>
          </DialogDescription>
        </DialogHeader>

        <div
          ref={contenido}
          tabIndex={0}
          aria-label="Contenido de las instrucciones"
          className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-6 py-5 outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-inset"
        >
          <section className="border-l-4 border-primary bg-accent/60 py-3 pr-4 pl-4">
            <h3 className="flex items-center gap-2 font-sans text-xs font-semibold tracking-wide text-accent-foreground uppercase">
              <Target className="size-4" aria-hidden />
              Competencia a evaluar
            </h3>
            <p className="mt-1 font-heading text-lg font-semibold">
              {escenario.competenciaCentral}
            </p>
          </section>

          <section className="flex flex-col gap-2">
            <TituloSeccion icono={MessageSquareText}>Descripción del caso</TituloSeccion>
            <p className="leading-relaxed text-pretty">{escenario.descripcion}</p>
            {consultorio && (
              <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                <Armchair className="size-4 shrink-0" aria-hidden />
                Entorno: {consultorio.nombre} · {consultorio.detalle.toLowerCase()}
              </p>
            )}
          </section>

          <section
            aria-label="Ficha del paciente"
            className="flex flex-col gap-4 rounded-xl border bg-linear-to-br from-accent/50 via-card to-card p-5"
          >
            <div className="flex items-center gap-4">
              <AvatarPaciente
                src={avatarDeEscena(escenario.configuracion3d)}
                nombre={npc.nombre}
                className="size-16 font-heading text-xl ring-4 ring-card"
              />
              <div className="leading-tight">
                <TituloSeccionTexto>Paciente</TituloSeccionTexto>
                <p className="mt-1 font-heading text-2xl font-semibold">{npc.nombre}</p>
                <p className="text-sm text-muted-foreground">{npc.edad} años</p>
              </div>
            </div>
            <div className="flex flex-col gap-1 border-t border-dashed pt-4">
              <TituloSeccionTexto>Lo que sabes antes de entrar</TituloSeccionTexto>
              <p className="text-sm leading-relaxed text-pretty">{npc.perfilClinico}</p>
            </div>
          </section>

          <section className="flex flex-col gap-1.5 rounded-xl border p-4">
            <TituloSeccion icono={GraduationCap}>Estudiante</TituloSeccion>
            <dl className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
              <dt className="sr-only">Nombre completo</dt>
              <dd className="font-medium">{estudiante.nombre}</dd>
              <dt className="sr-only">Código institucional</dt>
              <dd className="font-mono text-sm text-muted-foreground">{estudiante.codigo}</dd>
            </dl>
            <p className="text-xs text-muted-foreground">
              Verifica que tus datos sean correctos antes de comenzar.
            </p>
          </section>

          <section className="flex flex-col gap-2">
            <TituloSeccion icono={ClipboardCheck}>Cómo se desarrolla la sesión</TituloSeccion>
            <ol className="flex flex-col gap-2 text-sm">
              {DESARROLLO.map((paso, i) => (
                <li key={paso} className="flex gap-3">
                  <span
                    aria-hidden
                    className="flex size-5 shrink-0 items-center justify-center rounded-sm bg-secondary font-mono text-[11px] font-semibold text-secondary-foreground"
                  >
                    {i + 1}
                  </span>
                  <span className="leading-relaxed">{paso}</span>
                </li>
              ))}
            </ol>
          </section>
        </div>

        <DialogFooter className="m-0 flex-col-reverse gap-2 border-t bg-muted/50 px-6 py-4 sm:flex-row sm:justify-end">
          <Button onClick={comenzar} disabled={comenzando}>
            {comenzando && <Loader2 className="animate-spin" aria-hidden />}
            Entendido · Iniciar simulación
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TituloSeccion({
  icono: Icono,
  children,
}: {
  icono: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
  children: React.ReactNode;
}) {
  return (
    <h3 className="flex items-center gap-2 font-sans text-xs font-semibold tracking-wide text-muted-foreground uppercase">
      <Icono className="size-4" aria-hidden />
      {children}
    </h3>
  );
}

function TituloSeccionTexto({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="font-sans text-xs font-semibold tracking-wide text-muted-foreground uppercase">
      {children}
    </h3>
  );
}
