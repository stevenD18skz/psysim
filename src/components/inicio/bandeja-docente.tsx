import { ArrowRight } from 'lucide-react';
import Link from 'next/link';

import { ReenviarCodigo } from '@/components/asignaciones/reenviar-codigo';
import { CodigoCaso } from '@/components/casos/codigo-caso';
import { AyudaContextual } from '@/components/comun/ayuda-contextual';
import { ControlCitado } from '@/components/comun/control-citado';
import { formatearTiempoPractica } from '@/lib/estudiantes/estudiantes';
import { cierrePorInactividad, formatearHora, tiempoRelativo } from '@/lib/fechas';
import { duracionSesion } from '@/lib/sesiones/estados';
import { cn } from '@/lib/utils';
import { type CodigoPendiente, type SesionDocente } from '@/types';

/** Filas visibles por bloque; el resto se ve en su página. */
const MAXIMO_POR_REVISAR = 8;
const MAXIMO_CODIGOS = 6;

type Tono = 'pendiente' | 'vivo' | 'neutro';

interface BandejaDocenteProps {
  /** Ordenadas de la que más espera a la más reciente. */
  porRevisar: SesionDocente[];
  practicando: SesionDocente[];
  codigos: CodigoPendiente[];
  ahora: Date;
  /**
   * `columnas`: la bandeja es la página (docente): «Por revisar» a lo ancho y el resto al lado.
   * `riel`: la bandeja acompaña al panel de la plataforma (Administrador): un solo panel angosto.
   */
  disposicion: 'columnas' | 'riel';
}

/**
 * Lo que espera la acción del docente: prácticas por revisar, quién practica ahora y los códigos
 * que nadie ha usado. Cada bloque es un registro (filas con divisores) con su cantidad y, si hay
 * más de lo que cabe, el camino a la lista completa.
 */
export function BandejaDocente({
  porRevisar,
  practicando,
  codigos,
  ahora,
  disposicion,
}: BandejaDocenteProps) {
  const enRiel = disposicion === 'riel';
  const nivel = enRiel ? 'h3' : 'h2';

  const bloquePorRevisar = (
    <Bloque
      id="por-revisar"
      titulo="Por revisar"
      nivel={nivel}
      cantidad={porRevisar.length}
      tono="pendiente"
      ayuda="Prácticas terminadas (o interrumpidas con al menos 3 intervenciones) donde el estudiante espera tus comentarios y tu nota. Van de la que más espera a la más reciente."
      enlace={porRevisar.length > 0 ? { href: '/sesiones', texto: 'Ver todas' } : undefined}
      vacio="Cuando un estudiante termine una práctica, aparecerá aquí para que dejes tu retroalimentación."
    >
      {porRevisar.slice(0, MAXIMO_POR_REVISAR).map(sesion => (
        <FilaPorRevisar key={sesion.id} sesion={sesion} ahora={ahora} />
      ))}
      {porRevisar.length > MAXIMO_POR_REVISAR && (
        <FilaMas href="/sesiones">
          {mas(porRevisar.length - MAXIMO_POR_REVISAR, 'práctica', 'prácticas')} en Revisiones
        </FilaMas>
      )}
    </Bloque>
  );

  const bloquePracticando = (
    <Bloque
      id="practicando"
      titulo="Practicando ahora"
      nivel={nivel}
      cantidad={practicando.length}
      tono="vivo"
      ayuda="Estudiantes con un consultorio abierto en este momento. La página se actualiza sola cada 30 segundos mientras haya alguno."
      vacio="Nadie está practicando en este momento."
    >
      {practicando.map(sesion => (
        <FilaPracticando key={sesion.id} sesion={sesion} ahora={ahora} />
      ))}
    </Bloque>
  );

  const bloqueCodigos = (
    <Bloque
      id="codigos"
      titulo="Códigos sin usar"
      nivel={nivel}
      cantidad={codigos.length}
      tono="neutro"
      ayuda="Códigos que generaste, aún vigentes, que el estudiante no ha usado. Desde aquí puedes reenviarlos."
      vacio={
        <>
          Los códigos que generes en <ControlCitado>Asignar práctica</ControlCitado> esperarán aquí
          hasta que el estudiante los use.
        </>
      }
    >
      {codigos.slice(0, MAXIMO_CODIGOS).map(codigo => (
        <FilaCodigo key={codigo.id} codigo={codigo} ahora={ahora} />
      ))}
      {codigos.length > MAXIMO_CODIGOS && (
        <FilaMas href="/estudiantes">
          {mas(codigos.length - MAXIMO_CODIGOS, 'código', 'códigos')} en la ficha de cada estudiante
        </FilaMas>
      )}
    </Bloque>
  );

  if (enRiel) {
    return (
      <aside
        aria-labelledby="bandeja-titulo"
        className="flex flex-col overflow-hidden rounded-2xl border bg-card"
      >
        <div className="flex flex-col gap-0.5 px-5 pt-5 pb-4">
          <h2 id="bandeja-titulo" className="text-xl font-bold tracking-[-0.015em]">
            Tu bandeja
          </h2>
          <p className="text-sm text-muted-foreground">
            Tus estudiantes: lo que espera tu revisión, quién practica y qué códigos siguen sin
            usarse.
          </p>
        </div>
        <div className="flex flex-col divide-y border-t">
          {bloquePorRevisar}
          {bloquePracticando}
          {bloqueCodigos}
        </div>
      </aside>
    );
  }

  return (
    <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)]">
      <div className="overflow-hidden rounded-2xl border bg-card">{bloquePorRevisar}</div>
      <div className="flex flex-col divide-y overflow-hidden rounded-2xl border bg-card">
        {bloquePracticando}
        {bloqueCodigos}
      </div>
    </div>
  );
}

function mas(n: number, uno: string, varios: string) {
  return `Y ${n} ${n === 1 ? `${uno} más` : `${varios} más`}`;
}

const TONO_CANTIDAD: Record<Tono, string> = {
  pendiente: 'bg-ambar-suave text-ambar',
  vivo: 'bg-salvia-suave text-salvia-oscuro',
  neutro: 'bg-muted text-muted-foreground',
};

/** Un bloque de la bandeja: encabezado con la cantidad y el registro (o su estado vacío). */
function Bloque({
  id,
  titulo,
  nivel: Titulo,
  cantidad,
  tono,
  ayuda,
  enlace,
  vacio,
  children,
}: {
  id: string;
  titulo: string;
  nivel: 'h2' | 'h3';
  cantidad: number;
  tono: Tono;
  ayuda: string;
  enlace?: { href: '/sesiones'; texto: string };
  vacio: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section aria-labelledby={id} className="flex flex-col">
      <div className="flex items-center gap-2 px-5 pt-4 pb-3">
        <Titulo
          id={id}
          className={cn('font-bold tracking-[-0.015em]', Titulo === 'h2' ? 'text-xl' : 'text-base')}
        >
          {titulo}
        </Titulo>
        <span
          className={cn(
            'inline-flex min-w-6 items-center justify-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums',
            cantidad > 0 ? TONO_CANTIDAD[tono] : TONO_CANTIDAD.neutro
          )}
        >
          {tono === 'vivo' && cantidad > 0 && <PuntoVivo />}
          {cantidad}
        </span>
        <AyudaContextual etiqueta={`Qué es ${titulo}`} texto={ayuda} />
        {enlace && (
          <Link
            href={enlace.href}
            className="ml-auto rounded-md text-sm font-medium text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid"
          >
            {enlace.texto}
          </Link>
        )}
      </div>
      {cantidad === 0 ? (
        <p className="max-w-prose px-5 pb-5 text-sm leading-relaxed text-pretty text-muted-foreground">
          {vacio}
        </p>
      ) : (
        <ul className="flex flex-col divide-y border-t">{children}</ul>
      )}
    </section>
  );
}

/** Punto que late mientras alguien practica (solo si se permite el movimiento). */
function PuntoVivo() {
  return (
    <span aria-hidden className="relative flex size-2">
      <span className="absolute inline-flex size-full rounded-full bg-salvia opacity-60 motion-safe:animate-ping" />
      <span className="relative inline-flex size-2 rounded-full bg-salvia" />
    </span>
  );
}

/** Última fila de un bloque cuando hay más de las que caben. */
function FilaMas({
  href,
  children,
}: {
  href: '/sesiones' | '/estudiantes';
  children: React.ReactNode;
}) {
  return (
    <li>
      <Link
        href={href}
        className="group flex items-center gap-1.5 px-5 py-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid"
      >
        {children}
        <ArrowRight
          className="size-4 transition-transform duration-200 ease-salida group-hover:translate-x-0.5"
          aria-hidden
        />
      </Link>
    </li>
  );
}

/**
 * Práctica por revisar: quién, hace cuánto terminó (lo que ordena la lista), qué caso y cómo
 * terminó. Toda la fila lleva a la revisión.
 */
function FilaPorRevisar({ sesion, ahora }: { sesion: SesionDocente; ahora: Date }) {
  const terminada = sesion.fin ?? sesion.inicio;
  const duracion = duracionSesion(sesion);
  const borrador = sesion.retroalimentacion !== null;
  return (
    <li className="group relative flex flex-col gap-1 px-5 py-3.5 transition-colors hover:bg-muted/50">
      <div className="flex items-baseline justify-between gap-3">
        <p className="min-w-0 truncate font-semibold">{sesion.estudiante.nombre}</p>
        <span className="shrink-0 text-sm text-muted-foreground ancho-condensado first-letter:uppercase">
          {tiempoRelativo(terminada, ahora)}
        </span>
      </div>
      <div className="flex items-center justify-between gap-3">
        <p className="flex min-w-0 items-center gap-x-2 text-sm text-muted-foreground">
          <CodigoCaso
            codigo={sesion.escenario.codigo}
            className="shrink-0 font-mono text-xs text-foreground"
          />
          <span className="truncate">{sesion.escenario.titulo}</span>
          {sesion.estado === 'interrumpida' && <span className="shrink-0">· Interrumpida</span>}
          {duracion !== null && (
            <span className="shrink-0 tabular-nums">· {formatearTiempoPractica(duracion)}</span>
          )}
        </p>
        <span className="flex shrink-0 items-center gap-2">
          {borrador && (
            <span className="rounded-full bg-ambar-suave px-2 py-0.5 text-xs font-medium text-ambar">
              Borrador
            </span>
          )}
          <Link
            href={`/sesiones/${sesion.id}`}
            className="inline-flex items-center gap-1 rounded-md text-sm font-semibold text-foreground underline-offset-4 after:absolute after:inset-0 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid"
          >
            {borrador ? 'Continuar' : 'Revisar'}
            <span className="sr-only">
              {' '}
              la práctica de {sesion.estudiante.nombre}, {sesion.escenario.titulo}
            </span>
            <ArrowRight
              className="size-4 transition-transform duration-200 ease-salida group-hover:translate-x-0.5"
              aria-hidden
            />
          </Link>
        </span>
      </div>
    </li>
  );
}

/** Quién practica ahora, desde cuándo, y a qué hora se cerrará si deja de escribir. */
function FilaPracticando({ sesion, ahora }: { sesion: SesionDocente; ahora: Date }) {
  const cierre = cierrePorInactividad(sesion.ultimaActividad);
  return (
    <li className="group relative flex flex-col gap-1 px-5 py-3.5 transition-colors hover:bg-muted/50">
      <p className="flex items-center gap-2 font-semibold">
        <PuntoVivo />
        <Link
          href={`/sesiones/${sesion.id}`}
          className="truncate rounded-sm underline-offset-4 after:absolute after:inset-0 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid"
        >
          {sesion.estudiante.nombre}
        </Link>
      </p>
      <p className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
        <CodigoCaso
          codigo={sesion.escenario.codigo}
          className="shrink-0 font-mono text-xs text-foreground"
        />
        <span className="truncate">
          {sesion.comenzada
            ? `Conversando desde ${tiempoRelativo(sesion.inicio, ahora)}`
            : 'Leyendo las instrucciones del caso'}
        </span>
      </p>
      {cierre > ahora && (
        <p className="text-sm text-muted-foreground">
          Si no escribe, se cierra a las {formatearHora(cierre)}.
        </p>
      )}
    </li>
  );
}

/** Código sin usar: de quién es, qué caso, cuándo vence y cómo reenviarlo. */
function FilaCodigo({ codigo, ahora }: { codigo: CodigoPendiente; ahora: Date }) {
  const horasRestantes = (new Date(codigo.expiraEn).getTime() - ahora.getTime()) / 3_600_000;
  const urgente = horasRestantes < 24;
  return (
    <li className="flex items-center gap-3 px-5 py-3.5">
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="truncate font-semibold">
          {codigo.estudiante ? (
            <Link
              href={`/estudiantes/${codigo.estudiante.id}`}
              className="rounded-sm underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid"
            >
              {codigo.estudiante.nombre}
            </Link>
          ) : (
            'Estudiante'
          )}
        </p>
        <p className="truncate text-sm text-muted-foreground">
          <span className="font-mono text-xs text-foreground">{codigo.codigo}</span> ·{' '}
          {codigo.escenario.titulo}
        </p>
        <p
          className={cn('text-sm', urgente ? 'font-semibold text-ambar' : 'text-muted-foreground')}
        >
          Vence {tiempoRelativo(codigo.expiraEn, ahora)}
        </p>
      </div>
      {codigo.estudiante && (
        <ReenviarCodigo
          codigo={codigo.codigo}
          expiraEn={codigo.expiraEn}
          caso={codigo.escenario.titulo}
          estudiante={codigo.estudiante}
        />
      )}
    </li>
  );
}
