import {
  BookOpen,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  GraduationCap,
  KeyRound,
  Laptop,
  MessageSquareQuote,
  MessageSquareText,
  NotebookPen,
  Quote,
  UserCheck,
} from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';

import { CodigoCaso } from '@/components/casos/codigo-caso';
import { AyudaContextual } from '@/components/comun/ayuda-contextual';
import { IndicadorEnVivo } from '@/components/comun/indicador-en-vivo';
import { Indicadores } from '@/components/comun/indicadores';
import { MarcoHeroInicio } from '@/components/inicio/marco-hero';
import { AccionAbierta } from '@/components/practicas/accion-abierta';
import {
  type CodigoAsignadoVista,
  FormularioCodigo,
} from '@/components/practicas/formulario-codigo';
import {
  GuiaConsultorioEstudiante,
  HistorialPracticasEstudiante,
} from '@/components/practicas/historial-practicas-estudiante';
import { requerirEstudiante } from '@/lib/auth/dal';
import { formatearDuracion } from '@/lib/conversacion/resumen';
import { formatearDia, formatearNota } from '@/lib/estudiantes/estudiantes';
import { cierrePorInactividad, formatearHora } from '@/lib/fechas';
import { duracionSesion, esInterrupcionSinConversacion } from '@/lib/sesiones/estados';
import { obtenerPanelEstudiante, type PracticaEstudiante } from '@/lib/sesiones/queries';
import { cn } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'Mis prácticas',
};

/**
 * Panel del estudiante: en qué punto está cada práctica y qué hacer ahora. La práctica abierta va
 * primero con su plazo para volver; después, los indicadores clave, la última retroalimentación
 * publicada, el historial filtrable y, cuando aún no hay prácticas, una guía clara de preparación y
 * recorrido clínico.
 */
export default async function PracticasPage() {
  const perfil = await requerirEstudiante();
  const { practicas, codigosAsignados, docentesVinculados } = await obtenerPanelEstudiante();
  const ahora = new Date();

  const abierta = practicas.find(p => p.estado === 'en_curso') ?? null;
  const terminadas = practicas.filter(p => p.estado !== 'en_curso');
  const conConversacion = terminadas.filter(p => p.comenzada && !esInterrupcionSinConversacion(p));
  const conRetro = terminadas.filter(p => p.retroalimentacion?.publicada);
  const sinConversacion = terminadas.filter(
    p => !p.retroalimentacion?.publicada && esInterrupcionSinConversacion(p)
  );
  const esperando = terminadas.filter(p => !conRetro.includes(p) && !sinConversacion.includes(p));

  const notas = conRetro.flatMap(p =>
    p.retroalimentacion?.nota !== null && p.retroalimentacion?.nota !== undefined
      ? [p.retroalimentacion.nota]
      : []
  );
  const promedio = notas.length ? notas.reduce((a, b) => a + b, 0) / notas.length : null;

  const segundosTotales = conConversacion.reduce((acc, s) => acc + (duracionSesion(s) ?? 0), 0);
  const intervencionesTotales = conConversacion.reduce((acc, s) => acc + s.intervenciones, 0);
  const conNotasEnFrases = conRetro.filter(s => s.totalAnotaciones > 0).length;

  const ultimaConRetro = conRetro[0] ?? null;
  const pendienteReflexion = conConversacion.find(s => !s.tieneReflexion) ?? null;

  const competenciasPracticadas = Array.from(
    new Set(
      conConversacion
        .map(s => s.escenario.competenciaCentral?.trim() ?? '')
        .filter(c => c.length > 0)
    )
  );

  const primerNombre = perfil.nombre.trim().split(' ')[0] ?? perfil.nombre;
  const nombresDocentes = docentesVinculados.join(', ');

  return (
    <div className="flex flex-1 flex-col">
      <MarcoHeroInicio conBordeLateral={false} compacto>
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <h1 className="text-[2rem] leading-[1.05] font-bold tracking-[-0.025em] text-sidebar-foreground sm:text-[2.45rem]">
                Mis prácticas
              </h1>
              <AyudaContextual
                etiqueta="Qué es Mis prácticas"
                texto="Aquí entras al consultorio 3D con los códigos de acceso de tu docente, escribes tu reflexión al terminar cada entrevista y revisas las observaciones publicadas sobre tus frases."
                className="text-sidebar-muted hover:bg-white/10 hover:text-sidebar-foreground"
              />
            </div>
            <p className="text-base text-sidebar-muted sm:text-lg">
              Hola, <span className="font-medium text-sidebar-foreground">{primerNombre}</span>.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {perfil.codigoInstitucional && (
              <span className="inline-flex items-center rounded-lg border border-sidebar-border bg-sidebar-accent px-2.5 py-1 font-mono text-xs text-sidebar-foreground tabular-nums">
                Código estudiantil {perfil.codigoInstitucional}
              </span>
            )}
            {docentesVinculados.length > 0 && (
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-sidebar-border bg-sidebar-accent px-2.5 py-1 text-xs text-sidebar-muted">
                <GraduationCap className="size-3.5 text-laton-texto" aria-hidden />
                {docentesVinculados.length === 1 ? 'Docente:' : 'Docentes:'}{' '}
                <strong className="font-semibold text-sidebar-foreground">{nombresDocentes}</strong>
              </span>
            )}
            {codigosAsignados.length > 0 && (
              <span className="inline-flex items-center rounded-lg border border-laton/40 bg-sidebar-accent px-2.5 py-1 text-xs font-semibold text-laton-texto">
                {codigosAsignados.length}{' '}
                {codigosAsignados.length === 1
                  ? 'código asignado listo'
                  : 'códigos asignados listos'}
              </span>
            )}
          </div>
        </header>
      </MarcoHeroInicio>

      {/* Las tarjetas superiores suben sobre la franja de nogal para destacar lo más urgente. */}
      <div className="relative z-10 mx-auto -mt-10 flex w-full max-w-[1400px] flex-col gap-8 px-4 pb-10 sm:-mt-14 sm:px-6 sm:pb-12">
        {abierta && <BloqueAbierta sesion={abierta} ahora={ahora} />}

        {practicas.length > 0 && (
          <Indicadores
            className={abierta === null ? 'shadow-[0_24px_48px_-24px_rgb(0_0_0/0.45)]' : undefined}
            indicadores={[
              {
                icono: CheckCircle2,
                etiqueta: 'Prácticas terminadas',
                valor: conConversacion.length,
                detalle:
                  esperando.length > 0
                    ? `${esperando.length} esperando revisión`
                    : 'Todas revisadas por tu docente',
                ayuda:
                  'Entrevistas clínicas en las que conversaste con el paciente y ya terminaron.',
              },
              {
                icono: MessageSquareQuote,
                etiqueta: 'Retroalimentaciones',
                valor: conRetro.length,
                detalle:
                  conNotasEnFrases > 0
                    ? `${conNotasEnFrases} con notas en tus frases`
                    : 'Publicadas por tu docente',
                ayuda:
                  'Prácticas en las que tu docente ya publicó su comentario general y observaciones.',
              },
              {
                icono: ClipboardCheck,
                etiqueta: 'Promedio publicado',
                valor: promedio !== null ? formatearNota(Math.round(promedio * 10) / 10) : '—',
                detalle:
                  notas.length > 0
                    ? `Sobre 5,0 (${notas.length} ${notas.length === 1 ? 'calificada' : 'calificadas'})`
                    : 'Cuando tu docente califique',
                ayuda:
                  'Promedio simple de las calificaciones publicadas por tu docente en escala de 0,0 a 5,0.',
              },
              {
                icono: Clock,
                etiqueta: 'Tiempo de entrevista',
                valor: segundosTotales > 0 ? formatearDuracion(segundosTotales) : '0 min',
                detalle:
                  intervencionesTotales > 0
                    ? `${intervencionesTotales} ${intervencionesTotales === 1 ? 'intervención enviada' : 'intervenciones enviadas'}`
                    : 'Tiempo total en consultorio',
                ayuda: 'Suma del tiempo conversado con el paciente en tus prácticas terminadas.',
              },
            ]}
          />
        )}

        {/* El bloque del código va primero en el orden del documento para que en el celular no
            quede debajo de todo el historial; desde 1024 px la rejilla lo sube a la derecha. */}
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.6fr)_minmax(20rem,1fr)] lg:grid-rows-[auto_1fr] lg:items-start">
          <BloqueCodigo
            destacado={abierta === null}
            sobreMadera={abierta === null && practicas.length === 0}
            correo={perfil.correo}
            codigosAsignados={codigosAsignados}
          />

          <div className="flex min-w-0 flex-col gap-6 lg:col-start-1 lg:row-span-2 lg:row-start-1">
            {practicas.length === 0 ? (
              <EstadoInicialEstudiante
                tieneCodigosAsignados={codigosAsignados.length > 0}
                elevada={abierta === null}
              />
            ) : (
              <>
                {ultimaConRetro && <DestacadoUltimaRetroalimentacion sesion={ultimaConRetro} />}

                {pendienteReflexion && (
                  <section className="flex flex-col gap-3 rounded-2xl border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-3">
                      <NotebookPen className="mt-0.5 size-4 shrink-0 text-laton" aria-hidden />
                      <div className="space-y-0.5">
                        <h2 className="text-sm font-semibold text-foreground">
                          Reflexión pendiente sobre tu entrevista
                        </h2>
                        <p className="text-xs text-muted-foreground">
                          Aún no has escrito qué harías distinto en{' '}
                          <span className="font-medium text-foreground">
                            {pendienteReflexion.escenario.codigo} ·{' '}
                            {pendienteReflexion.escenario.titulo}
                          </span>
                          .
                        </p>
                      </div>
                    </div>
                    <Link
                      href={`/resultados?sesion=${pendienteReflexion.id}`}
                      className="inline-flex min-h-8 shrink-0 items-center rounded-lg border bg-background px-3 py-1 text-xs font-semibold text-foreground transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-hidden"
                    >
                      Escribir reflexión
                    </Link>
                  </section>
                )}

                <HistorialPracticasEstudiante practicas={practicas} promedio={promedio} />
              </>
            )}
          </div>

          <aside className="flex flex-col gap-6 lg:col-start-2 lg:row-start-2">
            <section
              aria-labelledby="ficha-estudiante-titulo"
              className="flex flex-col gap-3 rounded-2xl border bg-card p-5"
            >
              <div className="flex items-center gap-2">
                <BookOpen className="size-4 text-salvia" aria-hidden />
                <h2
                  id="ficha-estudiante-titulo"
                  className="text-sm font-bold tracking-[-0.01em] text-foreground"
                >
                  Tu ficha académica
                </h2>
              </div>

              <dl className="space-y-2.5 text-xs">
                <div className="flex items-baseline justify-between gap-2 border-b pb-2">
                  <dt className="text-muted-foreground">Estudiante</dt>
                  <dd className="text-right font-semibold text-foreground">{perfil.nombre}</dd>
                </div>
                {perfil.codigoInstitucional && (
                  <div className="flex items-baseline justify-between gap-2 border-b pb-2">
                    <dt className="text-muted-foreground">Código estudiantil</dt>
                    <dd className="font-mono text-foreground tabular-nums">
                      {perfil.codigoInstitucional}
                    </dd>
                  </div>
                )}
                <div className="flex items-baseline justify-between gap-2 border-b pb-2">
                  <dt className="text-muted-foreground">Correo institucional</dt>
                  <dd className="truncate font-mono text-foreground">{perfil.correo}</dd>
                </div>
                <div className="flex items-baseline justify-between gap-2">
                  <dt className="text-muted-foreground">
                    {docentesVinculados.length === 1 ? 'Docente a cargo' : 'Docentes a cargo'}
                  </dt>
                  <dd className="text-right font-semibold text-foreground">
                    {docentesVinculados.length > 0
                      ? nombresDocentes
                      : 'Pendiente de vinculación por tu docente'}
                  </dd>
                </div>
              </dl>

              {competenciasPracticadas.length > 0 && (
                <div className="mt-1 border-t pt-3">
                  <p className="text-xs font-semibold text-muted-foreground">
                    Competencias practicadas ({competenciasPracticadas.length})
                  </p>
                  <ul className="mt-2 flex flex-wrap gap-1.5">
                    {competenciasPracticadas.slice(0, 8).map(comp => (
                      <li
                        key={comp}
                        className="rounded-md border bg-muted/40 px-2 py-0.5 text-xs text-foreground"
                      >
                        {comp}
                      </li>
                    ))}
                  </ul>
                  {competenciasPracticadas.length > 8 && (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-xs font-semibold text-foreground underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-hidden">
                        Ver las {competenciasPracticadas.length - 8} competencias restantes
                      </summary>
                      <ul className="mt-2 flex flex-wrap gap-1.5">
                        {competenciasPracticadas.slice(8).map(comp => (
                          <li
                            key={comp}
                            className="rounded-md border bg-muted/40 px-2 py-0.5 text-xs text-foreground"
                          >
                            {comp}
                          </li>
                        ))}
                      </ul>
                    </details>
                  )}
                </div>
              )}
            </section>

            {practicas.length > 0 && <GuiaConsultorioEstudiante />}
          </aside>
        </div>
      </div>
    </div>
  );
}

/**
 * Donde empieza toda práctica. Sin práctica abierta es la acción principal de la vista y va sobre
 * la madera, como el bloque «Tengo un código» del inicio; con una abierta, esa práctica toma el
 * protagonismo y el código baja a una tarjeta de lino.
 */
function BloqueCodigo({
  destacado,
  sobreMadera = false,
  correo,
  codigosAsignados,
}: {
  destacado: boolean;
  sobreMadera?: boolean;
  correo: string | null;
  codigosAsignados: CodigoAsignadoVista[];
}) {
  const ayuda =
    'Tu docente genera un código de acceso para cada caso clínico. Si te lo asignó a tu ficha, aparece en este bloque para cargarlo con un clic.';
  const formulario = (
    <FormularioCodigo correo={correo} variante="practicas" codigosAsignados={codigosAsignados} />
  );

  if (destacado === false) {
    return (
      <section
        aria-labelledby="codigo-titulo"
        className="flex flex-col gap-3 lg:col-start-2 lg:row-start-1"
      >
        <div className="flex items-center justify-between gap-2">
          <h2 id="codigo-titulo" className="text-xl font-bold tracking-[-0.015em]">
            ¿Tienes otro código?
          </h2>
          <AyudaContextual etiqueta="Cómo usar un código" texto={ayuda} />
        </div>
        <div className="rounded-2xl border bg-card p-5">{formulario}</div>
      </section>
    );
  }

  if (sobreMadera) {
    return (
      <section
        aria-labelledby="codigo-titulo"
        className="flex flex-col gap-4 rounded-2xl border bg-card p-5 text-card-foreground shadow-[0_24px_48px_-24px_rgb(0_0_0/0.45)] sm:p-6 lg:col-start-2 lg:row-start-1"
      >
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between gap-2">
            <h2
              id="codigo-titulo"
              className="flex items-center gap-2 text-xl font-bold tracking-[-0.015em]"
            >
              <KeyRound className="size-5 text-laton" aria-hidden />
              Entra al consultorio
            </h2>
            <AyudaContextual etiqueta="Cómo usar un código" texto={ayuda} />
          </div>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Con el código de tu docente abres el caso y conversas con el paciente.
          </p>
        </div>
        {formulario}
      </section>
    );
  }

  return (
    <section
      aria-labelledby="codigo-titulo"
      className="flex flex-col gap-4 rounded-2xl vetas-nogal p-4 text-sidebar-foreground sm:p-5 lg:col-start-2 lg:row-start-1"
    >
      <div className="flex flex-col gap-1.5 px-1">
        <div className="flex items-center justify-between gap-2">
          <h2
            id="codigo-titulo"
            className="flex items-center gap-2 text-xl font-bold tracking-[-0.015em]"
          >
            <KeyRound className="size-5 text-laton-texto" aria-hidden />
            Entra al consultorio
          </h2>
          <AyudaContextual
            etiqueta="Cómo usar un código"
            texto={ayuda}
            className="text-sidebar-muted hover:bg-white/10 hover:text-sidebar-foreground"
          />
        </div>
        <p className="text-sm leading-relaxed text-sidebar-foreground/85">
          Con el código de tu docente abres el caso y conversas con el paciente.
        </p>
      </div>
      <div className="rounded-xl bg-card p-5 text-card-foreground shadow-[0_24px_48px_-24px_rgb(0_0_0/0.55)]">
        {formulario}
      </div>
    </section>
  );
}

/** La práctica abierta: flota sobre la franja superior cuando hay una entrevista en curso. */
function BloqueAbierta({ sesion, ahora }: { sesion: PracticaEstudiante; ahora: Date }) {
  const plazo = cierrePorInactividad(sesion.ultimaActividad);
  const cerrandose = plazo < ahora;
  return (
    <section
      aria-labelledby="abierta-titulo"
      className="relative overflow-hidden rounded-2xl border-2 border-salvia/55 bg-card p-6 text-card-foreground shadow-[0_24px_48px_-24px_rgb(0_0_0/0.45)] sm:p-7"
    >
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-2">
          <h2
            id="abierta-titulo"
            className="inline-flex w-fit items-center gap-1.5 rounded-full bg-salvia-suave px-2.5 py-0.5 text-xs font-semibold text-salvia-oscuro"
          >
            <IndicadorEnVivo animado={sesion.comenzada} className="size-3.5 text-salvia-oscuro" />
            Abierta ahora
          </h2>
          <p className="text-2xl leading-tight font-bold tracking-[-0.015em] text-foreground">
            <CodigoCaso
              codigo={sesion.escenario.codigo}
              className="mr-2 font-mono text-base font-medium text-muted-foreground"
            />
            {sesion.escenario.titulo}
          </p>
          {(sesion.escenario.paciente || sesion.escenario.competenciaCentral) && (
            <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              {sesion.escenario.paciente && (
                <span>
                  Paciente:{' '}
                  <span className="font-medium text-terracota">{sesion.escenario.paciente}</span>
                </span>
              )}
              {sesion.escenario.competenciaCentral && (
                <span>Competencia: {sesion.escenario.competenciaCentral}</span>
              )}
            </p>
          )}
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="size-4 shrink-0 text-laton" aria-hidden />
            {cerrandose
              ? sesion.comenzada
                ? 'Se está cerrando por inactividad. Tu docente revisará lo que alcanzaste a conversar.'
                : 'Se está cerrando por inactividad. Si aún debes hacerla, pídele un código nuevo a tu docente.'
              : sesion.comenzada
                ? `En curso · vuelve antes de las ${formatearHora(plazo)} para continuar donde ibas.`
                : `Sin empezar · vuelve antes de las ${formatearHora(plazo)}. Después se cierra y el código deja de servir.`}
          </p>
        </div>
        {cerrandose === false && (
          <AccionAbierta
            href={`/simulacion?sesion=${sesion.id}`}
            etiqueta={sesion.comenzada ? 'Continuar práctica' : 'Empezar práctica'}
            plazo={formatearHora(plazo)}
          />
        )}
      </div>
    </section>
  );
}

function DestacadoUltimaRetroalimentacion({ sesion }: { sesion: PracticaEstudiante }) {
  const retro = sesion.retroalimentacion;
  if (!retro?.publicada) return null;

  const fechaPublicacion = retro.publicadaEn ?? sesion.fin ?? sesion.inicio;
  const comentario = retro.comentarioGeneral?.trim() ?? null;

  return (
    <section
      aria-labelledby="ultima-retro-titulo"
      className="grid gap-5 rounded-2xl border border-salvia/35 bg-salvia-suave/35 p-5 lg:grid-cols-[minmax(0,1fr)_16rem] lg:gap-6"
    >
      <div className="flex min-w-0 flex-col gap-3">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="inline-flex items-center rounded-md bg-salvia-suave px-2 py-0.5 text-xs font-semibold text-salvia-oscuro">
            Última retroalimentación
          </span>
          <span className="text-xs text-muted-foreground tabular-nums">
            Publicada el {formatearDia(fechaPublicacion)}
          </span>
        </div>

        <div className="flex flex-col gap-1.5">
          <h2 id="ultima-retro-titulo" className="text-xl font-bold tracking-[-0.015em]">
            <CodigoCaso
              codigo={sesion.escenario.codigo}
              className="mr-1.5 font-mono text-xs font-medium text-muted-foreground"
            />
            {sesion.escenario.titulo}
          </h2>
          {/* Sin «·» entre los datos: al saltar de línea el separador quedaba suelto. */}
          <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            {sesion.escenario.paciente && (
              <span>
                Paciente:{' '}
                <span className="font-medium text-terracota">{sesion.escenario.paciente}</span>
              </span>
            )}
            {sesion.docente && <span>Docente: {sesion.docente}</span>}
            {sesion.totalAnotaciones > 0 && (
              <span className="inline-flex items-center gap-1 font-semibold text-foreground">
                <MessageSquareText className="size-3.5 text-salvia" aria-hidden />
                {sesion.totalAnotaciones}{' '}
                {sesion.totalAnotaciones === 1
                  ? 'comentario en tus frases'
                  : 'comentarios en tus frases'}
              </span>
            )}
          </p>
        </div>

        {comentario && (
          <figure className="flex gap-3 rounded-lg border border-salvia/40 bg-card/85 p-3.5">
            <Quote className="mt-0.5 size-4 shrink-0 text-salvia" aria-hidden />
            <div className="min-w-0">
              <figcaption className="text-xs font-semibold text-muted-foreground">
                Comentario general
              </figcaption>
              <blockquote className="mt-1 line-clamp-4 text-sm leading-relaxed text-pretty text-foreground">
                {comentario}
              </blockquote>
            </div>
          </figure>
        )}
      </div>

      <div className="flex flex-col justify-center gap-3 border-t border-salvia/30 pt-4 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-6">
        {retro.nota !== null && (
          <div className="rounded-lg border bg-card px-4 py-3 text-center">
            <p className="text-xs text-muted-foreground">Nota publicada</p>
            <p className="mt-1 text-3xl leading-none font-semibold ancho-semiexpandido tabular-nums">
              {formatearNota(retro.nota)}
              <span className="ml-1 text-xs font-normal text-muted-foreground">de 5,0</span>
            </p>
          </div>
        )}
        <Link
          href={`/practicas/${sesion.id}`}
          className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg bg-salvia-suave px-3.5 py-1.5 text-xs font-semibold text-salvia-oscuro transition-colors hover:bg-salvia-suave/80 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-hidden"
        >
          <MessageSquareQuote className="size-3.5" aria-hidden />
          Abrir retroalimentación completa
        </Link>
      </div>
    </section>
  );
}

function EstadoInicialEstudiante({
  tieneCodigosAsignados,
  elevada = false,
}: {
  tieneCodigosAsignados: boolean;
  elevada?: boolean;
}) {
  return (
    <div className="flex flex-col gap-6">
      <section
        className={cn(
          'flex flex-col gap-2 rounded-2xl border bg-card p-6',
          elevada && 'shadow-[0_24px_48px_-24px_rgb(0_0_0/0.45)]'
        )}
      >
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={
              tieneCodigosAsignados
                ? 'inline-flex items-center rounded-md bg-salvia-suave px-2 py-0.5 text-xs font-semibold text-salvia-oscuro'
                : 'inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground'
            }
          >
            {tieneCodigosAsignados ? 'Código listo para usar' : 'Primeros pasos'}
          </span>
          <h2 className="text-lg font-bold">Aún no tienes prácticas</h2>
        </div>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Cuando tu docente te envíe un código, escríbelo en{' '}
          <strong className="font-semibold text-foreground">Entra al consultorio</strong> o abre el
          enlace que te mandó desde un computador.
        </p>
        {tieneCodigosAsignados && (
          <p className="mt-2 rounded-lg border border-salvia/30 bg-salvia-suave/60 px-3.5 py-2.5 text-xs leading-relaxed text-salvia-oscuro">
            Tu docente ya dejó un código de práctica activo en el bloque{' '}
            <strong className="font-semibold">Entra al consultorio</strong>. Pulsa{' '}
            <strong className="font-semibold">Cargar código</strong> para ver la ficha del paciente
            y entrar al consultorio.
          </p>
        )}
      </section>

      <section className="rounded-2xl border bg-card p-6">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-bold">Cómo es una práctica en PsySim</h2>
          <span className="text-xs font-medium text-muted-foreground">3 etapas</span>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Cada entrevista clínica sigue este recorrido de principio a fin.
        </p>

        <ol className="mt-5 grid gap-5 border-t-2 border-laton pt-4 sm:grid-cols-3">
          <li className="space-y-1.5">
            <p className="font-mono text-xs font-semibold tracking-wider text-laton uppercase">
              Paso 1 · Preparación
            </p>
            <h3 className="text-sm font-bold text-foreground">Lee la ficha clínica</h3>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Al validar tu código conocerás el nombre del paciente, su edad, el motivo de consulta
              y la competencia clínica que vas a trabajar antes de abrir la puerta del consultorio.
            </p>
          </li>

          <li className="space-y-1.5">
            <p className="font-mono text-xs font-semibold tracking-wider text-laton uppercase">
              Paso 2 · Entrevista
            </p>
            <h3 className="text-sm font-bold text-foreground">Conversa en el consultorio 3D</h3>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Dentro del consultorio conduces la entrevista por escrito o con tu micrófono. El
              paciente responde según tu trato, tus preguntas y tu escucha clínica.
            </p>
          </li>

          <li className="space-y-1.5">
            <p className="font-mono text-xs font-semibold tracking-wider text-laton uppercase">
              Paso 3 · Cierre y revisión
            </p>
            <h3 className="text-sm font-bold text-foreground">Reflexiona y lee a tu docente</h3>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Al terminar registras tu propia reflexión sobre la entrevista. Después, tu docente
              revisa la conversación y publica sus comentarios en tus frases.
            </p>
          </li>
        </ol>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
          Antes de entrar al consultorio
        </h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border bg-card p-4">
            <div className="flex items-center gap-2 text-xs font-bold text-foreground">
              <Laptop className="size-4 text-salvia" aria-hidden />
              <h3>En un computador</h3>
            </div>
            <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
              El consultorio 3D se abre en computadores de escritorio o portátiles. Desde el celular
              puedes revisar tus prácticas y leer las retroalimentaciones.
            </p>
          </div>

          <div className="rounded-xl border bg-card p-4">
            <div className="flex items-center gap-2 text-xs font-bold text-foreground">
              <Clock className="size-4 text-laton" aria-hidden />
              <h3>Pausa máxima de 10 min</h3>
            </div>
            <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
              Puedes pensar cada intervención con calma. Si pasan 10 minutos seguidos sin actividad,
              la práctica se cierra automáticamente.
            </p>
          </div>

          <div className="rounded-xl border bg-card p-4">
            <div className="flex items-center gap-2 text-xs font-bold text-foreground">
              <UserCheck className="size-4 text-terracota" aria-hidden />
              <h3>Revisión hecha por tu docente</h3>
            </div>
            <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
              La plataforma nunca evalúa tus respuestas con IA. Solo tu docente califica y comenta
              tu entrevista.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
