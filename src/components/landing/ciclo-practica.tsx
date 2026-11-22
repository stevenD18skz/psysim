'use client';

import {
  BookOpen,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Highlighter,
  Hourglass,
  KeyRound,
  Monitor,
  SendHorizontal,
  ShieldCheck,
  Target,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';

import { InsigniaCategoria } from '@/components/casos/insignias-caso';
import { Desplegable } from '@/components/comun/desplegable';
import { LogoGoogle } from '@/components/comun/logo-google';
import { AvatarPaciente } from '@/components/pacientes/avatar-paciente';
import { cn } from '@/lib/utils';

interface PasoCiclo {
  numero: number;
  titulo: string;
  rol: string;
  resumen: string;
  detalles: readonly string[];
  etiquetaVisual: string;
  pieVisual: string;
}

const PASOS: readonly PasoCiclo[] = [
  {
    numero: 1,
    titulo: 'Tu docente prepara el caso',
    rol: 'Docente · En el panel de asignación',
    resumen:
      'Elige uno de los doce casos o crea uno propio, calibra al paciente y genera un código único.',
    detalles: [
      'Define la duración de la consulta (10, 15, 20 o 30 minutos) y la vigencia del código.',
      'Puede ajustar qué tanto se abre el paciente y qué tanto expresa sus emociones en esta práctica.',
    ],
    etiquetaVisual: 'Asignar práctica · Código de acceso',
    pieVisual:
      'El código es personal, de un solo uso y trae un mensaje listo para compartir con el estudiante.',
  },
  {
    numero: 2,
    titulo: 'Abres el enlace en un computador',
    rol: 'Estudiante · Sin instalar programas',
    resumen:
      'Ingresas desde Chrome, Edge o Firefox con tu correo @correounivalle.edu.co y el código.',
    detalles: [
      'No requiere gafas de realidad virtual ni instalaciones adicionales.',
      'Si abres el enlace en el celular, el código queda intacto y te pide pasarlo a un computador.',
    ],
    etiquetaVisual: 'Ingreso con código y Google',
    pieVisual:
      'Un solo acceso te lleva desde el enlace directo o la portada hasta el consultorio del caso.',
  },
  {
    numero: 3,
    titulo: 'Lees el caso y las reglas',
    rol: 'Estudiante · Antes de empezar',
    resumen:
      'Conoces quién es el paciente, qué competencia vas a entrenar y las reglas de tiempo y privacidad.',
    detalles: [
      'El reloj empieza solo con tu primera intervención, no mientras lees ni mientras recorres la sala.',
      'Los casos con temas sensibles muestran recursos de apoyo y el aviso de privacidad antes de iniciar.',
    ],
    etiquetaVisual: 'Instrucciones previas del caso',
    pieVisual:
      'Nada queda oculto: conoces la duración, la regla de inactividad y quién leerá la conversación.',
  },
  {
    numero: 4,
    titulo: 'Conversas en el consultorio 3D',
    rol: 'Estudiante · Entrevista clínica',
    resumen:
      'Recorres el cuarto o vas directo a conversar; escribes o dictas y el paciente reacciona al diálogo.',
    detalles: [
      'Cuentas con hoja de remisión, notas privadas y la opción de ensayar otra respuesta.',
      'Recibes un aviso cuando faltan 3 minutos para que tú cierres la entrevista antes de terminar.',
    ],
    etiquetaVisual: 'Consultorio 3D en vivo',
    pieVisual:
      'El rostro del paciente y la atmósfera del cuarto acompañan su estado emocional sin calificarte.',
  },
  {
    numero: 5,
    titulo: 'Tu docente revisa y te retroalimenta',
    rol: 'Docente y estudiante · Después de terminar',
    resumen:
      'Lee la transcripción completa cuando terminas, comenta frases concretas y publica tu nota.',
    detalles: [
      'El docente nunca ve el chat en vivo: revisa con calma al cierre de la práctica.',
      'Puedes leer los comentarios anclados a tus frases y dejar una reflexión personal.',
    ],
    etiquetaVisual: 'Revisión frase por frase',
    pieVisual:
      'Cada comentario queda enlazado a la frase exacta de la conversación para facilitar el aprendizaje.',
  },
];

/**
 * Línea vertical de pasos para «Cómo funciona una práctica», inspirada en el asistente de
 * `/configuracion`: cada paso amplía sus detalles al elegirlo y muestra una vista visual fiel
 * de esa etapa.
 */
export function CicloPractica() {
  const [activo, setActivo] = useState(0);
  const pasoActual = PASOS[activo] ?? PASOS[0]!;
  const total = PASOS.length;

  const mover = (delta: number) => setActivo(actual => (actual + delta + total) % total);

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1.02fr)_minmax(0,1fr)] lg:items-start lg:gap-10">
      <div className="flex flex-col">
        <ol aria-label="Etapas de una práctica" className="flex flex-col">
          {PASOS.map((paso, i) => {
            const esActivo = i === activo;
            const completado = i < activo;
            const ultimo = i === PASOS.length - 1;

            return (
              <li
                key={paso.numero}
                className="grid grid-cols-[2.25rem_minmax(0,1fr)] gap-x-3.5 sm:gap-x-4"
              >
                <div className="flex flex-col items-center">
                  <span
                    aria-hidden
                    className={cn(
                      'flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold transition-[background-color,color,box-shadow,border-color] duration-300',
                      esActivo && 'bg-nogal text-lino ring-4 ring-laton/35',
                      completado && 'border border-salvia/50 bg-salvia-suave text-salvia-oscuro',
                      !esActivo &&
                        !completado &&
                        'border-2 border-input/60 bg-card text-muted-foreground'
                    )}
                  >
                    {completado ? <Check className="size-4" strokeWidth={2.75} /> : paso.numero}
                  </span>
                  {!ultimo && (
                    <span
                      aria-hidden
                      className={cn(
                        'my-1.5 w-0 flex-1 border-l-2 border-dashed transition-colors duration-300',
                        completado ? 'border-salvia/60' : 'border-border'
                      )}
                    />
                  )}
                </div>

                <div className={cn('min-w-0', !ultimo && 'pb-5')}>
                  <button
                    type="button"
                    onClick={() => setActivo(i)}
                    aria-expanded={esActivo}
                    className={cn(
                      'group flex w-full flex-col gap-1.5 rounded-xl border px-4 py-3.5 text-left transition-[border-color,background-color,box-shadow] focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-hidden',
                      esActivo
                        ? 'border-nogal/45 bg-card shadow-[0_8px_24px_-16px_rgb(58_36_24/0.35)]'
                        : 'border-transparent bg-transparent hover:border-border hover:bg-card/70'
                    )}
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <h3
                        className={cn(
                          'text-base leading-snug font-bold transition-colors sm:text-lg',
                          esActivo ? 'text-foreground' : 'text-foreground/85'
                        )}
                      >
                        {paso.titulo}
                      </h3>
                      <span className="shrink-0 font-mono text-xs text-muted-foreground tabular-nums">
                        0{paso.numero}
                      </span>
                    </div>
                    <p className="text-xs font-medium text-salvia-oscuro ancho-condensado">
                      {paso.rol}
                    </p>
                    <p className="text-sm leading-relaxed text-muted-foreground">{paso.resumen}</p>
                  </button>

                  <Desplegable abierto={esActivo}>
                    <div className="flex flex-col gap-4 pt-3 pl-1">
                      <ul className="flex flex-col gap-2 rounded-xl border border-border/80 bg-card/70 px-4 py-3 text-sm text-foreground/90">
                        {paso.detalles.map(detalle => (
                          <li key={detalle} className="flex items-start gap-2.5 leading-relaxed">
                            <span
                              aria-hidden
                              className="mt-2 size-1.5 shrink-0 rounded-full bg-salvia"
                            />
                            <span>{detalle}</span>
                          </li>
                        ))}
                      </ul>

                      {/* En móvil y tableta cada paso lleva su propia imagen justo debajo. */}
                      <div className="lg:hidden">
                        <MarcoVisualPaso paso={paso.numero} pie={paso.pieVisual} />
                      </div>
                    </div>
                  </Desplegable>
                </div>
              </li>
            );
          })}
        </ol>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card px-4 py-3 text-sm">
          <span className="text-muted-foreground">
            ¿Quieres revisar controles, tiempos y casos de error en detalle?
          </span>
          <Link
            href="/manual"
            className="inline-flex min-h-11 items-center gap-2 font-semibold text-nogal underline decoration-border underline-offset-4 transition-colors hover:decoration-nogal focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-hidden"
          >
            <BookOpen className="size-4 text-salvia" aria-hidden />
            Consultar el manual de uso
          </Link>
        </div>
      </div>

      {/* Escenario visual fijo en escritorio: acompaña la línea de pasos sin alargar el scroll. */}
      <div className="hidden lg:sticky lg:top-8 lg:block">
        <div className="overflow-hidden rounded-2xl border bg-card">
          <div className="flex items-center justify-between gap-3 border-b bg-muted/35 px-5 py-3">
            <div className="min-w-0">
              <p className="font-mono text-xs font-medium text-muted-foreground tabular-nums">
                Paso {pasoActual.numero} de {total}
              </p>
              <p className="truncate text-sm font-bold text-foreground">
                {pasoActual.etiquetaVisual}
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => mover(-1)}
                aria-label="Paso anterior"
                className="hover:bg-apagado inline-flex size-11 items-center justify-center rounded-lg border bg-card text-foreground transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-hidden"
              >
                <ChevronLeft className="size-4" aria-hidden />
              </button>
              <button
                type="button"
                onClick={() => mover(1)}
                aria-label="Siguiente paso"
                className="hover:bg-apagado inline-flex size-11 items-center justify-center rounded-lg border bg-card text-foreground transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-hidden"
              >
                <ChevronRight className="size-4" aria-hidden />
              </button>
            </div>
          </div>

          <div className="p-4">
            <MarcoVisualPaso paso={pasoActual.numero} pie={pasoActual.pieVisual} />
          </div>
        </div>
      </div>
    </div>
  );
}

function MarcoVisualPaso({ paso, pie }: { paso: number; pie: string }) {
  return (
    <figure className="flex flex-col gap-3">
      <div className="overflow-hidden rounded-xl border bg-background">
        {paso === 1 && <VisualPaso1 />}
        {paso === 2 && <VisualPaso2 />}
        {paso === 3 && <VisualPaso3 />}
        {paso === 4 && <VisualPaso4 />}
        {paso === 5 && <VisualPaso5 />}
      </div>
      <figcaption className="px-1 text-xs leading-relaxed text-muted-foreground">{pie}</figcaption>
    </figure>
  );
}

function VisualPaso1() {
  return (
    <div className="flex flex-col gap-4 p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3">
        <div className="flex items-center gap-2.5">
          <AvatarPaciente
            src="/pacientes/marta-lucia.webp"
            nombre="Marta Lucía"
            className="size-10 text-xs ring-2 ring-laton/40"
          />
          <div>
            <p className="text-sm font-bold text-terracota">Marta Lucía</p>
            <p className="text-xs text-muted-foreground">E-01 · Duelo y pérdida</p>
          </div>
        </div>
        <InsigniaCategoria categoria="clinico" />
      </div>

      <div className="grid gap-3 sm:grid-cols-[1.1fr_0.9fr]">
        <div className="flex flex-col justify-between gap-3 rounded-xl border bg-card p-3.5 text-xs">
          <div>
            <p className="font-semibold text-foreground">Duración de la consulta</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {['10 min', '15 min', '20 min', '30 min'].map(min => (
                <span
                  key={min}
                  className={cn(
                    'rounded-full border px-2.5 py-1 font-medium',
                    min === '15 min'
                      ? 'border-nogal bg-nogal text-lino'
                      : 'bg-background text-muted-foreground'
                  )}
                >
                  {min}
                </span>
              ))}
            </div>
          </div>
          <p className="text-muted-foreground">
            Apertura y expresión emocional calibrables solo para esta práctica.
          </p>
        </div>

        <div className="flex flex-col justify-between gap-2 rounded-xl vetas-nogal p-4 text-lino">
          <span className="flex items-center gap-1.5 text-xs text-sidebar-muted">
            <KeyRound className="size-3.5 text-laton" aria-hidden />
            Código generado
          </span>
          <p className="py-1 text-center font-mono text-xl font-semibold tracking-[0.12em]">
            abc-defg-hij
          </p>
          <span className="text-center text-xs text-sidebar-muted">Vigente 7 días · 1 uso</span>
        </div>
      </div>
    </div>
  );
}

function VisualPaso2() {
  return (
    <div className="grid items-center gap-4 vetas-nogal p-4 text-sidebar-foreground sm:grid-cols-[1.15fr_0.85fr] sm:p-5">
      <div className="flex flex-col gap-3 rounded-xl bg-card p-4 text-card-foreground shadow-[0_18px_36px_-20px_rgb(0_0_0/0.55)]">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-foreground">Código de acceso</span>
          <div className="flex items-center gap-2">
            <span className="flex h-9 flex-1 items-center gap-2 rounded-lg border border-input bg-background px-2.5 font-mono text-sm tracking-[0.06em]">
              <KeyRound className="size-3.5 text-muted-foreground" aria-hidden />
              abc-defg-hij
            </span>
            <span className="inline-flex h-9 items-center rounded-lg border border-nogal/25 bg-nogal px-3 text-xs font-semibold text-lino">
              Entrar
            </span>
          </div>
        </div>
        <div className="flex h-9 items-center justify-center gap-2 rounded-lg border border-nogal/60 bg-card text-xs font-semibold text-foreground">
          <LogoGoogle />
          Continuar con Google
        </div>
        <p className="flex items-center gap-1.5 border-t pt-2.5 text-xs text-muted-foreground">
          <Monitor className="size-3.5 shrink-0 text-salvia" aria-hidden />
          Navegador de computador · Sin descargas
        </p>
      </div>

      <div className="mx-auto w-36 sm:w-full">
        <div className="rounded-t-[999px] bg-[#2a190f] p-2">
          <div className="relative aspect-[4/5] overflow-hidden rounded-t-[999px] border-2 border-laton">
            <Image
              src="/simulacion/consultorio-ansiedad-generalizada.webp"
              alt="Vista previa del consultorio antes de ingresar"
              fill
              unoptimized
              className="object-cover"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function VisualPaso3() {
  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-4 vetas-nogal px-5 py-4 text-lino">
        <div className="relative h-16 w-14 shrink-0 overflow-hidden rounded-t-[999px] border-2 border-laton bg-terracota-suave">
          <Image
            src="/pacientes/marta-lucia.webp"
            alt=""
            fill
            unoptimized
            className="object-cover"
          />
        </div>
        <div className="min-w-0">
          <p className="font-mono text-xs text-sidebar-muted">E-01 · Clínico</p>
          <p className="truncate text-lg font-bold text-lino">Duelo y pérdida</p>
          <p className="text-xs text-sidebar-muted">Marta Lucía, 58 años · 15 minutos</p>
        </div>
      </div>

      <div className="grid gap-3 bg-card p-4 sm:grid-cols-2 sm:p-5">
        <div className="flex flex-col gap-2 text-xs">
          <p className="flex items-center gap-1.5 font-semibold text-salvia-oscuro">
            <Target className="size-3.5 text-salvia" aria-hidden />
            Empatía y validación emocional
          </p>
          <p className="leading-relaxed text-muted-foreground">
            Acude cuatro meses después de perder a su esposo. Presenta culpa y tristeza persistente.
          </p>
        </div>

        <ul className="flex flex-col gap-2 rounded-xl border bg-muted/35 p-3 text-xs text-foreground/90">
          <li className="flex items-start gap-2">
            <Clock className="mt-0.5 size-3.5 shrink-0 text-salvia" aria-hidden />
            Tiempo inicia con tu primer mensaje.
          </li>
          <li className="flex items-start gap-2">
            <Hourglass className="mt-0.5 size-3.5 shrink-0 text-salvia" aria-hidden />
            Aviso a los 3 minutos del cierre.
          </li>
          <li className="flex items-start gap-2">
            <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-salvia" aria-hidden />
            Aviso de privacidad visible antes de entrar.
          </li>
        </ul>
      </div>
    </div>
  );
}

function VisualPaso4() {
  return (
    <div className="relative aspect-[16/10] w-full overflow-hidden bg-nogal">
      <Image
        src="/simulacion/consultorio-duelo-y-perdida.webp"
        alt="Consultorio 3D durante la conversación con el paciente"
        fill
        unoptimized
        className="object-cover object-[50%_40%]"
      />
      <div
        aria-hidden
        className="absolute inset-0 bg-linear-to-t from-black/70 via-black/15 to-black/25"
      />

      <div className="absolute top-3 left-3 flex items-center gap-2 rounded-lg border border-white/15 bg-card/95 px-3 py-1.5 text-xs font-medium text-foreground shadow-md backdrop-blur">
        <span className="size-2 rounded-full bg-salvia" aria-hidden />
        <span>Escuchando</span>
        <span aria-hidden className="text-border">
          ·
        </span>
        <span className="tabular-nums">12 min restantes</span>
      </div>

      <div className="absolute inset-x-3 bottom-3 flex flex-col gap-2 rounded-xl border bg-card/95 p-3.5 shadow-[0_16px_36px_-18px_rgb(29_20_14/0.6)] backdrop-blur">
        <div className="flex items-center justify-between gap-2 border-b pb-2">
          <div className="flex items-center gap-2">
            <AvatarPaciente
              src="/pacientes/marta-lucia.webp"
              nombre="Marta Lucía"
              className="size-7 text-xs"
            />
            <span className="text-xs font-bold text-terracota">Marta Lucía</span>
          </div>
          <span className="rounded border bg-background px-2 py-0.5 text-xs text-muted-foreground">
            Ensayar otra respuesta
          </span>
        </div>

        <p className="max-w-[88%] self-end rounded-xl rounded-br-sm bg-salvia-suave px-3 py-1.5 text-xs text-foreground">
          Entiendo que haya sido difícil venir hoy. ¿Qué es lo que más pesa en estos días?
        </p>
        <p className="max-w-[90%] self-start rounded-xl rounded-bl-sm border bg-background px-3 py-1.5 text-xs text-foreground">
          Las mañanas… despertar y sentir la casa vacía. A veces siento culpa por no notar señales.
        </p>

        <div className="flex items-center justify-between rounded-lg border bg-background px-3 py-1.5 text-xs text-muted-foreground">
          <span>Escribe tu intervención…</span>
          <SendHorizontal className="size-3.5 text-nogal" aria-hidden />
        </div>
      </div>
    </div>
  );
}

function VisualPaso5() {
  return (
    <div className="grid gap-4 bg-card p-4 sm:grid-cols-[1.15fr_0.85fr] sm:p-5">
      <div className="flex flex-col gap-2.5 text-xs">
        <p className="max-w-[92%] self-start rounded-xl rounded-bl-sm border bg-background px-3 py-2 text-foreground">
          A veces siento culpa por no haber insistido en que fuera antes al médico.
        </p>
        <p className="max-w-[94%] self-end rounded-xl rounded-br-sm bg-salvia-suave px-3 py-2 text-foreground">
          <mark className="rounded-sm bg-ambar-suave px-0.5 text-foreground underline decoration-ambar decoration-2 underline-offset-4">
            Es comprensible sentir esa carga después de una pérdida repentina.
            <sup className="ml-0.5 font-semibold text-ambar">1</sup>
          </mark>{' '}
          ¿Con quién has podido hablar en casa?
        </p>
        <p className="mt-auto rounded-lg border border-dashed bg-muted/40 px-3 py-2 text-muted-foreground">
          Reflexión: «Me ayudó validar la culpa antes de explorar su red de apoyo».
        </p>
      </div>

      <div className="flex flex-col justify-between gap-3 rounded-xl border bg-background p-3.5 text-xs">
        <div className="flex flex-col gap-1.5">
          <span className="inline-flex items-center gap-1.5 font-bold text-foreground">
            <Highlighter className="size-3.5 text-ambar" aria-hidden />
            Comentario 1
          </span>
          <p className="rounded-lg bg-ambar-suave/70 p-2.5 leading-relaxed text-foreground">
            Validación oportuna antes de preguntar por la red familiar.
          </p>
        </div>

        <div className="flex items-end justify-between border-t pt-2.5">
          <div>
            <span className="text-muted-foreground">Nota formativa</span>
            <p className="text-lg font-bold text-nogal tabular-nums">4,5 / 5,0</p>
          </div>
          <span className="rounded-full bg-salvia-oscuro px-2.5 py-0.5 font-medium text-lino">
            Publicada
          </span>
        </div>
      </div>
    </div>
  );
}
