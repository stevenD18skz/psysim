import { ArrowRight, Mail, Pencil, Printer } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { z } from 'zod';

import { ListaCodigos } from '@/components/asignaciones/lista-codigos';
import { EncabezadoPagina } from '@/components/comun/encabezado-pagina';
import { Indicadores } from '@/components/comun/indicadores';
import { AccionesEstudiante } from '@/components/estudiantes/acciones-estudiante';
import { EditarEstudiante } from '@/components/estudiantes/editar-estudiante';
import { ListaSesiones } from '@/components/sesiones/lista-sesiones';
import { RefrescoAutomatico } from '@/components/sesiones/refresco-automatico';
import { Button } from '@/components/ui/button';
import { requerirDocente } from '@/lib/auth/dal';
import { formatearNota, formatearTiempoPractica } from '@/lib/estudiantes/estudiantes';
import { obtenerEstudiante } from '@/lib/estudiantes/queries';
import {
  obtenerAsignacionesDeEstudiante,
  obtenerSesionesDeEstudiante,
} from '@/lib/sesiones/queries';

export const metadata: Metadata = {
  title: 'Estudiante',
};

/**
 * Ficha del estudiante para el docente: sus datos y cuenta, sus prácticas con el estado de cada una
 * y el acceso a la revisión, y los códigos de acceso (los que no ha usado se pueden compartir de
 * nuevo o anular). Eliminar queda en el menú «⋯», lejos de la acción principal.
 */
export default async function EstudiantePage({ params }: PageProps<'/estudiantes/[id]'>) {
  await requerirDocente();

  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();

  const estudiante = await obtenerEstudiante(id);
  if (!estudiante) notFound();

  const [sesiones, asignaciones] = await Promise.all([
    obtenerSesionesDeEstudiante(id),
    obtenerAsignacionesDeEstudiante(id),
  ]);
  const { metricas } = estudiante;

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
        <ListaSesiones
          sesiones={sesiones}
          para="docente"
          enlace={sesion => `/sesiones/${sesion.id}`}
          vacio="Aún no ha hecho ninguna práctica. Aparecerá aquí en cuanto use un código."
        />
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
