import { UsersRound } from 'lucide-react';
import type { Metadata } from 'next';

import { EncabezadoPagina } from '@/components/comun/encabezado-pagina';
import { Indicadores } from '@/components/comun/indicadores';
import { BotonRegistrarEstudiante } from '@/components/estudiantes/boton-registrar';
import { ListaEstudiantes } from '@/components/estudiantes/lista-estudiantes';
import { requerirDocente } from '@/lib/auth/dal';
import { obtenerEstudiantes } from '@/lib/estudiantes/queries';

export const metadata: Metadata = {
  title: 'Estudiantes',
};

/**
 * Estudiantes del docente: los registra con su correo institucional (así entran con Google), les
 * asigna prácticas y ve quién practica ahora y qué espera su retroalimentación.
 */
export default async function EstudiantesPage() {
  await requerirDocente();
  const estudiantes = await obtenerEstudiantes();

  const totales = estudiantes.reduce(
    (suma, { metricas }) => ({
      sesiones: suma.sesiones + metricas.sesiones,
      enCurso: suma.enCurso + metricas.enCurso,
      pendientes: suma.pendientes + metricas.pendientesRetroalimentacion,
    }),
    { sesiones: 0, enCurso: 0, pendientes: 0 }
  );

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-8 sm:px-6 sm:py-10">
      <EncabezadoPagina
        titulo="Estudiantes"
        descripcion="Regístralos con su correo institucional para asignarles prácticas. Entran con «Continuar con Google»."
        acciones={estudiantes.length > 0 ? <BotonRegistrarEstudiante /> : undefined}
      />

      {estudiantes.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed border-input/50 p-10 text-center">
          <span className="flex size-12 items-center justify-center rounded-full bg-salvia-suave text-salvia-oscuro">
            <UsersRound className="size-6" aria-hidden />
          </span>
          <div className="flex flex-col gap-1">
            <h2 className="text-xl font-bold">Aún no tienes estudiantes</h2>
            <p className="max-w-md text-sm text-muted-foreground">
              Regístralos con su código, nombre y correo @correounivalle.edu.co. Después podrás
              asignarles prácticas.
            </p>
          </div>
          <BotonRegistrarEstudiante />
        </div>
      ) : (
        <>
          <Indicadores
            indicadores={[
              { etiqueta: 'Estudiantes', valor: estudiantes.length },
              { etiqueta: 'Practicando ahora', valor: totales.enCurso },
              { etiqueta: 'Por revisar', valor: totales.pendientes },
              { etiqueta: 'Prácticas', valor: totales.sesiones },
            ]}
          />
          <ListaEstudiantes estudiantes={estudiantes} />
        </>
      )}
    </div>
  );
}
