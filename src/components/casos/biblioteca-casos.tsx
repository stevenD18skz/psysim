'use client';

import { ArrowRight, CopyPlus } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { IndicadorNivel, InsigniaCategoria } from '@/components/casos/insignias-caso';
import { AccionesCasoPropio } from '@/components/configuracion/acciones-caso-propio';
import { AvatarPaciente } from '@/components/pacientes/avatar-paciente';
import { Button } from '@/components/ui/button';
import { ETIQUETA_DIFICULTAD } from '@/lib/escenarios/etiquetas';
import { avatarDeEscena } from '@/lib/pacientes/avatar';
import { type EscenarioCatalogo } from '@/types';

/**
 * Biblioteca de casos: cada caso es una ficha con su paciente, la competencia que entrena y su
 * nivel, y la acción de asignarlo. Los casos propios añaden editar y eliminar.
 */
export interface UsoCaso {
  /** Códigos de acceso que el docente generó con este caso. */
  asignaciones: number;
  /** Prácticas de este caso que esperan su revisión. */
  porRevisar: number;
}

export function BibliotecaCasos({
  casos,
  vacio,
  uso = {},
}: {
  casos: EscenarioCatalogo[];
  vacio?: React.ReactNode;
  /** Uso de cada caso por el docente, por id del escenario. */
  uso?: Readonly<Record<string, UsoCaso>>;
}) {
  const router = useRouter();

  if (casos.length === 0 && vacio) return <>{vacio}</>;

  return (
    <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {casos.map(caso => {
        const botonAsignar = (
          <Button asChild variant="ghost" size="sm" className="font-semibold">
            <Link href={`/configuracion?caso=${caso.id}`}>
              Asignar
              <span className="sr-only"> el caso {caso.titulo}</span>
              <ArrowRight aria-hidden />
            </Link>
          </Button>
        );
        return (
          <li key={caso.id} className="flex flex-col overflow-hidden rounded-xl border bg-card">
            <div className="flex flex-1 flex-col gap-4 p-5">
              <div className="flex items-start gap-3">
                <AvatarPaciente
                  src={avatarDeEscena(caso.configuracion3d)}
                  nombre={caso.npc.nombre}
                  className="size-12 text-sm"
                />
                <div className="flex min-w-0 flex-col">
                  <p className="text-sm text-muted-foreground">
                    <span className="font-medium text-terracota">{caso.npc.nombre}</span>,{' '}
                    {caso.npc.edad} años
                  </p>
                  <h3 className="text-lg leading-snug font-bold tracking-[-0.01em]">
                    {caso.titulo}
                  </h3>
                </div>
              </div>
              <p className="line-clamp-3 text-sm text-muted-foreground">{caso.descripcion}</p>
              <dl className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <dt className="sr-only">Tipo</dt>
                  <dd className="flex items-center gap-2">
                    <span
                      className={
                        caso.propio
                          ? 'rounded-md bg-salvia-suave px-2 py-0.5 text-xs font-medium text-salvia-oscuro'
                          : 'rounded-md bg-secondary px-2 py-0.5 font-mono text-xs font-medium text-secondary-foreground'
                      }
                    >
                      {caso.propio ? 'Propio' : caso.codigo}
                    </span>
                    <InsigniaCategoria categoria={caso.categoria} />
                  </dd>
                </div>
                <div className="flex items-center text-muted-foreground">
                  <dt className="sr-only">Nivel</dt>
                  <dd>
                    <IndicadorNivel
                      dificultad={caso.dificultad}
                      etiqueta={ETIQUETA_DIFICULTAD[caso.dificultad]}
                    />
                  </dd>
                </div>
                <div className="basis-full">
                  <dt className="sr-only">Competencia que entrena</dt>
                  <dd className="font-medium">{caso.competenciaCentral}</dd>
                </div>
                <div className="flex basis-full flex-wrap items-center gap-x-3 gap-y-1 text-muted-foreground">
                  <dt className="sr-only">Uso</dt>
                  <dd className="tabular-nums">
                    {(uso[caso.id]?.asignaciones ?? 0) === 0
                      ? 'Aún no lo has asignado'
                      : uso[caso.id]!.asignaciones === 1
                        ? 'Asignado 1 vez'
                        : `Asignado ${uso[caso.id]!.asignaciones} veces`}
                  </dd>
                  {(uso[caso.id]?.porRevisar ?? 0) > 0 && (
                    <dd>
                      <Link
                        href={`/sesiones?caso=${encodeURIComponent(caso.codigo)}`}
                        className="relative z-10 rounded-full bg-ambar-suave px-2 py-0.5 text-xs font-medium text-ambar hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-hidden"
                      >
                        {uso[caso.id]!.porRevisar} por revisar
                      </Link>
                    </dd>
                  )}
                </div>
              </dl>
            </div>
            <div className="flex min-h-12 items-center gap-1 border-t bg-muted/40 px-2 py-1.5">
              {caso.propio ? (
                <AccionesCasoPropio
                  casoId={caso.id}
                  titulo={caso.titulo}
                  onEliminado={() => router.refresh()}
                  soloIconos
                  extra={botonAsignar}
                />
              ) : (
                <>
                  <Button asChild variant="ghost" size="sm">
                    <Link href={`/configuracion/casos/nuevo?desde=${caso.id}`}>
                      <CopyPlus aria-hidden />
                      Crear caso a partir de este
                      <span className="sr-only">: {caso.titulo}</span>
                    </Link>
                  </Button>
                  <div className="ml-auto">{botonAsignar}</div>
                </>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
