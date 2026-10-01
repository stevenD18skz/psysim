import {
  Armchair,
  ArrowRight,
  BarChart3,
  Bot,
  BrainCircuit,
  Coffee,
  Gauge,
  HeartPulse,
  MessageSquare,
  Target,
  Wrench,
} from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';

import { LogoUnivalle } from '@/components/layout/logo-univalle';
import { PiePagina } from '@/components/layout/pie-pagina';
import { Button } from '@/components/ui/button';

/** Catálogo de escenarios (coincide con supabase/migrations/…_sembrar_escenarios.sql). */
const ESCENARIOS = [
  {
    codigo: 'E-01',
    titulo: 'Duelo y pérdida',
    categoria: 'Clínico',
    nivel: 1,
    competencia: 'Empatía y validación emocional',
  },
  {
    codigo: 'E-02',
    titulo: 'Ansiedad generalizada',
    categoria: 'Clínico',
    nivel: 2,
    competencia: 'Evaluación estructurada',
  },
  {
    codigo: 'E-03',
    titulo: 'Episodio depresivo leve',
    categoria: 'Clínico',
    nivel: 2,
    competencia: 'Evaluación de riesgo',
  },
  {
    codigo: 'E-04',
    titulo: 'Crisis de pánico aguda',
    categoria: 'Clínico',
    nivel: 3,
    competencia: 'Intervención en crisis',
  },
  {
    codigo: 'E-05',
    titulo: 'Conflicto de pareja',
    categoria: 'Cotidiano',
    nivel: 1,
    competencia: 'Escucha activa',
  },
  {
    codigo: 'E-06',
    titulo: 'Estrés académico',
    categoria: 'Cotidiano',
    nivel: 1,
    competencia: 'Estrategias de afrontamiento',
  },
] as const;

const NIVELES = ['', 'Básico', 'Intermedio', 'Avanzado'] as const;

export default function Home() {
  return (
    <div className="flex min-h-screen flex-1 flex-col bg-background">
      {/* Filete con el rojo institucional de la Universidad del Valle. */}
      <div aria-hidden className="h-1 bg-marca" />
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5">
        <span className="flex items-center gap-3">
          <LogoUnivalle className="h-12" />
          <span className="h-9 w-px bg-border" aria-hidden />
          <span className="grid leading-tight">
            <span className="font-heading text-xl font-semibold">PsySim</span>
            <span className="text-xs text-muted-foreground">Simulador clínico · Psicología</span>
          </span>
        </span>
        <Button asChild variant="outline">
          <Link href="/login">Ingresar</Link>
        </Button>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-6">
        {/* Presentación */}
        <section className="grid items-center gap-10 py-16 lg:grid-cols-[1.2fr_1fr] lg:py-24">
          <div className="flex flex-col gap-6">
            <p className="text-sm font-medium tracking-wide text-primary uppercase">
              Universidad del Valle · Trabajo de grado
            </p>
            <h1 className="text-4xl leading-tight font-semibold tracking-tight sm:text-5xl">
              Un consultorio virtual para practicar la entrevista clínica
            </h1>
            <p className="max-w-xl text-lg leading-relaxed text-muted-foreground">
              Plataforma web 3D donde estudiantes de psicología conversan con{' '}
              <strong className="font-medium text-foreground">pacientes virtuales</strong> guiados
              por inteligencia artificial, en escenarios que el docente configura y evalúa.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Button asChild size="lg" className="h-11 px-5 text-base">
                <Link href="/login">
                  Ingresar como docente
                  <ArrowRight aria-hidden />
                </Link>
              </Button>
              <span className="text-sm text-muted-foreground">Brayan Steven Narváez Valdés</span>
            </div>
          </div>

          <figure className="rounded-lg border border-l-4 border-l-primary bg-card p-8 shadow-xs">
            <div className="flex flex-col gap-4">
              <BrainCircuit className="size-10 text-primary" aria-hidden />
              <blockquote className="font-heading text-2xl leading-snug">
                «Buenas… la verdad no sé muy bien por dónde empezar.»
              </blockquote>
              <figcaption className="text-sm text-muted-foreground">
                Marta Lucía, 58 años — escenario E-01, Duelo y pérdida
              </figcaption>
            </div>
          </figure>
        </section>

        {/* Características */}
        <Seccion titulo="Todo lo necesario para una práctica clínica realista">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Caracteristica
              icono={<MessageSquare />}
              titulo="Conversación con IA"
              texto="Diálogo en lenguaje natural. El paciente adopta su perfil clínico a partir de un prompt que el docente puede ajustar en cada sesión."
            />
            <Caracteristica
              icono={<Armchair />}
              titulo="Entorno 3D inmersivo"
              texto="Consultorios navegables en primera persona con React Three Fiber, colisiones y modelos comprimidos con Draco."
            />
            <Caracteristica
              icono={<Bot />}
              titulo="Paciente reactivo"
              texto="Animaciones sincronizadas con la conversación: escucha, reflexiona y responde."
            />
            <Caracteristica
              icono={<BarChart3 />}
              titulo="Métricas automáticas"
              texto="Duración de la sesión, número de intervenciones y latencias de respuesta, sin interrumpir la práctica."
            />
            <Caracteristica
              icono={<Wrench />}
              titulo="Configuraciones reutilizables"
              texto="El docente guarda sus ajustes por escenario y los carga en segundos para cada grupo."
            />
            <Caracteristica
              icono={<Gauge />}
              titulo="Pensado para equipos modestos"
              texto="Funciona en el navegador de un portátil de oficina, sin gafas de realidad virtual ni instalaciones."
            />
          </div>
        </Seccion>

        {/* Escenarios */}
        <Seccion titulo="Seis escenarios, de lo cotidiano a la crisis">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {ESCENARIOS.map(e => (
              <article
                key={e.codigo}
                className="flex flex-col gap-3 rounded-2xl border bg-card p-5"
              >
                <div className="flex items-center gap-2">
                  <span className="rounded-md bg-secondary px-2 py-0.5 font-mono text-xs">
                    {e.codigo}
                  </span>
                  <span
                    className={
                      e.categoria === 'Clínico'
                        ? 'inline-flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-xs text-accent-foreground'
                        : 'inline-flex items-center gap-1 rounded-full bg-sage px-2 py-0.5 text-xs text-sage-foreground'
                    }
                  >
                    {e.categoria === 'Clínico' ? (
                      <HeartPulse className="size-3" aria-hidden />
                    ) : (
                      <Coffee className="size-3" aria-hidden />
                    )}
                    {e.categoria}
                  </span>
                  <span className="ml-auto text-xs text-muted-foreground">{NIVELES[e.nivel]}</span>
                </div>
                <h3 className="text-lg font-semibold">{e.titulo}</h3>
                <p className="mt-auto flex items-center gap-2 text-sm text-muted-foreground">
                  <Target className="size-4 text-primary" aria-hidden />
                  {e.competencia}
                </p>
              </article>
            ))}
          </div>
        </Seccion>

        {/* Tecnología */}
        <Seccion titulo="Tecnología">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <ColumnaStack
              titulo="Interfaz"
              items={['Next.js 16 · React 19', 'Tailwind CSS · shadcn/ui', 'Zustand', 'Zod']}
            />
            <ColumnaStack
              titulo="Motor 3D"
              items={['Three.js', 'React Three Fiber', '@react-three/drei', 'Draco']}
            />
            <ColumnaStack
              titulo="Datos"
              items={['Supabase Auth', 'PostgreSQL + RLS', 'Supabase Storage', 'Route Handlers']}
            />
            <ColumnaStack
              titulo="IA"
              items={['Google Gemini', 'Vercel AI SDK', 'Prompts por escenario', 'Vercel']}
            />
          </div>
        </Seccion>
      </main>

      <PiePagina className="mt-16" />
    </div>
  );
}

function Seccion({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-8 border-t py-16">
      <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">{titulo}</h2>
      {children}
    </section>
  );
}

function Caracteristica({
  icono,
  titulo,
  texto,
}: {
  icono: ReactNode;
  titulo: string;
  texto: string;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border bg-card p-6 transition-shadow hover:shadow-md">
      <span className="flex size-10 items-center justify-center rounded-xl bg-accent text-accent-foreground [&_svg]:size-5">
        {icono}
      </span>
      <h3 className="text-lg font-semibold">{titulo}</h3>
      <p className="text-sm leading-relaxed text-muted-foreground">{texto}</p>
    </div>
  );
}

function ColumnaStack({ titulo, items }: { titulo: string; items: string[] }) {
  return (
    <div className="rounded-2xl border bg-card p-6">
      <h3 className="mb-3 text-sm font-medium tracking-wide text-muted-foreground uppercase">
        {titulo}
      </h3>
      <ul className="flex flex-col gap-2 text-sm">
        {items.map(item => (
          <li key={item} className="flex items-center gap-2">
            <span className="size-1.5 rounded-full bg-primary" aria-hidden />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
