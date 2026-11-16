'use client';

import { ArrowRight, ChevronDown, MessageSquareText, Search, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';

import { CodigoCaso } from '@/components/casos/codigo-caso';
import { AyudaContextual } from '@/components/comun/ayuda-contextual';
import { Desplegable } from '@/components/comun/desplegable';
import { PistaSegmentada } from '@/components/comun/pista-segmentada';
import { Input } from '@/components/ui/input';
import { formatearDuracion } from '@/lib/conversacion/resumen';
import { formatearDia, formatearNota } from '@/lib/estudiantes/estudiantes';
import { duracionSesion } from '@/lib/sesiones/estados';
import { cn } from '@/lib/utils';
import { type EstadoSesion } from '@/types';

export interface PracticaEstudianteVista {
  id: string;
  estado: EstadoSesion;
  comenzada: boolean;
  inicio: string;
  fin: string | null;
  ultimaActividad: string;
  escenario: {
    codigo: string;
    titulo: string;
    competenciaCentral: string | null;
    paciente: string | null;
  };
  docente: string | null;
  retroalimentacion: {
    publicada: boolean;
    nota: number | null;
    comentarioGeneral: string | null;
    publicadaEn: string | null;
  } | null;
  totalIntervenciones: number;
  totalAnotaciones: number;
  tieneReflexion: boolean;
}

type FiltroHistorial = 'todas' | 'con_retro' | 'esperando' | 'sin_conversacion';

/** Prácticas visibles por grupo; las más antiguas se despliegan a pedido. */
const FILAS_POR_GRUPO = 6;

function FilaPractica({ sesion }: { sesion: PracticaEstudianteVista }) {
  const duracion = duracionSesion(sesion);
  const publicada = sesion.retroalimentacion?.publicada ?? false;
  const sinConversacion = sesion.estado === 'interrumpida' && !sesion.comenzada;
  const comentario = sesion.retroalimentacion?.comentarioGeneral?.trim() ?? null;
  const intervenciones = sesion.comenzada ? sesion.totalIntervenciones : 0;

  return (
    // Una tarjeta, una lectura: estado y fecha, el caso, quién y cuánto, y a la derecha lo único
    // que se hace aquí (la nota y la acción principal). El detalle completo vive en la página de
    // la práctica; la reflexión pasó de etiqueta a enlace secundario.
    <li className="grid gap-4 px-4 py-4 transition-colors hover:bg-muted/40 sm:px-6 sm:py-5 md:grid-cols-[minmax(0,1fr)_13rem] md:items-center md:gap-8">
      <div className="flex min-w-0 flex-col gap-2">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span
            className={cn(
              'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold',
              sinConversacion
                ? 'bg-muted text-muted-foreground'
                : publicada
                  ? 'bg-salvia-suave text-salvia-oscuro'
                  : 'bg-ambar-suave text-ambar'
            )}
          >
            {sinConversacion
              ? 'Sin conversación'
              : publicada
                ? 'Con retroalimentación'
                : 'Esperando retroalimentación'}
          </span>
          <span className="text-xs text-muted-foreground tabular-nums">
            {formatearDia(sesion.fin ?? sesion.inicio)}
          </span>
        </div>

        <p className="text-base leading-snug font-semibold text-foreground">
          <CodigoCaso
            codigo={sesion.escenario.codigo}
            className="mr-1.5 font-mono text-xs font-medium text-muted-foreground"
          />
          {sesion.escenario.titulo}
        </p>

        {/* Sin «·» entre los datos: al saltar de línea el separador quedaba suelto al final. */}
        <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground tabular-nums">
          {sinConversacion ? (
            <span>Se cerró antes de que conversaras.</span>
          ) : (
            <>
              {sesion.escenario.paciente && (
                <span className="font-medium text-terracota">{sesion.escenario.paciente}</span>
              )}
              {sesion.docente && <span>Docente: {sesion.docente}</span>}
              {duracion !== null && <span>{formatearDuracion(duracion)}</span>}
              {intervenciones > 0 && (
                <span>
                  {intervenciones} {intervenciones === 1 ? 'intervención' : 'intervenciones'}
                </span>
              )}
              {sesion.estado === 'interrumpida' && <span>Se cerró antes de terminar</span>}
            </>
          )}
        </p>

        {publicada && comentario && (
          <p className="flex gap-2 border-l-2 border-salvia/50 pl-3 text-sm leading-relaxed text-foreground">
            <span className="line-clamp-2">{comentario}</span>
          </p>
        )}
        {publicada && sesion.totalAnotaciones > 0 && (
          <p className="flex items-center gap-1.5 text-sm font-medium text-foreground">
            <MessageSquareText className="size-4 text-salvia" aria-hidden />
            {sesion.totalAnotaciones}{' '}
            {sesion.totalAnotaciones === 1
              ? 'comentario en tus frases'
              : 'comentarios en tus frases'}
          </p>
        )}
      </div>

      {!sinConversacion && (
        <div className="flex flex-col gap-3 md:items-stretch md:text-center">
          {publicada && (
            <p className="flex items-baseline gap-1.5 md:flex-col md:items-center md:gap-0">
              <span className="text-2xl leading-none font-semibold ancho-semiexpandido tabular-nums">
                {formatearNota(sesion.retroalimentacion?.nota ?? null)}
              </span>
              <span className="text-xs text-muted-foreground">de 5,0</span>
            </p>
          )}
          <Link
            href={`/practicas/${sesion.id}`}
            className={cn(
              'inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-hidden',
              publicada
                ? 'bg-salvia-suave text-salvia-oscuro hover:bg-salvia-suave/80'
                : 'border bg-card text-foreground hover:bg-muted'
            )}
          >
            {publicada ? 'Leer retroalimentación' : 'Ver práctica'}
            <span className="sr-only">: {sesion.escenario.titulo}</span>
            <ArrowRight className="size-4" aria-hidden />
          </Link>
          <Link
            href={`/resultados?sesion=${sesion.id}`}
            className="rounded-md text-center text-sm font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-hidden"
          >
            {sesion.tieneReflexion ? 'Ver mi reflexión' : 'Escribir reflexión'}
          </Link>
        </div>
      )}
    </li>
  );
}

/** Opción del filtro de estado: etiqueta en una línea y la cantidad aparte, en cifra tabular. */
function OpcionFiltro({
  activo,
  onSelect,
  etiqueta,
  total,
}: {
  activo: boolean;
  onSelect: () => void;
  etiqueta: string;
  total: number;
}) {
  return (
    <button
      type="button"
      aria-pressed={activo}
      onClick={onSelect}
      className={cn(
        'inline-flex min-h-8 items-center justify-center gap-1.5 rounded-lg px-3 py-1 text-xs font-semibold whitespace-nowrap transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-hidden',
        activo ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
      )}
    >
      {etiqueta}
      <span
        className={cn(
          'rounded-full px-1.5 text-xs leading-5 tabular-nums',
          activo ? 'bg-muted text-foreground' : 'bg-muted/70'
        )}
      >
        {total}
      </span>
    </button>
  );
}

function Grupo({
  titulo,
  ayuda,
  sesiones,
  extra,
}: {
  titulo: string;
  ayuda?: string;
  sesiones: PracticaEstudianteVista[];
  extra?: React.ReactNode;
}) {
  const [expandido, setExpandido] = useState(false);

  if (sesiones.length === 0) return null;
  const id = `grupo-${titulo.toLowerCase().replaceAll(' ', '-')}`;
  const visibles = sesiones.slice(0, FILAS_POR_GRUPO);
  const ocultas = sesiones.slice(FILAS_POR_GRUPO);

  return (
    <section aria-labelledby={id} className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <div className="flex items-center gap-1.5">
          <h2 id={id} className="text-xl font-bold tracking-[-0.015em]">
            {titulo}{' '}
            <span className="text-sm font-semibold text-muted-foreground tabular-nums">
              {sesiones.length}
            </span>
          </h2>
          {ayuda && <AyudaContextual etiqueta={`Qué es ${titulo}`} texto={ayuda} />}
        </div>
        {extra}
      </div>

      <ol className="flex flex-col divide-y overflow-hidden rounded-xl border bg-card">
        {visibles.map(sesion => (
          <FilaPractica key={sesion.id} sesion={sesion} />
        ))}
      </ol>

      {ocultas.length > 0 && (
        <div className="flex flex-col">
          <Desplegable abierto={expandido}>
            <div className="pt-3">
              <ol className="flex flex-col divide-y overflow-hidden rounded-xl border bg-card">
                {ocultas.map(sesion => (
                  <FilaPractica key={sesion.id} sesion={sesion} />
                ))}
              </ol>
            </div>
          </Desplegable>
          <button
            type="button"
            aria-expanded={expandido}
            onClick={() => setExpandido(v => !v)}
            className="mt-2 flex min-h-8 w-fit items-center gap-1.5 rounded-md px-1 text-sm font-semibold underline-offset-4 outline-hidden hover:underline focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span>
              {expandido
                ? 'Ocultar las anteriores'
                : `Ver ${ocultas.length === 1 ? 'la anterior' : `las ${ocultas.length} anteriores`}`}
            </span>
            <ChevronDown
              className={cn('size-4 transition-transform', expandido && 'rotate-180')}
              aria-hidden
            />
          </button>
        </div>
      )}
    </section>
  );
}

export function HistorialPracticasEstudiante({
  practicas,
  promedio,
}: {
  practicas: PracticaEstudianteVista[];
  promedio: number | null;
}) {
  const [filtro, setFiltro] = useState<FiltroHistorial>('todas');
  const [busqueda, setBusqueda] = useState('');

  const terminadas = useMemo(() => practicas.filter(p => p.estado !== 'en_curso'), [practicas]);

  const termino = busqueda.trim().toLowerCase();

  const filtradasPorTexto = useMemo(() => {
    if (!termino) return terminadas;
    return terminadas.filter(s => {
      const codigo = s.escenario.codigo.toLowerCase();
      const titulo = s.escenario.titulo.toLowerCase();
      const paciente = s.escenario.paciente?.toLowerCase() ?? '';
      const competencia = s.escenario.competenciaCentral?.toLowerCase() ?? '';
      const docente = s.docente?.toLowerCase() ?? '';
      const comentario = s.retroalimentacion?.comentarioGeneral?.toLowerCase() ?? '';
      return (
        codigo.includes(termino) ||
        titulo.includes(termino) ||
        paciente.includes(termino) ||
        competencia.includes(termino) ||
        docente.includes(termino) ||
        comentario.includes(termino)
      );
    });
  }, [terminadas, termino]);

  const conRetro = useMemo(
    () => filtradasPorTexto.filter(p => p.retroalimentacion?.publicada),
    [filtradasPorTexto]
  );
  const sinConversacion = useMemo(
    () =>
      filtradasPorTexto.filter(
        p => !p.retroalimentacion?.publicada && p.estado === 'interrumpida' && !p.comenzada
      ),
    [filtradasPorTexto]
  );
  const esperando = useMemo(
    () => filtradasPorTexto.filter(p => !conRetro.includes(p) && !sinConversacion.includes(p)),
    [filtradasPorTexto, conRetro, sinConversacion]
  );

  const totalConRetro = terminadas.filter(p => p.retroalimentacion?.publicada).length;
  const totalSinConversacion = terminadas.filter(
    p => !p.retroalimentacion?.publicada && p.estado === 'interrumpida' && !p.comenzada
  ).length;
  const totalEsperando = terminadas.length - totalConRetro - totalSinConversacion;

  if (terminadas.length === 0) return null;

  const mostrarControles = terminadas.length >= 2;
  const mostrarBuscador = terminadas.length >= 3;

  const extraPromedio = promedio !== null && (
    <p className="text-sm text-muted-foreground">
      Promedio de tus notas publicadas:{' '}
      <span className="font-semibold text-foreground tabular-nums">
        {formatearNota(Math.round(promedio * 10) / 10)}
      </span>
    </p>
  );

  const listaSegunFiltro =
    filtro === 'con_retro'
      ? conRetro
      : filtro === 'esperando'
        ? esperando
        : filtro === 'sin_conversacion'
          ? sinConversacion
          : filtradasPorTexto;

  return (
    <div className="flex flex-col gap-6">
      {mostrarControles && (
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <PistaSegmentada
            role="group"
            aria-label="Filtrar prácticas por estado"
            claseIndicador="rounded-lg bg-card shadow-xs"
            // En celular, rejilla de dos columnas (una fila de cuatro opciones no cabe y se
            // rompía); desde 640 px, una sola fila. La última opción sola ocupa el ancho completo.
            className="grid grid-cols-2 gap-1 rounded-xl border bg-muted/60 p-1 sm:flex sm:self-start [&>:last-child:nth-child(odd)]:col-span-2"
          >
            <OpcionFiltro
              activo={filtro === 'todas'}
              onSelect={() => setFiltro('todas')}
              etiqueta="Todas"
              total={terminadas.length}
            />
            <OpcionFiltro
              activo={filtro === 'con_retro'}
              onSelect={() => setFiltro('con_retro')}
              etiqueta="Con retroalimentación"
              total={totalConRetro}
            />
            <OpcionFiltro
              activo={filtro === 'esperando'}
              onSelect={() => setFiltro('esperando')}
              etiqueta="Esperando revisión"
              total={totalEsperando}
            />
            {totalSinConversacion > 0 && (
              <OpcionFiltro
                activo={filtro === 'sin_conversacion'}
                onSelect={() => setFiltro('sin_conversacion')}
                etiqueta="Sin conversación"
                total={totalSinConversacion}
              />
            )}
          </PistaSegmentada>

          {mostrarBuscador && (
            <div className="relative w-full lg:w-80 lg:shrink-0">
              <label htmlFor="buscar-practica-estudiante" className="sr-only">
                Buscar por caso, paciente o docente
              </label>
              <Search
                className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                id="buscar-practica-estudiante"
                type="search"
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
                placeholder="Buscar caso, paciente o docente…"
                className="h-10 pl-9 text-sm"
              />
            </div>
          )}
        </div>
      )}

      {listaSegunFiltro.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-card/50 p-6 text-center">
          <p className="text-sm font-semibold text-foreground">
            No encontramos prácticas con este filtro.
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Prueba mostrando todas las prácticas o cambiando el texto de búsqueda.
          </p>
          {(filtro !== 'todas' || termino.length > 0) && (
            <button
              type="button"
              onClick={() => {
                setFiltro('todas');
                setBusqueda('');
              }}
              className="mt-3 inline-flex min-h-8 items-center rounded-lg border bg-background px-3 py-1 text-xs font-semibold text-foreground transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-hidden"
            >
              Ver todas las prácticas
            </button>
          )}
        </div>
      ) : filtro === 'todas' ? (
        <div className="flex flex-col gap-8">
          <Grupo
            titulo="Esperando retroalimentación"
            ayuda="Prácticas terminadas cuya conversación ya está lista para que tu docente la revise y publique sus observaciones."
            sesiones={esperando}
          />
          <Grupo
            titulo="Con retroalimentación"
            ayuda="Prácticas revisadas por tu docente. Abre cada una para leer su comentario general y las notas sobre tus frases."
            sesiones={conRetro}
            extra={extraPromedio}
          />
          <Grupo
            titulo="Sin conversación"
            ayuda="Prácticas que se cerraron antes de que enviaras tu primera intervención al paciente."
            sesiones={sinConversacion}
          />
        </div>
      ) : (
        <Grupo
          titulo={
            filtro === 'con_retro'
              ? 'Con retroalimentación'
              : filtro === 'esperando'
                ? 'Esperando retroalimentación'
                : 'Sin conversación'
          }
          sesiones={listaSegunFiltro}
          extra={filtro === 'con_retro' ? extraPromedio : undefined}
        />
      )}
    </div>
  );
}

export function GuiaConsultorioEstudiante() {
  const [abierto, setAbierto] = useState(false);

  return (
    <section className="rounded-xl border bg-card p-4">
      <button
        type="button"
        aria-expanded={abierto}
        onClick={() => setAbierto(v => !v)}
        className="flex min-h-8 w-full items-center justify-between gap-2 text-left text-xs font-semibold text-foreground outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span className="inline-flex items-center gap-2">
          <Sparkles className="size-3.5 text-salvia" aria-hidden />
          Cómo funciona el consultorio 3D
        </span>
        <ChevronDown
          className={cn(
            'size-4 text-muted-foreground transition-transform duration-200',
            abierto && 'rotate-180'
          )}
          aria-hidden
        />
      </button>

      <Desplegable abierto={abierto}>
        <dl className="mt-3 space-y-2.5 border-t pt-3 text-xs text-muted-foreground">
          <div>
            <dt className="font-semibold text-foreground">
              1 · Ficha del paciente antes de entrar
            </dt>
            <dd className="mt-0.5 leading-relaxed">
              Al validar tu código verás el motivo de consulta, la competencia trabajada y el
              contexto clínico antes de iniciar la entrevista.
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-foreground">2 · Conversación escrita o por voz</dt>
            <dd className="mt-0.5 leading-relaxed">
              Dentro del consultorio 3D puedes escribir tus intervenciones o usar el micrófono. Si
              pasan 10 minutos sin actividad, la práctica se cierra automáticamente.
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-foreground">
              3 · Reflexión personal y revisión docente
            </dt>
            <dd className="mt-0.5 leading-relaxed">
              La plataforma no califica de forma automática: tu docente lee la conversación, anota
              observaciones en tus frases y publica tu retroalimentación.
            </dd>
          </div>
        </dl>
      </Desplegable>
    </section>
  );
}
