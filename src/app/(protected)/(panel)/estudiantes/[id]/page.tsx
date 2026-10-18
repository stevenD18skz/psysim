import { ArrowRight, Mail, Pencil, Printer } from 'lucide-react';
import type { Metadata } from 'next';
import { type Route } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { z } from 'zod';

import { ListaCodigos } from '@/components/asignaciones/lista-codigos';
import { EncabezadoPagina } from '@/components/comun/encabezado-pagina';
import { Indicadores } from '@/components/comun/indicadores';
import { Paginacion } from '@/components/comun/paginacion';
import { AccionesEstudiante } from '@/components/estudiantes/acciones-estudiante';
import { EditarEstudiante } from '@/components/estudiantes/editar-estudiante';
import { ListaSesiones } from '@/components/sesiones/lista-sesiones';
import { RefrescoAutomatico } from '@/components/sesiones/refresco-automatico';
import { Button } from '@/components/ui/button';
import { requerirDocente } from '@/lib/auth/dal';
import { formatearNota, formatearTiempoPractica } from '@/lib/estudiantes/estudiantes';
import { obtenerEstudiante } from '@/lib/estudiantes/queries';
import { conParametros, leerOpcion, leerPagina, paginar } from '@/lib/listas';
import {
  FILTROS_PRACTICAS,
  type FiltroPracticas,
  IDS_FILTRO_PRACTICAS,
} from '@/lib/sesiones/estados';
import {
  obtenerAsignacionesDeEstudiante,
  obtenerSesionesDeEstudiante,
} from '@/lib/sesiones/queries';
import { cn } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'Estudiante',
};

/**
 * Ficha del estudiante para el docente: sus datos y cuenta, sus prácticas con el estado de cada una
 * y el acceso a la revisión, y los códigos de acceso (los que no ha usado se pueden compartir de
 * nuevo o anular). Eliminar queda en el menú «⋯», lejos de la acción principal.
 */
export default async function EstudiantePage({
  params,
  searchParams,
}: PageProps<'/estudiantes/[id]'>) {
  await requerirDocente();

  const [{ id }, parametros] = await Promise.all([params, searchParams]);
  if (!z.uuid().safeParse(id).success) notFound();

  const estudiante = await obtenerEstudiante(id);
  if (!estudiante) notFound();

  const [sesiones, asignaciones] = await Promise.all([
    obtenerSesionesDeEstudiante(id),
    obtenerAsignacionesDeEstudiante(id),
  ]);
  const { metricas } = estudiante;

  // Prácticas filtradas por estado y paginadas: tras un semestre pueden ser decenas.
  const filtro = leerOpcion(parametros.estado, IDS_FILTRO_PRACTICAS, 'todas');
  const conteos = Object.fromEntries(
    FILTROS_PRACTICAS.map(f => [f.valor, sesiones.filter(f.predicado).length])
  ) as Record<FiltroPracticas, number>;
  const predicado = FILTROS_PRACTICAS.find(f => f.valor === filtro)!.predicado;
  const pagina = paginar(sesiones.filter(predicado), leerPagina(parametros.pagina), 10);
  const ruta = `/estudiantes/${estudiante.id}`;
  const actuales = Object.fromEntries(
    Object.entries(parametros).flatMap(([clave, valor]) =>
      typeof valor === 'string' ? [[clave, valor]] : []
    )
  );
  const url = (cambios: Record<string, string | number | null>) =>
    conParametros(ruta, actuales, cambios, { estado: 'todas' });

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-8 sm:px-6 sm:py-10">
      <RefrescoAutomatico activo={metricas.enCurso > 0} />

      <EncabezadoPagina
        volver={{ href: '/estudiantes', etiqueta: 'Estudiantes' }}
        titulo={estudiante.nombre}
        acciones={
          <>
            <Button asChild size="lg" variant="outline">
              <Link href={`/estudiantes/${estudiante.id}/notas`} target="_blank">
                <Printer aria-hidden />
                Imprimir notas
              </Link>
            </Button>
            <EditarEstudiante
              estudiante={estudiante}
              etiqueta={estudiante.correo ? 'Editar' : 'Agregar correo'}
              icono={<Pencil aria-hidden />}
            />
            {estudiante.cuentaVinculada && (
              <Button asChild size="lg" variant="accion">
                <Link href={`/configuracion?estudiante=${estudiante.codigo}`}>
                  Asignar práctica
                  <ArrowRight aria-hidden />
                </Link>
              </Button>
            )}
            <AccionesEstudiante estudiante={estudiante} enFicha />
          </>
        }
      >
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
          <span className="font-mono">{estudiante.codigo}</span>
          <span className="flex items-center gap-1.5">
            <Mail className="size-4" aria-hidden />
            {estudiante.correo ?? 'Sin correo institucional'}
          </span>
          <span>
            ·{' '}
            {estudiante.cuentaVinculada
              ? 'Entra con Google'
              : 'Sin cuenta: agrega su correo para asignarle prácticas'}
          </span>
        </p>
      </EncabezadoPagina>

      <Indicadores
        indicadores={[
          { etiqueta: 'Prácticas', valor: metricas.sesiones },
          {
            etiqueta: 'Tiempo de práctica',
            valor: formatearTiempoPractica(metricas.segundosPractica),
          },
          { etiqueta: 'Intervenciones', valor: metricas.intervenciones },
          { etiqueta: 'Nota promedio', valor: formatearNota(metricas.notaPromedio) },
        ]}
      />

      <section aria-labelledby="sesiones-titulo" className="flex flex-col gap-4">
        <h2 id="sesiones-titulo" className="text-xl font-bold tracking-[-0.015em]">
          Prácticas
        </h2>
        {sesiones.length > 0 && (
          <nav
            aria-label="Filtrar prácticas por estado"
            className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1"
          >
            {FILTROS_PRACTICAS.map(f => {
              const activo = f.valor === filtro;
              return (
                <Link
                  key={f.valor}
                  href={url({ estado: f.valor }) as Route}
                  scroll={false}
                  aria-current={activo ? 'page' : undefined}
                  className={cn(
                    'flex h-9 shrink-0 items-center gap-2 rounded-lg px-3 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-hidden',
                    activo
                      ? 'bg-nogal text-lino'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  {f.etiqueta}
                  <span
                    className={cn(
                      'rounded-full px-1.5 text-xs tabular-nums',
                      activo ? 'bg-lino/15' : 'bg-muted'
                    )}
                  >
                    {conteos[f.valor]}
                  </span>
                </Link>
              );
            })}
          </nav>
        )}
        <ListaSesiones
          sesiones={pagina.visibles}
          para="docente"
          enlace={sesion => `/sesiones/${sesion.id}`}
          vacio={
            sesiones.length === 0
              ? 'Aún no ha hecho ninguna práctica. Aparecerá aquí en cuanto use un código.'
              : 'Ninguna práctica en este estado.'
          }
        />
        {pagina.totalPaginas > 1 && (
          <Paginacion
            pagina={pagina}
            enlace={n => url({ pagina: n })}
            sustantivo={['práctica', 'prácticas']}
          />
        )}
      </section>

      <section aria-labelledby="codigos-titulo" className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h2 id="codigos-titulo" className="text-xl font-bold tracking-[-0.015em]">
            Códigos de acceso
          </h2>
          <p className="text-sm text-muted-foreground">
            Cada código sirve una sola vez y solo con la cuenta de {estudiante.nombre.split(' ')[0]}
            .
          </p>
        </div>
        <ListaCodigos
          asignaciones={asignaciones}
          estudiante={{ nombre: estudiante.nombre, correo: estudiante.correo }}
        />
      </section>
    </div>
  );
}
