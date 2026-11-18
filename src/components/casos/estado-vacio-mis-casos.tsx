import { Bookmark, FilePlus2, Plus, Repeat2, Wand2, type LucideIcon } from 'lucide-react';
import Link from 'next/link';

import { ControlCitado } from '@/components/comun/control-citado';
import { Button } from '@/components/ui/button';

interface Consejo {
  icono: LucideIcon;
  titulo: string;
  texto: React.ReactNode;
}

/** Las tres formas de tener un caso propio; el segundo consejo cambia según dónde se lea. */
function consejos(contexto: 'asignar' | 'biblioteca'): Consejo[] {
  return [
    {
      icono: Wand2,
      titulo: 'Desde cero',
      texto: 'Un constructor guiado con vista previa del comportamiento y prueba del paciente.',
    },
    {
      icono: Bookmark,
      titulo: 'Desde un caso predefinido',
      texto:
        contexto === 'asignar' ? (
          <>
            Elige uno arriba, ajusta su comportamiento y pulsa{' '}
            <ControlCitado>Guardar como mi caso</ControlCitado>.
          </>
        ) : (
          <>
            En <ControlCitado>Casos predefinidos</ControlCitado>, pulsa{' '}
            <ControlCitado>Crear caso a partir de este</ControlCitado> en el que quieras variar.
          </>
        ),
    },
    {
      icono: Repeat2,
      titulo: 'Reutilízalos',
      texto: 'Quedan en esta lista, listos para asignarlos de nuevo.',
    },
  ];
}

/** «Mis casos» sin casos todavía: explica qué son y las dos formas de empezar. */
export function EstadoVacioMisCasos({
  contexto = 'asignar',
}: {
  contexto?: 'asignar' | 'biblioteca';
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-dashed border-input/50 bg-card">
      <div className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:p-8">
        <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-salvia-suave text-salvia-oscuro">
          <FilePlus2 className="size-7" aria-hidden />
        </span>
        <div className="flex flex-1 flex-col gap-1.5">
          <h3 className="text-xl font-bold">Aquí vivirán tus casos</h3>
          <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
            {contexto === 'asignar' ? (
              <>
                Crea un paciente a tu medida, o ajusta un caso predefinido al asignarlo y pulsa{' '}
                <ControlCitado>Guardar como mi caso</ControlCitado>.
              </>
            ) : (
              'Crea un paciente a tu medida o parte de uno predefinido para cambiarle el nivel de dificultad.'
            )}
          </p>
        </div>
        <Button asChild size="lg" variant="outline">
          <Link href="/configuracion/casos/nuevo">
            <Plus aria-hidden />
            Crear mi primer caso
          </Link>
        </Button>
      </div>
      <ul className="grid gap-4 border-t border-dashed border-input/50 bg-muted/40 p-6 text-sm sm:grid-cols-3 sm:px-8">
        {consejos(contexto).map(({ icono: Icono, titulo, texto }) => (
          <li key={titulo} className="flex items-start gap-3">
            <Icono className="mt-0.5 size-4 shrink-0 text-salvia" aria-hidden />
            <p className="leading-snug">
              <span className="font-medium">{titulo}. </span>
              <span className="text-muted-foreground">{texto}</span>
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
