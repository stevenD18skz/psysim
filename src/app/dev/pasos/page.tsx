import {
  CheckCircle2,
  Clock,
  Highlighter,
  Hourglass,
  KeyRound,
  Monitor,
  SendHorizontal,
  ShieldCheck,
  SlidersHorizontal,
  Target,
} from 'lucide-react';
import type { Metadata } from 'next';
import Image from 'next/image';
import { notFound } from 'next/navigation';

import { InsigniaCategoria } from '@/components/casos/insignias-caso';
import { LogoGoogle } from '@/components/comun/logo-google';
import { AvatarPaciente } from '@/components/pacientes/avatar-paciente';

export const metadata: Metadata = { title: 'Vista previa de pasos (desarrollo)' };

/**
 * Herramienta de desarrollo para capturar las 5 ilustraciones reales de «Cómo funciona» en la
 * página pública. No existe en producción.
 */
export default function VistaPreviaPasosPage() {
  if (process.env.NODE_ENV === 'production') notFound();

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-12 bg-background p-10">
      {/* Paso 1: El docente prepara el caso y genera el código */}
      <section
        data-paso="1"
        className="flex h-[500px] w-[800px] flex-col justify-between overflow-hidden rounded-2xl border bg-background p-7"
      >
        <div className="flex items-center justify-between border-b pb-4">
          <div className="flex items-center gap-3">
            <span className="flex size-8 items-center justify-center rounded-full bg-salvia-oscuro text-sm font-semibold text-lino">
              1
            </span>
            <div>
              <p className="text-base font-bold">Caso y paciente elegidos</p>
              <p className="text-xs text-muted-foreground">
                E-01 · Duelo y pérdida · Marta Lucía, 58 años
              </p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-salvia-suave px-3 py-1 text-xs font-semibold text-salvia-oscuro">
            <SlidersHorizontal className="size-3.5" aria-hidden />
            Comportamiento ajustado
          </span>
        </div>

        <div className="grid grid-cols-[1.15fr_0.85fr] gap-5">
          <div className="flex flex-col gap-3 rounded-xl border bg-card p-5">
            <div className="flex items-center gap-3">
              <AvatarPaciente
                src="/pacientes/marta-lucia.webp"
                nombre="Marta Lucía"
                className="size-12 text-sm ring-2 ring-laton/50"
              />
              <div>
                <p className="text-base font-bold text-terracota">Marta Lucía</p>
                <div className="mt-1 flex items-center gap-2">
                  <InsigniaCategoria categoria="clinico" />
                  <span className="text-xs text-muted-foreground">Nivel básico</span>
                </div>
              </div>
            </div>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Cuatro meses tras la muerte repentina de su esposo. Tristeza profunda y culpa; le
              cuesta hablar de lo ocurrido.
            </p>
            <div className="mt-auto flex flex-wrap items-center gap-2 border-t pt-3">
              <span className="text-xs font-semibold text-muted-foreground">Consulta:</span>
              {['10 min', '15 min', '20 min'].map(opcion => (
                <span
                  key={opcion}
                  className={
                    opcion === '15 min'
                      ? 'rounded-full bg-nogal px-3 py-1 text-xs font-semibold text-lino'
                      : 'rounded-full border bg-background px-3 py-1 text-xs text-muted-foreground'
                  }
                >
                  {opcion}
                </span>
              ))}
            </div>
          </div>

          <div className="flex flex-col justify-between rounded-xl vetas-nogal p-5 text-lino">
            <div className="flex items-center gap-2 text-xs text-sidebar-muted">
              <KeyRound className="size-4 text-laton" aria-hidden />
              <span>Código de un solo uso</span>
            </div>
            <div className="py-2 text-center">
              <p className="font-mono text-3xl font-semibold tracking-[0.14em] text-lino">
                abc-defg-hij
              </p>
              <p className="mt-1 text-xs text-sidebar-muted">Vence en 7 días</p>
            </div>
            <div className="rounded-lg border border-lino/20 bg-lino/10 px-3 py-2 text-center text-xs font-medium text-lino">
              Copiar mensaje para estudiante
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between rounded-xl border bg-card px-4 py-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="size-4 text-salvia-oscuro" aria-hidden />
            Listo para enviar por correo o mensajería institucional
          </span>
          <span className="rounded-lg bg-laton px-3.5 py-1.5 font-semibold text-foreground">
            Código generado
          </span>
        </div>
      </section>

      {/* Paso 2: Abres el enlace en un computador */}
      <section
        data-paso="2"
        className="flex h-[500px] w-[800px] items-center justify-center overflow-hidden rounded-2xl vetas-nogal p-10 text-sidebar-foreground"
      >
        <div className="grid w-full grid-cols-[1.15fr_0.85fr] items-center gap-8">
          <div className="flex flex-col gap-4 rounded-2xl bg-card p-6 text-card-foreground shadow-[0_24px_48px_-24px_rgb(0_0_0/0.55)]">
            <div className="flex flex-col gap-1.5">
              <p className="text-sm font-semibold">Código de acceso</p>
              <div className="flex gap-2">
                <div className="flex h-11 flex-1 items-center gap-2.5 rounded-lg border border-input bg-background px-3 font-mono text-base tracking-[0.08em] text-foreground">
                  <KeyRound className="size-4 text-muted-foreground" aria-hidden />
                  <span>abc-defg-hij</span>
                </div>
                <span className="inline-flex h-11 items-center rounded-lg bg-laton px-4 text-sm font-semibold text-foreground">
                  Entrar
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span aria-hidden className="h-px flex-1 bg-border" />o
              <span aria-hidden className="h-px flex-1 bg-border" />
            </div>

            <div className="flex h-11 items-center justify-center gap-2.5 rounded-lg border-2 border-nogal/70 bg-card text-sm font-semibold text-foreground">
              <LogoGoogle />
              Continuar con Google
            </div>

            <p className="text-xs text-muted-foreground">
              Correo institucional @correounivalle.edu.co
            </p>
            <p className="flex items-center gap-2 border-t pt-3 text-xs text-muted-foreground">
              <Monitor className="size-4 shrink-0 text-salvia" aria-hidden />
              Directo en Chrome, Edge o Firefox sin instalar nada.
            </p>
          </div>

          <div className="flex flex-col gap-4">
            <div className="rounded-t-[999px] bg-[#2a190f] p-2.5 shadow-[0_30px_60px_-30px_rgb(0_0_0/0.6)]">
              <div className="relative aspect-[4/5] overflow-hidden rounded-t-[999px] border-2 border-laton">
                <Image
                  src="/simulacion/consultorio-duelo-y-perdida.webp"
                  alt=""
                  fill
                  unoptimized
                  className="object-cover"
                />
              </div>
            </div>
            <p className="text-center text-xs text-sidebar-muted">
              Si abres el enlace en el celular, el código queda intacto.
            </p>
          </div>
        </div>
      </section>

      {/* Paso 3: Lees el caso y las reglas */}
      <section
        data-paso="3"
        className="flex h-[500px] w-[800px] flex-col overflow-hidden rounded-2xl border bg-card"
      >
        <div className="flex items-center gap-5 vetas-nogal px-7 py-5 text-lino">
          <div className="relative h-24 w-20 shrink-0 overflow-hidden rounded-t-[999px] border-2 border-laton bg-terracota-suave">
            <Image
              src="/pacientes/marta-lucia.webp"
              alt=""
              fill
              unoptimized
              className="object-cover"
            />
          </div>
          <div className="flex flex-1 flex-col gap-1">
            <div className="flex items-center gap-2 text-xs text-sidebar-muted">
              <span className="font-mono">E-01</span>
              <span>·</span>
              <span>Clínico</span>
            </div>
            <h2 className="text-2xl font-bold text-lino">Duelo y pérdida</h2>
            <p className="text-sm text-sidebar-muted">
              Marta Lucía, 58 años · Consulta de 15 minutos
            </p>
          </div>
        </div>

        <div className="grid flex-1 grid-cols-2 gap-6 p-6">
          <div className="flex flex-col gap-3">
            <p className="flex items-center gap-2 text-xs font-semibold text-salvia-oscuro">
              <Target className="size-4 text-salvia" aria-hidden />
              Competencia: Empatía y validación emocional
            </p>
            <div className="flex flex-col gap-2 rounded-xl border bg-muted/35 p-4">
              <p className="text-sm font-semibold">Reglas visibles antes de empezar</p>
              <ul className="flex flex-col gap-2 text-xs text-muted-foreground">
                <li className="flex items-start gap-2">
                  <Clock className="mt-0.5 size-3.5 shrink-0 text-salvia" aria-hidden />
                  El reloj corre desde tu primera intervención, no mientras lees.
                </li>
                <li className="flex items-start gap-2">
                  <Hourglass className="mt-0.5 size-3.5 shrink-0 text-salvia" aria-hidden />
                  Aviso cuando falten 3 minutos para que tú cierres la entrevista.
                </li>
                <li className="flex items-start gap-2">
                  <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-salvia" aria-hidden />
                  Tu docente revisará la conversación al terminar, nunca en vivo.
                </li>
              </ul>
            </div>
          </div>

          <div className="flex flex-col justify-between gap-4 rounded-xl border bg-background p-5">
            <div className="flex flex-col gap-2">
              <p className="text-sm font-semibold">Controles del consultorio</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {[
                  ['W A S D', 'Caminar'],
                  ['Ratón', 'Mirar alrededor'],
                  ['Tecla E', 'Conversar'],
                  ['Enter', 'Enviar mensaje'],
                ].map(([tecla, accion]) => (
                  <div key={tecla} className="rounded-lg border bg-card px-2.5 py-2">
                    <span className="font-mono font-semibold text-foreground">{tecla}</span>
                    <span className="block text-muted-foreground">{accion}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between border-t pt-3">
              <span className="text-xs font-medium text-salvia-oscuro">
                Aviso de privacidad aceptado
              </span>
              <span className="rounded-lg bg-laton px-4 py-2 text-xs font-semibold text-foreground">
                Empezar la práctica
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Paso 4: Conversas con el paciente en el consultorio 3D */}
      <section
        data-paso="4"
        className="relative h-[500px] w-[800px] overflow-hidden rounded-2xl border bg-nogal"
      >
        <Image
          src="/simulacion/consultorio-duelo-y-perdida.webp"
          alt=""
          fill
          unoptimized
          className="object-cover"
        />
        <div
          aria-hidden
          className="absolute inset-0 bg-linear-to-t from-black/55 via-transparent to-black/20"
        />

        <div className="absolute top-4 left-4 flex items-center gap-2 rounded-xl border border-white/15 bg-card/95 px-3.5 py-2 text-xs font-medium text-foreground shadow-lg backdrop-blur">
          <span className="size-2 rounded-full bg-salvia" aria-hidden />
          <span>Escuchando</span>
          <span aria-hidden className="text-border">
            ·
          </span>
          <Hourglass className="size-3.5 text-salvia" aria-hidden />
          <span className="tabular-nums">Quedan 12 min de consulta</span>
        </div>

        <div className="absolute top-4 right-4 flex items-center gap-2">
          {['Hoja de remisión', 'Mis notas'].map(item => (
            <span
              key={item}
              className="rounded-lg border border-white/15 bg-card/95 px-3 py-1.5 text-xs font-medium text-foreground shadow-lg backdrop-blur"
            >
              {item}
            </span>
          ))}
        </div>

        <div className="absolute inset-x-4 bottom-4 flex flex-col gap-3 rounded-2xl border bg-card/95 p-4 shadow-[0_20px_50px_-20px_rgb(29_20_14/0.55)] backdrop-blur">
          <div className="flex items-center justify-between border-b pb-2.5">
            <div className="flex items-center gap-2.5">
              <AvatarPaciente
                src="/pacientes/marta-lucia.webp"
                nombre="Marta Lucía"
                className="size-8 text-xs"
              />
              <div>
                <p className="text-sm font-bold text-terracota">Marta Lucía</p>
                <p className="text-xs text-muted-foreground">E-01 · Duelo y pérdida</p>
              </div>
            </div>
            <span className="rounded-md border bg-background px-2.5 py-1 text-xs font-medium text-muted-foreground">
              Ensayar otra respuesta
            </span>
          </div>

          <div className="flex flex-col gap-2 text-xs">
            <div className="max-w-[78%] self-end rounded-2xl rounded-br-md bg-salvia-suave px-3.5 py-2 text-foreground">
              Entiendo que haya sido difícil venir hoy. ¿Qué es lo que más ha pesado en estos meses?
            </div>
            <div className="max-w-[82%] self-start rounded-2xl rounded-bl-md border bg-background px-3.5 py-2 text-foreground">
              Las mañanas… despertarme y ver su lado vacío. A veces siento culpa por no haber
              insistido en que fuera antes al médico.
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-xl border bg-background px-3.5 py-2 text-xs text-muted-foreground">
            <span className="flex-1">Escribe tu siguiente intervención…</span>
            <span className="inline-flex size-7 items-center justify-center rounded-lg bg-nogal text-lino">
              <SendHorizontal className="size-3.5" aria-hidden />
            </span>
          </div>
        </div>
      </section>

      {/* Paso 5: Tu docente revisa y publica la retroalimentación */}
      <section
        data-paso="5"
        className="flex h-[500px] w-[800px] flex-col justify-between overflow-hidden rounded-2xl border bg-background p-6"
      >
        <div className="flex items-center justify-between border-b pb-3.5">
          <div>
            <p className="text-base font-bold">Revisión de la práctica · E-01</p>
            <p className="text-xs text-muted-foreground">
              14 min · 18 intervenciones · Terminada por el estudiante
            </p>
          </div>
          <span className="rounded-full bg-salvia-oscuro px-3 py-1 text-xs font-semibold text-lino">
            Publicada
          </span>
        </div>

        <div className="grid flex-1 grid-cols-[1.15fr_0.85fr] gap-5 pt-4">
          <div className="flex flex-col gap-3 rounded-xl border bg-card p-4 text-xs">
            <div className="max-w-[88%] self-start rounded-2xl rounded-bl-md border bg-background px-3.5 py-2.5 leading-relaxed">
              A veces siento culpa por no haber insistido en que fuera antes al médico.
            </div>
            <div className="max-w-[88%] self-end rounded-2xl rounded-br-md bg-salvia-suave px-3.5 py-2.5 leading-relaxed">
              <mark className="rounded-sm bg-ambar-suave px-0.5 text-foreground underline decoration-ambar decoration-2 underline-offset-4">
                Es muy comprensible sentir esa carga después de una pérdida repentina.
                <sup className="ml-0.5 font-bold text-ambar">1</sup>
              </mark>{' '}
              ¿Con quién has podido hablar de esto en casa?
            </div>
            <div className="mt-auto rounded-lg border border-dashed bg-muted/40 px-3 py-2 text-muted-foreground">
              Reflexión del estudiante: «Me ayudó validar la culpa antes de pasar a su red de
              apoyo».
            </div>
          </div>

          <div className="flex flex-col justify-between gap-3 rounded-xl border bg-card p-4">
            <div className="flex flex-col gap-2">
              <p className="flex items-center gap-1.5 text-xs font-bold">
                <Highlighter className="size-3.5 text-ambar" aria-hidden />
                Anotación 1 en la frase
              </p>
              <p className="rounded-lg bg-ambar-suave/70 p-2.5 text-xs leading-relaxed text-foreground">
                Validación oportuna y serena antes de explorar su red familiar.
              </p>
            </div>

            <div className="flex flex-col gap-1 border-t pt-3">
              <p className="text-xs font-bold">Comentario general</p>
              <p className="text-xs leading-relaxed text-muted-foreground">
                Sostuviste el silencio y evitaste consejos rápidos. En el cierre puedes recapitular
                sus apoyos.
              </p>
            </div>

            <div className="flex items-center justify-between border-t pt-3">
              <div>
                <p className="text-xs text-muted-foreground">Nota formativa</p>
                <p className="text-xl font-bold text-nogal tabular-nums">4,5 / 5,0</p>
              </div>
              <span className="rounded-lg bg-nogal px-3.5 py-2 text-xs font-semibold text-lino">
                Publicar revisión
              </span>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
