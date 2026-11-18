import { ArrowRight, Library } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';

import {
  ContenedorHero,
  EncabezadoPagina,
  SOMBRA_SOBRE_NOGAL,
} from '@/components/comun/encabezado-pagina';
import { ConfiguradorSesion } from '@/components/configuracion/configurador-sesion';
import { Button } from '@/components/ui/button';
import { obtenerTodosLosEstudiantes } from '@/lib/admin/queries';
import { requerirDocente } from '@/lib/auth/dal';
import { obtenerCatalogoEscenarios } from '@/lib/escenarios/queries';
import { buscarPorCodigo } from '@/lib/estudiantes/estudiantes';
import { obtenerEstudiantes } from '@/lib/estudiantes/queries';

export const metadata: Metadata = {
  title: 'Asignar práctica',
};

export default async function ConfiguracionPage({ searchParams }: PageProps<'/configuracion'>) {
  const perfil = await requerirDocente();
  const esAdmin = perfil.rol === 'superadmin';
  const [escenarios, estudiantes, { caso, estudiante, ajustar }] = await Promise.all([
    obtenerCatalogoEscenarios(),
    esAdmin ? obtenerTodosLosEstudiantes() : obtenerEstudiantes(),
    searchParams,
  ]);
  // `?estudiante=<código>` llega desde la ficha o la lista de estudiantes ("Asignar práctica").
  const estudianteInicial =
    typeof estudiante === 'string' ? (buscarPorCodigo(estudiantes, estudiante) ?? null) : null;

  const totalPropios = escenarios.filter(c => c.propio).length;

  return (
    <div className="flex flex-1 flex-col">
      <EncabezadoPagina
        titulo="Asignar práctica"
        descripcion="Elige el caso y a quién se lo asignas. Te damos un código de un solo uso para que practique desde su computador."
        acciones={
          <Button asChild variant="outline" size="lg">
            <Link href="/configuracion/casos">
              <Library aria-hidden />
              Biblioteca de casos
            </Link>
          </Button>
        }
        subbarra={
          <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 text-sm text-sidebar-muted">
            <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
              <span>
                <strong className="font-semibold text-sidebar-foreground tabular-nums">
                  {escenarios.length}
                </strong>{' '}
                {escenarios.length === 1 ? 'caso disponible' : 'casos disponibles'}
                {totalPropios > 0
                  ? ` (${totalPropios} ${totalPropios === 1 ? 'propio' : 'propios'})`
                  : ''}
              </span>
              <span aria-hidden className="text-sidebar-border">
                ·
              </span>
              <span>
                <strong className="font-semibold text-sidebar-foreground tabular-nums">
                  {estudiantes.length}
                </strong>{' '}
                {estudiantes.length === 1 ? 'estudiante registrado' : 'estudiantes registrados'}
              </span>
            </div>
            <Link
              href="/configuracion/casos/nuevo"
              className="inline-flex items-center gap-1.5 font-medium text-laton-texto transition-colors hover:text-lino focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-laton-texto focus-visible:outline-solid"
            >
              Crear caso nuevo
              <ArrowRight className="size-3.5" aria-hidden />
            </Link>
          </div>
        }
      />

      <ContenedorHero>
        {escenarios.length === 0 ? (
          <p
            className={`rounded-2xl border border-border bg-card p-8 text-center text-muted-foreground ${SOMBRA_SOBRE_NOGAL}`}
          >
            No hay casos disponibles por ahora. Crea uno propio o avisa al administrador.
          </p>
        ) : (
          <div
            className={`rounded-2xl border border-border/80 bg-background p-5 sm:p-7 ${SOMBRA_SOBRE_NOGAL}`}
          >
            <ConfiguradorSesion
              // `key` reinicia el formulario al llegar con otro caso o estudiante preseleccionado.
              key={`${typeof caso === 'string' ? caso : '-'}:${estudianteInicial?.id ?? '-'}`}
              escenarios={escenarios}
              casoInicialId={typeof caso === 'string' ? caso : null}
              estudiantes={estudiantes}
              estudianteInicial={estudianteInicial}
              ajustarInicial={ajustar === '1'}
            />
          </div>
        )}
      </ContenedorHero>
    </div>
  );
}
