'use client';

import {
  Armchair,
  ChevronDown,
  Hourglass,
  Info,
  LifeBuoy,
  Loader2,
  ShieldCheck,
  Target,
} from 'lucide-react';
import { unstable_rethrow, useRouter } from 'next/navigation';
import { useId, useRef, useState, useTransition } from 'react';
import { toast } from 'sonner';

import { CodigoCaso } from '@/components/casos/codigo-caso';
import { AvatarPaciente } from '@/components/pacientes/avatar-paciente';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { CONSULTORIOS } from '@/lib/casos/opciones';
import { comenzarSesion } from '@/lib/escenarios/actions';
import { avisoDeContenido, RECURSOS_APOYO } from '@/lib/escenarios/avisos';
import {
  ETIQUETA_CATEGORIA,
  ETIQUETA_DIFICULTAD,
  NIVEL_DIFICULTAD,
} from '@/lib/escenarios/etiquetas';
import { formatearFechaHora } from '@/lib/estudiantes/estudiantes';
import { MINUTOS_CIERRE_INACTIVIDAD, plazoAlSalir } from '@/lib/fechas';
import { avatarDeEscena } from '@/lib/pacientes/avatar';
import { leerPrivacidadAceptada, recordarPrivacidadAceptada } from '@/lib/privacidad';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/store/app-store-provider';
import { type SesionActiva } from '@/types';

/** Marca que el estudiante ya empezó una práctica: los controles salen plegados desde entonces. */
const CLAVE_GUIA_VISTA = 'psysim:guia-sesion-vista';

function guiaYaVista(): boolean {
  try {
    return localStorage.getItem(CLAVE_GUIA_VISTA) === '1';
  } catch {
    return false;
  }
}

function recordarGuiaVista() {
  try {
    localStorage.setItem(CLAVE_GUIA_VISTA, '1');
  } catch {
    // Sin almacenamiento: los controles simplemente vuelven a salir desplegados.
  }
}

/** Lo que conviene saber antes de empezar: nunca se pliega (ninguna regla invisible). */
const REGLAS = [
  'Conversas con una IA (Google Gemini), no con una persona. Puede equivocarse o salirse del caso; si pasa, sigue como lo harías en consulta y cuéntaselo luego a tu docente.',
  'Tu docente leerá la conversación completa cuando termines. No la ve en vivo.',
  `Si pasan ${MINUTOS_CIERRE_INACTIVIDAD} minutos sin actividad, la práctica se cierra sola. Cuenta también ahora, mientras lees, y si sales. Te avisamos un minuto antes.`,
  'Tu código ya se usó. Si la práctica se cierra, necesitas un código nuevo para repetirla.',
  'Cuando acabes, pulsa «Terminar práctica». Después no se puede reanudar.',
];

const CONTROLES = [
  ['W A S D o flechas', 'caminar'],
  ['Ratón', 'mirar alrededor'],
  ['E (o clic sobre el paciente)', 'conversar'],
  ['Esc', 'liberar el ratón'],
] as const;

/**
 * HU-23 — Instrucciones del caso. Aparecen cuando el consultorio ya cargó (se ve al fondo,
 * bloqueado) y antes de cualquier interacción: de qué trata el caso, la competencia que se
 * practica, el paciente, las reglas y la aceptación de privacidad. Al empezar, la base de datos
 * marca el inicio real de la práctica.
 *
 * Tiene salida: «Ahora no» (o Escape) confirma la hora límite para volver y lleva a Mis prácticas.
 * El aviso de inactividad se muestra dentro del diálogo para que nunca quede tapado por él.
 */
export function InstruccionesCaso({
  sesion,
  segundosParaCierre,
}: {
  sesion: SesionActiva;
  /** Cuenta atrás del cierre por inactividad (o `null` si aún no hace falta avisar). */
  segundosParaCierre: number | null;
}) {
  const router = useRouter();
  const comenzarEnStore = useAppStore(state => state.sesion.comenzar);
  const [comenzando, startTransition] = useTransition();
  const contenido = useRef<HTMLDivElement>(null);
  const idControles = useId();
  const idPrivacidad = useId();
  const [controlesAbiertos, setControlesAbiertos] = useState(() => !guiaYaVista());
  const [aceptadaAntes] = useState(leerPrivacidadAceptada);
  const [aceptaPrivacidad, setAceptaPrivacidad] = useState(aceptadaAntes !== null);
  const [ahoraNo, setAhoraNo] = useState<string | null>(null);

  const { escenario, npc, estudiante } = sesion;
  const nivel = NIVEL_DIFICULTAD[escenario.dificultad];
  const consultorio = CONSULTORIOS.find(c => c.ruta === escenario.configuracion3d);
  const aviso = avisoDeContenido(escenario.codigo);

  const comenzar = () =>
    startTransition(async () => {
      let resultado;
      try {
        resultado = await comenzarSesion({ sesionId: sesion.id });
      } catch (error) {
        unstable_rethrow(error);
        toast.error('No pudimos empezar la práctica. Revisa tu conexión e inténtalo de nuevo.');
        return;
      }
      if (!resultado.ok) {
        toast.error('No pudimos empezar la práctica. Revisa tu conexión e inténtalo de nuevo.');
        return;
      }
      if (aceptadaAntes === null) recordarPrivacidadAceptada();
      recordarGuiaVista();
      comenzarEnStore(resultado.datos.inicio);
    });

  // La práctica sigue abierta: quien sale ahora tiene hasta 10 minutos para volver.
  const pedirSalida = () => setAhoraNo(plazoAlSalir());

  return (
    <>
      <Dialog open>
        <DialogContent
          showCloseButton={false}
          onEscapeKeyDown={evento => {
            evento.preventDefault();
            pedirSalida();
          }}
          onInteractOutside={evento => evento.preventDefault()}
          // El foco empieza en el texto (no en un botón) para leer el caso antes de empezar.
          onOpenAutoFocus={evento => {
            evento.preventDefault();
            contenido.current?.focus();
          }}
          className="flex max-h-[min(92dvh,52rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl"
        >
          <DialogHeader className="gap-1.5 vetas-nogal px-6 pt-6 pb-5 text-sidebar-foreground">
            <DialogTitle className="flex flex-wrap items-baseline gap-x-2.5 text-[1.7rem] leading-tight font-bold tracking-[-0.02em]">
              <CodigoCaso
                codigo={escenario.codigo}
                className="font-mono text-base font-medium text-sidebar-muted"
              />
              {escenario.titulo}
            </DialogTitle>
            <DialogDescription className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sidebar-foreground/80">
              <span>Instrucciones del caso</span>
              <span aria-hidden>·</span>
              <span>Caso {ETIQUETA_CATEGORIA[escenario.categoria].toLowerCase()}</span>
              <span aria-hidden>·</span>
              <span className="inline-flex items-center gap-1.5">
                Nivel {ETIQUETA_DIFICULTAD[escenario.dificultad].toLowerCase()}
                <span aria-hidden className="flex gap-0.5">
                  {[1, 2, 3].map(n => (
                    <span
                      key={n}
                      className={cn(
                        'h-2.5 w-1.5 rounded-[1px]',
                        n <= nivel ? 'bg-sidebar-foreground' : 'bg-sidebar-foreground/25'
                      )}
                    />
                  ))}
                </span>
              </span>
            </DialogDescription>
          </DialogHeader>

          {segundosParaCierre !== null && (
            <div className="flex items-center gap-3 border-b bg-ambar-suave px-6 py-3 text-sm text-ambar">
              <Hourglass className="size-5 shrink-0" aria-hidden />
              {/* Se anuncia una sola vez; la cuenta atrás visible no se relee cada segundo. */}
              <p role="alert" className="sr-only">
                ¿Sigues ahí? Queda menos de un minuto: si no hay actividad, la práctica se cierra y
                el código dejará de servir.
              </p>
              <p className="flex-1" aria-hidden>
                <span className="font-semibold">¿Sigues ahí?</span> Si no hay actividad, la práctica
                se cierra en{' '}
                <span className="font-semibold tabular-nums">{segundosParaCierre} s</span> y el
                código dejará de servir.
              </p>
              <Button size="sm" variant="outline">
                Sigo aquí
              </Button>
            </div>
          )}

          <div
            ref={contenido}
            tabIndex={0}
            role="region"
            aria-label="Contenido de las instrucciones"
            className="flex min-h-0 flex-1 flex-col gap-7 overflow-y-auto px-6 py-6 outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
          >
            <section
              aria-labelledby="aviso-contenido"
              className="flex flex-col gap-3 rounded-xl bg-salvia-suave p-4 text-salvia-oscuro"
            >
              <h3 id="aviso-contenido" className="flex items-center gap-2 text-sm font-bold">
                <Info className="size-4" aria-hidden />
                De qué trata este caso
              </h3>
              <p className="text-sm leading-relaxed text-foreground">{aviso.texto}</p>
              <p className="text-sm leading-relaxed">
                Si algo de esto te toca de cerca, puedes elegir «Ahora no» y hablarlo con tu
                docente.
              </p>
              {aviso.conApoyo && (
                <div className="flex flex-col gap-1 border-t border-salvia/25 pt-3">
                  <p className="flex items-center gap-2 text-sm font-semibold">
                    <LifeBuoy className="size-4" aria-hidden />
                    Si necesitas apoyo
                  </p>
                  <ul className="flex flex-col gap-0.5 pl-6 text-sm text-foreground">
                    {RECURSOS_APOYO.map(recurso => (
                      <li key={recurso} className="list-disc">
                        {recurso}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>

            <section className="flex flex-col gap-1">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                <Target className="size-4" aria-hidden />
                Competencia que practicarás
              </h3>
              <p className="text-xl font-bold tracking-[-0.01em]">{escenario.competenciaCentral}</p>
            </section>

            <section className="flex flex-col gap-2">
              <h3 className="text-sm font-semibold text-muted-foreground">El caso</h3>
              <p className="leading-relaxed text-pretty">{escenario.descripcion}</p>
              {consultorio && (
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Armchair className="size-4 shrink-0" aria-hidden />
                  Entorno: {consultorio.nombre} · {consultorio.detalle.toLowerCase()}
                </p>
              )}
            </section>

            <section
              aria-label="Paciente"
              className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-5 gap-y-3 rounded-xl border bg-card p-5"
            >
              {/* El vano de la puerta del consultorio enmarca al paciente. */}
              <span className="row-span-2 flex h-24 w-20 items-end justify-center overflow-hidden rounded-t-full border-[3px] border-laton bg-terracota-suave">
                <AvatarPaciente
                  src={avatarDeEscena(escenario.configuracion3d)}
                  nombre={npc.nombre}
                  className="size-20 translate-y-2 text-xl"
                />
              </span>
              <div className="self-end leading-tight">
                <p className="text-sm font-semibold text-muted-foreground">
                  Paciente simulado con IA
                </p>
                <p className="mt-1 text-2xl font-bold tracking-[-0.015em] text-terracota">
                  {npc.nombre}
                </p>
                <p className="text-sm text-muted-foreground">{npc.edad} años</p>
              </div>
              <div className="col-span-2 flex flex-col gap-1 border-t pt-3 sm:col-span-1 sm:col-start-2">
                <p className="text-sm font-semibold text-muted-foreground">
                  Lo que sabes antes de entrar
                </p>
                <p className="text-sm leading-relaxed text-pretty">{npc.perfilClinico}</p>
              </div>
            </section>

            <section aria-labelledby="antes-de-empezar" className="flex flex-col gap-3">
              <h3 id="antes-de-empezar" className="text-lg font-bold tracking-[-0.01em]">
                Antes de empezar
              </h3>
              <p className="text-sm text-muted-foreground">
                Es una práctica formativa: equivocarte aquí es parte de aprender. Cinco cosas que
                conviene saber:
              </p>
              <ol className="flex flex-col gap-3">
                {REGLAS.map((regla, i) => (
                  <li key={regla} className="flex gap-3 text-sm leading-relaxed">
                    <span
                      aria-hidden
                      className="flex size-6 shrink-0 items-center justify-center rounded-full bg-nogal text-xs font-bold text-lino ancho-condensado"
                    >
                      {i + 1}
                    </span>
                    <span>{regla}</span>
                  </li>
                ))}
              </ol>
            </section>

            <section className="flex flex-col gap-2">
              <button
                type="button"
                aria-expanded={controlesAbiertos}
                aria-controls={idControles}
                onClick={() => setControlesAbiertos(abiertos => !abiertos)}
                className="-mx-2 flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm font-semibold outline-hidden transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
              >
                Controles
                <span className="ml-auto flex items-center gap-1 font-normal text-muted-foreground">
                  {controlesAbiertos ? 'Ocultar' : 'Ver controles'}
                  <ChevronDown
                    className={cn('size-4 transition-transform', controlesAbiertos && 'rotate-180')}
                    aria-hidden
                  />
                </span>
              </button>
              <div id={idControles} hidden={!controlesAbiertos} className="flex flex-col gap-3">
                <dl className="grid gap-x-4 gap-y-2 text-sm sm:grid-cols-2">
                  {CONTROLES.map(([tecla, accion]) => (
                    <div key={tecla} className="flex items-baseline gap-2">
                      <dt className="font-mono text-xs font-medium">{tecla}</dt>
                      <dd className="text-muted-foreground">{accion}</dd>
                    </div>
                  ))}
                </dl>
                <p className="text-sm text-muted-foreground">
                  ¿Prefieres no recorrer el consultorio? Usa «Ir directo a la conversación».
                </p>
              </div>
            </section>

            <p className="text-sm text-muted-foreground">
              Practicas como{' '}
              <span className="font-medium text-foreground">{estudiante.nombre}</span> ·{' '}
              <span className="font-mono">{estudiante.codigo}</span>. ¿No eres tú? Cierra sesión y
              entra con tu cuenta.
            </p>

            <section className="flex flex-col gap-2 rounded-xl border p-4">
              {aceptadaAntes ? (
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <ShieldCheck className="size-4 shrink-0 text-salvia" aria-hidden />
                  Aceptaste el aviso de privacidad el {formatearFechaHora(aceptadaAntes)}.
                </p>
              ) : (
                <>
                  <label
                    htmlFor={idPrivacidad}
                    className="flex cursor-pointer items-start gap-3 text-sm leading-relaxed"
                  >
                    <input
                      id={idPrivacidad}
                      type="checkbox"
                      checked={aceptaPrivacidad}
                      onChange={evento => setAceptaPrivacidad(evento.target.checked)}
                      className="mt-0.5 size-5 shrink-0 accent-nogal"
                    />
                    Leí el aviso de privacidad y acepto que mi conversación se procese con Google
                    Gemini y que la lea mi docente.
                  </label>
                  <a
                    href="/privacidad"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-8 w-fit text-sm font-medium underline underline-offset-4"
                  >
                    Leer el aviso de privacidad (se abre en otra pestaña)
                  </a>
                </>
              )}
            </section>
          </div>

          <DialogFooter className="m-0 flex-col gap-3 border-t bg-muted/60 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground sm:order-none" aria-live="polite">
              {!aceptaPrivacidad && 'Marca la casilla de privacidad para empezar.'}
            </p>
            <div className="flex flex-col-reverse gap-2 sm:flex-row">
              <Button variant="ghost" size="lg" onClick={pedirSalida} disabled={comenzando}>
                Ahora no
              </Button>
              <Button
                variant="accion"
                size="lg"
                onClick={comenzar}
                disabled={comenzando || !aceptaPrivacidad}
              >
                {comenzando && <Loader2 className="animate-spin" aria-hidden />}
                {comenzando ? 'Abriendo el consultorio…' : 'Empezar la práctica'}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={ahoraNo !== null} onOpenChange={abierto => !abierto && setAhoraNo(null)}>
        <DialogContent role="alertdialog" className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>¿Dejarla para después?</DialogTitle>
            <DialogDescription>
              Tienes hasta las {ahoraNo} para volver desde Mis prácticas. Después la práctica se
              cierra y el código deja de servir.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAhoraNo(null)} autoFocus>
              Seguir leyendo
            </Button>
            <Button onClick={() => router.push('/practicas')}>Ir a Mis prácticas</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
