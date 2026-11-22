import {
  ArrowRight,
  CalendarDays,
  ClipboardCheck,
  FileText,
  KeyRound,
  LogIn,
  Mail,
  MonitorPlay,
  PowerOff,
  ShieldCheck,
  UsersRound,
} from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { z } from 'zod';

import { AccionesDocente } from '@/components/admin/acciones-docente';
import { SeccionesFichaDocente } from '@/components/admin/secciones-ficha-docente';
import { BotonCopiar } from '@/components/asignaciones/boton-copiar';
import {
  ContenedorHero,
  EncabezadoPagina,
  SOMBRA_SOBRE_NOGAL,
} from '@/components/comun/encabezado-pagina';
import { Indicadores } from '@/components/comun/indicadores';
import { AvatarCuenta } from '@/components/layout/avatar-cuenta';
import { InsigniaEstado } from '@/components/sesiones/insignia-estado';
import { RefrescoAutomatico } from '@/components/sesiones/refresco-automatico';
import { describirAcceso } from '@/lib/admin/docentes';
import { obtenerFichaDocente } from '@/lib/admin/queries';
import { requerirSuperadmin } from '@/lib/auth/dal';
import { formatearDia } from '@/lib/estudiantes/estudiantes';
import { tiempoRelativo } from '@/lib/fechas';

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
  const ahora = new Date();
  const esPropio = docente.id === perfil.id;
  const conCuenta = estudiantes.filter(e => e.cuentaVinculada).length;
  const casosActivos = casos.filter(c => c.activo !== false).length;

  return (
    <div className="flex flex-1 flex-col">
      <RefrescoAutomatico activo={metricas.enCurso > 0} segundos={30} />

      <EncabezadoPagina
        volver={{ href: '/admin', etiqueta: 'Docentes' }}
        titulo={
          <span className="flex items-center gap-3 sm:gap-4">
            <AvatarCuenta
              avatarId={docente.avatarId ?? null}
              nombre={docente.nombre}
              className="size-10 text-sm sm:size-12 sm:text-base"
            />
            {docente.nombre}
          </span>
        }
        acciones={<AccionesDocente docente={docente} esPropio={esPropio} enFicha />}
      >
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5 pt-0.5">
          <InsigniaEstado
            estado={
              docente.activo
                ? { texto: 'Activa', tono: 'listo' }
                : { texto: 'Desactivada', tono: 'neutro' }
            }
          />
          {metricas.enCurso > 0 && (
            <InsigniaEstado estado={{ texto: `${metricas.enCurso} en curso`, tono: 'en-curso' }} />
          )}
          {docente.rol === 'superadmin' && (
            <span className="inline-flex items-center gap-1 rounded-full border border-laton/40 bg-sidebar-accent px-2.5 py-0.5 text-xs font-medium text-laton-texto">
              <ShieldCheck className="size-3.5" aria-hidden />
              Administrador
            </span>
          )}
          {esPropio && (
            <span className="rounded-full bg-sidebar-accent px-2 py-0.5 text-xs font-medium text-sidebar-foreground">
              Tu cuenta
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
          <div className="flex items-start gap-3">
            <Mail className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <dt className="text-xs text-muted-foreground">Correo</dt>
              <dd className="flex flex-wrap items-center gap-2 font-medium break-all">
                <span>{docente.correo}</span>
                <BotonCopiar
                  texto={docente.correo}
                  etiqueta="Copiar correo"
                  soloIcono
                  size="icon-sm"
                  variant="ghost"
                />
              </dd>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <LogIn className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
            <div className="flex min-w-0 flex-col gap-0.5">
              <dt className="text-xs text-muted-foreground">Acceso</dt>
              <dd className="flex flex-wrap items-center gap-2 font-medium">
                <span>{describirAcceso(docente)}</span>
                {docente.contrasenaTemporal && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-ambar-suave px-2 py-0.5 text-xs font-medium text-ambar">
                    <KeyRound className="size-3" aria-hidden />
                    Clave temporal
                  </span>
                )}
              </dd>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <CalendarDays className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
            <div className="flex min-w-0 flex-col gap-0.5">
              <dt className="text-xs text-muted-foreground">Último ingreso</dt>
              <dd className="font-medium tabular-nums">
                {docente.ultimoAcceso ? (
                  <>
                    <span className="first-letter:uppercase">
                      {tiempoRelativo(docente.ultimoAcceso, ahora)}
                    </span>{' '}
                    <span className="text-xs font-normal text-muted-foreground">
                      ({formatearDia(docente.ultimoAcceso)})
                    </span>
                  </>
                ) : (
                  <span className="text-muted-foreground">Aún no ha entrado</span>
                )}
              </dd>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <CalendarDays className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
            <div className="flex min-w-0 flex-col gap-0.5">
              <dt className="text-xs text-muted-foreground">Cuenta creada</dt>
              <dd className="flex flex-wrap items-center gap-x-3 gap-y-1 font-medium tabular-nums">
                <span>{formatearDia(docente.creadoEn)}</span>
                {estudiantes.length > 0 && (
                  <Link
                    href={`/estudiantes?docente=${docente.id}`}
                    className="inline-flex items-center gap-1 text-xs font-medium text-salvia-oscuro underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid"
                  >
                    Ver en Estudiantes
                    <ArrowRight className="size-3" aria-hidden />
                  </Link>
                )}
              </dd>
            </div>
          </div>
        </dl>

        {!docente.activo ? (
          <div className="flex items-start gap-3 rounded-2xl border border-border bg-muted/45 px-5 py-4 text-sm">
            <span
              aria-hidden
              className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground"
            >
              <PowerOff className="size-4.5" />
            </span>
            <div className="flex flex-col gap-0.5">
              <p className="font-semibold text-foreground">Esta cuenta está desactivada</p>
              <p className="text-xs leading-relaxed text-muted-foreground sm:text-sm">
                No puede iniciar sesión en PsySim, pero sus estudiantes, casos propios y prácticas
                se conservan intactos. Puedes reactivarla en cualquier momento desde el menú de
                acciones.
              </p>
            </div>
          </div>
        ) : (
          docente.contrasenaTemporal && (
            <div className="flex items-start gap-3 rounded-2xl border border-ambar/35 bg-ambar-suave/50 px-5 py-4 text-sm">
              <span
                aria-hidden
                className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-ambar-suave text-ambar"
              >
                <KeyRound className="size-4.5" />
              </span>
              <div className="flex flex-col gap-0.5">
                <p className="font-semibold text-foreground">
                  Tiene una contraseña temporal pendiente de cambio
                </p>
                <p className="text-xs leading-relaxed text-muted-foreground sm:text-sm">
                  Al iniciar sesión por primera vez le pediremos elegir una contraseña propia. Si la
                  perdió, puedes generarle una nueva desde el menú de acciones.
                </p>
              </div>
            </div>
          )
        )}

        <Indicadores
          indicadores={[
            {
              icono: UsersRound,
              etiqueta: 'Estudiantes',
              valor: metricas.estudiantes,
              enlace: metricas.estudiantes > 0 ? `/estudiantes?docente=${docente.id}` : undefined,
              detalle: metricas.estudiantes === 0 ? 'Sin registros aún' : `${conCuenta} con cuenta`,
            },
            {
              icono: MonitorPlay,
              etiqueta: 'Prácticas',
              valor: metricas.sesiones,
              detalle:
                metricas.enCurso > 0
                  ? `${metricas.enCurso} en curso ahora`
                  : metricas.ultimaSesion
                    ? `Última ${tiempoRelativo(metricas.ultimaSesion, ahora)}`
                    : 'Sin prácticas aún',
              tono: metricas.enCurso > 0 ? 'activo' : undefined,
            },
            {
              icono: ClipboardCheck,
              etiqueta: 'Por revisar',
              valor: metricas.pendientesRetroalimentacion,
              detalle:
                metricas.pendientesRetroalimentacion > 0
                  ? 'Esperan su retroalimentación'
                  : metricas.sesiones > 0
                    ? 'Al día con su grupo'
                    : 'Sin pendientes',
              tono: metricas.pendientesRetroalimentacion > 0 ? 'atencion' : undefined,
            },
            {
              icono: FileText,
              etiqueta: 'Casos propios',
              valor: metricas.casosPropios,
              detalle:
                metricas.casosPropios === 0
                  ? 'Usa solo los predefinidos'
                  : `${casosActivos} ${casosActivos === 1 ? 'activo' : 'activos'}`,
            },
          ]}
        />

        <SeccionesFichaDocente
          nombreDocente={docente.nombre}
          estudiantes={estudiantes}
          casos={casos}
          ahora={ahora}
        />
      </ContenedorHero>
    </div>
  );
}
