import { ArrowRight, ClipboardCheck, MonitorPlay, UserCheck, UsersRound } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';

import { BotonNuevoDocente } from '@/components/admin/boton-nuevo-docente';
import { ListaDocentes } from '@/components/admin/lista-docentes';
import {
  ContenedorHero,
  EncabezadoPagina,
  SOMBRA_SOBRE_NOGAL,
} from '@/components/comun/encabezado-pagina';
import { IndicadorEnVivo } from '@/components/comun/indicador-en-vivo';
import { Indicadores } from '@/components/comun/indicadores';
import { RefrescoAutomatico } from '@/components/sesiones/refresco-automatico';
import { obtenerDocentes } from '@/lib/admin/queries';
import { requerirSuperadmin } from '@/lib/auth/dal';

export const metadata: Metadata = {
  title: 'Docentes',
};

/**
 * Panel del Administrador: crea las cuentas de los docentes (con Google o contraseña temporal),
 * las edita, las desactiva o las elimina, y ve la actividad de cada uno.
 */
export default async function AdminPage() {
  const perfil = await requerirSuperadmin();
  const docentes = await obtenerDocentes();
  const ahora = new Date();

  const totales = docentes.reduce(
    (suma, { activo, contrasenaTemporal, metricas }) => ({
      activos: suma.activos + (activo ? 1 : 0),
      desactivadas: suma.desactivadas + (activo ? 0 : 1),
      temporales: suma.temporales + (activo && contrasenaTemporal ? 1 : 0),
      estudiantes: suma.estudiantes + metricas.estudiantes,
      sesiones: suma.sesiones + metricas.sesiones,
      enCurso: suma.enCurso + metricas.enCurso,
      pendientes: suma.pendientes + metricas.pendientesRetroalimentacion,
      casosPropios: suma.casosPropios + metricas.casosPropios,
    }),
    {
      activos: 0,
      desactivadas: 0,
      temporales: 0,
      estudiantes: 0,
      sesiones: 0,
      enCurso: 0,
      pendientes: 0,
      casosPropios: 0,
    }
  );

  const subbarra = (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <nav aria-label="Administración" className="flex flex-wrap items-center gap-1.5">
        {[
          { href: '/estudiantes', texto: 'Estudiantes' },
          { href: '/configuracion/casos', texto: 'Casos' },
          { href: '/admin/ia', texto: 'Paciente con IA' },
        ].map(enlace => (
          <Link
            key={enlace.href}
            href={enlace.href as '/estudiantes' | '/configuracion/casos' | '/admin/ia'}
            className="group inline-flex min-h-8 items-center gap-1.5 rounded-lg bg-sidebar-accent/55 px-3 py-1 text-sm font-medium text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-laton-texto focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid"
          >
            {enlace.texto}
            <ArrowRight
              className="size-3.5 text-laton-texto transition-transform duration-200 ease-salida group-hover:translate-x-0.5"
              aria-hidden
            />
          </Link>
        ))}
      </nav>
      <span className="text-xs text-sidebar-muted tabular-nums">
        {totales.activos} de {docentes.length}{' '}
        {docentes.length === 1 ? 'cuenta activa' : 'cuentas activas'}
        {totales.temporales > 0 &&
          ` · ${totales.temporales} ${totales.temporales === 1 ? 'con clave temporal' : 'con clave temporal'}`}
      </span>
    </div>
  );

  return (
    <div className="flex flex-1 flex-col">
      <RefrescoAutomatico activo={totales.enCurso > 0} segundos={30} />
      <EncabezadoPagina
        titulo="Docentes"
        descripcion="Crea las cuentas del equipo docente, elige cómo ingresan y supervisa su actividad. Como administrador, también trabajas como docente."
        acciones={<BotonNuevoDocente />}
        subbarra={subbarra}
      />

      <ContenedorHero>
        <Indicadores
          className={SOMBRA_SOBRE_NOGAL}
          indicadores={[
            {
              icono: UserCheck,
              etiqueta: 'Cuentas activas',
              valor: totales.activos,
              detalle:
                totales.desactivadas > 0
                  ? `de ${docentes.length} · ${totales.desactivadas} ${totales.desactivadas === 1 ? 'desactivada' : 'desactivadas'}`
                  : `de ${docentes.length} registradas`,
              ayuda:
                'Docentes con acceso habilitado para registrar estudiantes, crear casos y asignar prácticas.',
            },
            {
              icono: IndicadorEnVivo,
              etiqueta: 'Practicando ahora',
              valor: totales.enCurso,
              detalle: totales.enCurso === 0 ? 'Nadie en el consultorio' : 'En toda la plataforma',
              tono: totales.enCurso > 0 ? 'activo' : undefined,
              ayuda:
                'Estudiantes en entrevista en vivo en este momento. La vista se actualiza sola cada 30 segundos.',
            },
            {
              icono: ClipboardCheck,
              etiqueta: 'Por revisar',
              valor: totales.pendientes,
              detalle:
                totales.pendientes === 0 ? 'Todo el equipo al día' : 'Entre todos los docentes',
              tono: totales.pendientes > 0 ? 'atencion' : undefined,
              ayuda:
                'Prácticas terminadas pendientes de retroalimentación sumadas entre todo el equipo docente.',
            },
            {
              icono: UsersRound,
              etiqueta: 'Estudiantes',
              valor: totales.estudiantes,
              enlace: '/estudiantes',
              detalle:
                totales.casosPropios > 0
                  ? `${totales.casosPropios} ${totales.casosPropios === 1 ? 'caso propio' : 'casos propios'}`
                  : 'En todos los grupos',
            },
            {
              icono: MonitorPlay,
              etiqueta: 'Prácticas',
              valor: totales.sesiones,
              detalle: 'Acumuladas en la plataforma',
            },
          ]}
        />

        <ListaDocentes docentes={docentes} idPropio={perfil.id} ahora={ahora} />
      </ContenedorHero>
    </div>
  );
}
