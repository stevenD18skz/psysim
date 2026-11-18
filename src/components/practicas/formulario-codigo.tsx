'use client';

import {
  AlertCircle,
  ArrowRight,
  Check,
  Copy,
  KeyRound,
  Loader2,
  Mail,
  Monitor,
  Search,
  Sparkles,
} from 'lucide-react';
import Link from 'next/link';
import { unstable_rethrow } from 'next/navigation';
import { useEffect, useId, useState, useSyncExternalStore, useTransition } from 'react';

import { CodigoCaso } from '@/components/casos/codigo-caso';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { confirmarComputador, useEsComputador } from '@/hooks/use-es-computador';
import { canjearCodigo } from '@/lib/asignaciones/actions';
import { normalizarCodigoAcceso, rutaUnirse } from '@/lib/asignaciones/codigo';
import { formatearDia } from '@/lib/estudiantes/estudiantes';
import { coincideBusqueda } from '@/lib/listas';
import { cn } from '@/lib/utils';

const sinSuscripcion = () => () => {};

export interface CodigoAsignadoVista {
  id: string;
  codigo: string;
  expiraEn: string;
  creadoEn: string;
  docenteNombre: string | null;
  escenario: {
    codigo: string;
    titulo: string;
    competenciaCentral: string | null;
    paciente: string | null;
  };
}

interface FormularioCodigoProps {
  codigoInicial?: string;
  /** Correo del estudiante: destinatario de «Enviármelo por correo». */
  correo?: string | null;
  /** `unirse`: la página del enlace (aviso grande en el celular); `practicas`: el bloque de Mis prácticas. */
  variante?: 'unirse' | 'practicas';
  /** Códigos de acceso vigentes que el docente ya le asignó al estudiante. */
  codigosAsignados?: CodigoAsignadoVista[];
}

/**
 * El estudiante escribe (o pega) el código que le envió su docente y entra a la simulación.
 *
 * Usar el código crea la práctica y pone a correr el cierre por inactividad, así que solo se usa en
 * un computador: en un celular o tableta el formulario no se envía, explica por qué y ofrece llevar
 * el enlace al computador (copiarlo o enviárselo por correo). Para un portátil táctil mal
 * detectado queda una salida discreta que pide confirmar.
 */
export function FormularioCodigo({
  codigoInicial = '',
  correo = null,
  variante = 'practicas',
  codigosAsignados = [],
}: FormularioCodigoProps) {
  const id = useId();
  const idBusquedaCodigos = useId();
  const esComputador = useEsComputador();
  const [confirmandoForzar, setConfirmandoForzar] = useState(false);
  const [codigo, setCodigo] = useState(codigoInicial);
  const [filtroCodigo, setFiltroCodigo] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [entrando, startTransition] = useTransition();

  const codigosVisibles = filtroCodigo.trim()
    ? codigosAsignados.filter(item =>
        coincideBusqueda(
          filtroCodigo,
          item.codigo,
          item.escenario.codigo,
          item.escenario.titulo,
          item.escenario.paciente,
          item.docenteNombre
        )
      )
    : codigosAsignados;

  const puedeUsar = esComputador === true;

  const entrar = (evento: React.FormEvent) => {
    evento.preventDefault();
    if (!puedeUsar) return;
    setError(null);
    startTransition(async () => {
      try {
        const resultado = await canjearCodigo({ codigo });
        if (resultado?.error) setError(resultado.error);
      } catch (error) {
        // El canje que funciona termina en una redirección: se deja pasar a Next.
        unstable_rethrow(error);
        // Usar el código es idempotente en el servidor: reintentar lleva a la misma práctica.
        setError(
          'No pudimos comprobar el código. No se ha usado: revisa tu conexión e inténtalo de nuevo.'
        );
      }
    });
  };

  if (esComputador === false) {
    return (
      <>
        <AvisoComputador
          codigo={normalizarCodigoAcceso(codigo) ?? codigoInicial}
          correo={correo}
          variante={variante}
          codigosAsignados={codigosAsignados}
          onForzar={() => setConfirmandoForzar(true)}
        />
        <Dialog open={confirmandoForzar} onOpenChange={setConfirmandoForzar}>
          <DialogContent
            role="alertdialog"
            className="sm:max-w-md"
            // El botón que abrió el diálogo desaparece al confirmar: el foco pasa al campo del código.
            onCloseAutoFocus={evento => {
              const campo = document.getElementById(id);
              if (campo) {
                evento.preventDefault();
                campo.focus();
              }
            }}
          >
            <DialogHeader>
              <DialogTitle>¿Estás en un computador?</DialogTitle>
              <DialogDescription>
                Si sigues en el celular, el código se usará y no podrás hacer la práctica: se
                cerrará a los 10 minutos.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setConfirmandoForzar(false)}>
                No, lo abriré después
              </Button>
              <Button
                onClick={() => {
                  confirmarComputador();
                  // Tras desmontarse el diálogo (Radix devuelve el foco con un retardo mínimo).
                  setTimeout(() => document.getElementById(id)?.focus(), 50);
                  setConfirmandoForzar(false);
                }}
              >
                Sí, estoy en un computador
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return (
    // Contenedor con nombre: la lista vive tanto en la columna estrecha de Mis prácticas como en
    // páginas anchas, y debe acomodarse al espacio real, no al de la ventana.
    <div className="@container flex flex-col gap-5">
      {codigosAsignados.length > 0 && (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Sparkles className="size-4 shrink-0 text-salvia" aria-hidden />
              {codigosAsignados.length === 1
                ? 'Práctica asignada por tu docente'
                : `Prácticas asignadas por tu docente (${codigosAsignados.length})`}
            </p>
            {codigosAsignados.length > 3 && (
              <span className="text-xs text-muted-foreground">Desliza para ver más</span>
            )}
          </div>
          {codigosAsignados.length > 5 && (
            <div className="relative">
              <label htmlFor={idBusquedaCodigos} className="sr-only">
                Buscar entre prácticas asignadas
              </label>
              <Search
                className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                id={idBusquedaCodigos}
                type="search"
                autoComplete="off"
                placeholder="Buscar caso, paciente o código…"
                className="h-9 pl-8 text-xs"
                value={filtroCodigo}
                onChange={evento => setFiltroCodigo(evento.target.value)}
              />
            </div>
          )}
          <ul
            className={cn(
              'flex flex-col divide-y rounded-xl border bg-card',
              codigosAsignados.length > 3 ? 'max-h-72 overflow-y-auto' : 'overflow-hidden'
            )}
          >
            {codigosVisibles.length === 0 ? (
              <li className="px-3.5 py-4 text-center text-xs text-muted-foreground">
                Ninguna práctica asignada coincide con tu búsqueda.
              </li>
            ) : (
              codigosVisibles.map(item => {
                const seleccionado =
                  normalizarCodigoAcceso(codigo) === normalizarCodigoAcceso(item.codigo);
                return (
                  <li
                    key={item.id}
                    className={cn(
                      'flex flex-col gap-3 p-3.5 transition-colors @md:flex-row @md:items-center @md:justify-between',
                      seleccionado && 'bg-salvia-suave/45'
                    )}
                  >
                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                      <p className="text-sm leading-snug font-semibold text-foreground">
                        <CodigoCaso
                          codigo={item.escenario.codigo}
                          className="mr-1.5 font-mono text-xs font-medium text-muted-foreground"
                        />
                        {item.escenario.titulo}
                      </p>
                      {item.escenario.paciente && (
                        <p className="text-xs text-muted-foreground">
                          Paciente:{' '}
                          <span className="font-medium text-terracota">
                            {item.escenario.paciente}
                          </span>
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        Vence el {formatearDia(item.expiraEn)}
                        {item.docenteNombre && ` · ${item.docenteNombre}`}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center justify-between gap-2 @md:justify-end">
                      <code className="font-mono text-sm font-medium tracking-[0.06em] whitespace-nowrap text-foreground">
                        {item.codigo}
                      </code>
                      <Button
                        type="button"
                        variant={seleccionado ? 'secondary' : 'outline'}
                        size="sm"
                        disabled={entrando}
                        aria-pressed={seleccionado}
                        onClick={() => {
                          setError(null);
                          setCodigo(item.codigo);
                          document.getElementById(id)?.focus();
                        }}
                      >
                        {seleccionado ? (
                          <>
                            <Check aria-hidden />
                            Código cargado
                          </>
                        ) : (
                          'Cargar código'
                        )}
                      </Button>
                    </div>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}

      <form
        onSubmit={entrar}
        noValidate
        className="flex flex-col gap-3"
        aria-label="Usar un código"
      >
        <label htmlFor={id} className="text-base font-semibold text-foreground">
          Código de acceso
        </label>
        <div className="flex flex-col gap-2.5">
          <div className="relative flex-1">
            <KeyRound
              className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              id={id}
              value={codigo}
              onChange={evento => setCodigo(evento.target.value)}
              placeholder="abc-defg-hij"
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              className="h-14 rounded-xl pl-12 font-mono text-xl font-medium tracking-[0.12em] placeholder:tracking-[0.12em] placeholder:text-muted-foreground/60 md:text-xl"
              aria-invalid={error ? true : undefined}
              aria-describedby={`${id}-ayuda${error ? ` ${id}-error` : ''}`}
              disabled={entrando}
            />
          </div>
          <Button
            type="submit"
            variant="accion"
            size="lg"
            className="h-13 w-full rounded-xl px-5 text-base"
            // Mientras no se sabe el dispositivo (antes de hidratar) no se permite usar el código.
            disabled={entrando || !codigo.trim() || !puedeUsar}
            aria-busy={entrando}
          >
            {entrando ? <Loader2 className="animate-spin" aria-hidden /> : null}
            {entrando ? 'Comprobando el código…' : 'Usar el código y entrar'}
            {!entrando && <ArrowRight aria-hidden />}
          </Button>
        </div>
        <p id={`${id}-ayuda`} className="text-xs leading-relaxed text-muted-foreground">
          El código tiene 10 letras con guiones (abc-defg-hij), es de un solo uso y solo funciona
          con tu cuenta.
        </p>
        {error && (
          <Alert id={`${id}-error`} variant="destructive" role="alert">
            <AlertCircle aria-hidden />
            <AlertDescription className="flex flex-col items-start gap-2">
              {error}
              {error.includes('Mis prácticas') && variante === 'unirse' && (
                <Link href="/practicas" className="font-semibold underline underline-offset-4">
                  Ver Mis prácticas
                </Link>
              )}
            </AlertDescription>
          </Alert>
        )}
      </form>
    </div>
  );
}

/**
 * En un celular o tableta: el código sigue sin usar. Se explica por qué y se ofrece llevar el
 * enlace al computador.
 */
function AvisoComputador({
  codigo,
  correo,
  variante,
  codigosAsignados = [],
  onForzar,
}: {
  codigo: string;
  correo: string | null;
  variante: 'unirse' | 'practicas';
  codigosAsignados?: CodigoAsignadoVista[];
  onForzar: () => void;
}) {
  const origen = useSyncExternalStore(
    sinSuscripcion,
    () => window.location.origin,
    () => ''
  );
  const [copiado, setCopiado] = useState(false);
  const enlace = codigo ? `${origen}${rutaUnirse(codigo)}` : `${origen}/practicas`;

  useEffect(() => {
    if (!copiado) return;
    const temporizador = setTimeout(() => setCopiado(false), 4000);
    return () => clearTimeout(temporizador);
  }, [copiado]);

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(enlace);
      setCopiado(true);
    } catch {
      setCopiado(false);
    }
  };

  const cuerpo = codigo
    ? `Abre este enlace en un computador con teclado y ratón:\n${enlace}\n\nCódigo: ${codigo} (un solo uso).`
    : `Abre PsySim en un computador con teclado y ratón:\n${enlace}`;
  const mailto = `mailto:${encodeURIComponent(correo ?? '')}?subject=${encodeURIComponent(
    'Mi práctica en PsySim'
  )}&body=${encodeURIComponent(cuerpo)}`;

  if (variante === 'practicas') {
    return (
      <div className="flex flex-col gap-3 rounded-xl bg-salvia-suave p-4 text-salvia-oscuro">
        {codigosAsignados.length > 0 && (
          <p className="text-xs font-semibold">
            Tienes {codigosAsignados.length}{' '}
            {codigosAsignados.length === 1 ? 'código asignado listo' : 'códigos asignados listos'}{' '}
            para usar en un computador (
            {codigosAsignados
              .slice(0, 3)
              .map(c => c.codigo)
              .join(', ')}
            {codigosAsignados.length > 3 ? ` y ${codigosAsignados.length - 3} más` : ''}).
          </p>
        )}
        <p className="flex items-start gap-2.5 text-sm leading-relaxed">
          <Monitor className="mt-0.5 size-4 shrink-0" aria-hidden />
          Para usar un código, abre PsySim en un computador con teclado y ratón. En el celular
          puedes leer tus prácticas y tu retroalimentación.
        </p>
        <button
          type="button"
          onClick={onForzar}
          className="w-fit text-sm font-medium underline underline-offset-4"
        >
          Estoy en un computador con teclado y ratón
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <p className="flex items-center gap-2 text-lg font-bold">
          <Monitor className="size-5 text-salvia" aria-hidden />
          Ábrelo en tu computador
        </p>
        <p className="text-muted-foreground">
          La simulación necesita teclado y ratón. Tu código sigue sin usar: ábrelo desde un
          computador.
        </p>
      </div>
      {codigo && (
        <dl className="flex flex-col gap-1 rounded-xl border bg-background px-4 py-3">
          <dt className="text-xs font-semibold text-muted-foreground">Enlace de tu práctica</dt>
          <dd className="font-mono text-sm break-all select-all">{enlace}</dd>
        </dl>
      )}
      <div className="flex flex-col gap-2">
        <Button type="button" variant="accion" size="lg" onClick={copiar}>
          {copiado ? <Check aria-hidden /> : <Copy aria-hidden />}
          {copiado ? 'Enlace copiado' : 'Copiar enlace'}
        </Button>
        <Button asChild variant="outline" size="lg">
          <a href={mailto}>
            <Mail aria-hidden />
            Enviármelo por correo
          </a>
        </Button>
        <p role="status" className="min-h-5 text-center text-sm text-salvia-oscuro">
          {copiado ? 'Pégalo en el navegador de tu computador.' : ''}
        </p>
      </div>
      <button
        type="button"
        onClick={onForzar}
        className="mx-auto w-fit text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
      >
        Estoy en un computador con teclado y ratón
      </button>
    </div>
  );
}
