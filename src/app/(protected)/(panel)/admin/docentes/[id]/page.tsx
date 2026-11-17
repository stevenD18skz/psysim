import {
  CalendarDays,
  ClipboardCheck,
  FileText,
  LogIn,
  Mail,
  MonitorPlay,
  ShieldCheck,
  UsersRound,
} from 'lucide-react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { z } from 'zod';

import { AccionesDocente } from '@/components/admin/acciones-docente';
import { SeccionesFichaDocente } from '@/components/admin/secciones-ficha-docente';
import {
  ContenedorHero,
  EncabezadoPagina,
  SOMBRA_SOBRE_NOGAL,
} from '@/components/comun/encabezado-pagina';
import { Indicadores } from '@/components/comun/indicadores';
import { InsigniaEstado } from '@/components/sesiones/insignia-estado';
import { describirAcceso } from '@/lib/admin/docentes';
import { obtenerFichaDocente } from '@/lib/admin/queries';
import { requerirSuperadmin } from '@/lib/auth/dal';
import { formatearDia } from '@/lib/estudiantes/estudiantes';

export const metadata: Metadata = {
  title: 'Docente',
};

/**
 * Ficha de un docente para el Administrador: cómo entra, su actividad, sus estudiantes (con sus
 * métricas) y sus casos propios. Es de solo lectura: las conversaciones y la retroalimentación
 * siguen siendo del docente.
 */
export default async function DocentePage({ params }: PageProps<'/admin/docentes/[id]'>) {
  const perfil = await requerirSuperadmin();

  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();

  const ficha = await obtenerFichaDocente(id);
  if (!ficha) notFound();
  const { docente, estudiantes, casos } = ficha;
  const { metricas } = docente;

  const datos = [
    { icono: Mail, etiqueta: 'Correo', valor: docente.correo },
    { icono: LogIn, etiqueta: 'Acceso', valor: describirAcceso(docente) },
    {
      icono: CalendarDays,
      etiqueta: 'Último ingreso',
      valor: docente.ultimoAcceso ? formatearDia(docente.ultimoAcceso) : 'Nunca',
    },
    { icono: CalendarDays, etiqueta: 'Cuenta creada', valor: formatearDia(docente.creadoEn) },
  ];

  return (
    <div className="flex flex-1 flex-col">
      <EncabezadoPagina
        volver={{ href: '/admin', etiqueta: 'Docentes' }}
        titulo={docente.nombre}
        acciones={<AccionesDocente docente={docente} esPropio={docente.id === perfil.id} enFicha />}
      >
        <div className="flex flex-wrap items-center gap-2.5 pt-0.5">
          <InsigniaEstado
            estado={
              docente.activo
                ? { texto: 'Activa', tono: 'listo' }
                : { texto: 'Desactivada', tono: 'neutro' }
            }
          />
          {docente.rol === 'superadmin' && (
            <span className="inline-flex items-center gap-1 rounded-full border border-laton/40 bg-sidebar-accent px-2.5 py-0.5 text-xs font-medium text-laton-texto">
              <ShieldCheck className="size-3.5" aria-hidden />
              Administrador
            </span>
          )}
          <span className="font-mono text-sm text-sidebar-muted">
            {docente.codigoInstitucional}
          </span>
        </div>
      </EncabezadoPagina>

      <ContenedorHero>
        <dl
          className={`grid gap-x-6 gap-y-4 rounded-2xl border bg-card p-5 sm:grid-cols-2 ${SOMBRA_SOBRE_NOGAL}`}
        >
          {datos.map(({ icono: Icono, etiqueta, valor }) => (
            <div key={etiqueta} className="flex items-start gap-3">
              <Icono className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
              <div className="flex min-w-0 flex-col">
                <dt className="text-xs text-muted-foreground">{etiqueta}</dt>
                <dd className="font-medium break-words">{valor}</dd>
              </div>
            </div>
          ))}
        </dl>

        <Indicadores
          indicadores={[
            { icono: UsersRound, etiqueta: 'Estudiantes', valor: metricas.estudiantes },
            { icono: MonitorPlay, etiqueta: 'Prácticas', valor: metricas.sesiones },
            {
              icono: ClipboardCheck,
              etiqueta: 'Por revisar',
              valor: metricas.pendientesRetroalimentacion,
            },
            { icono: FileText, etiqueta: 'Casos propios', valor: metricas.casosPropios },
          ]}
        />

        <SeccionesFichaDocente
          nombreDocente={docente.nombre}
          estudiantes={estudiantes}
          casos={casos}
        />
      </ContenedorHero>
    </div>
  );
}
