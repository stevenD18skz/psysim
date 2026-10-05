import {
  Armchair,
  ArrowRight,
  BarChart3,
  Bot,
  BrainCircuit,
  CheckCircle2,
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
import { JsonLd } from '@/lib/seo/json-ld';
import { DESCRIPCION_SITIO, NOMBRE_SITIO, TITULO_SITIO, URL_SITIO } from '@/lib/sitio';

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

const PREGUNTAS = [
  {
    pregunta: '¿Qué es PsySim?',
    respuesta:
      'Es una plataforma web 3D de la Universidad del Valle en la que estudiantes de psicología practican la entrevista clínica conversando con pacientes virtuales guiados por inteligencia artificial.',
  },
  {
    pregunta: '¿Reemplaza la práctica con pacientes reales?',
    respuesta:
      'No. Es un espacio seguro para ensayar la entrevista antes de la práctica real: se puede repetir el escenario las veces necesarias, sin riesgo para ninguna persona.',
  },
  {
    pregunta: '¿Quién puede ingresar a la plataforma?',
    respuesta:
      'El acceso es para docentes con una cuenta autorizada. El docente configura el escenario y dirige la sesión de práctica con su grupo.',
  },
  {
    pregunta: '¿Necesito gafas de realidad virtual o instalar algo?',
    respuesta:
      'No. PsySim funciona en el navegador de un portátil de oficina, sin gafas ni instalaciones.',
  },
  {
    pregunta: '¿Qué inteligencia artificial usa el paciente virtual?',
    respuesta:
      'El diálogo lo genera Google Gemini a través del Vercel AI SDK. El perfil clínico del paciente se define con un prompt por escenario que el docente puede ajustar.',
  },
  {
    pregunta: '¿Qué métricas registra cada sesión?',
    respuesta:
      'La duración de la sesión, el número de intervenciones del estudiante y las latencias de respuesta, sin interrumpir la práctica.',
  },
] as const;

const PASOS = [
  {
    titulo: 'El docente configura el escenario',
    texto:
      'Elige el caso, ajusta el prompt del paciente y el consultorio 3D, y guarda la configuración.',
  },
  {
    titulo: 'El estudiante realiza la entrevista',
    texto:
      'Conversa en lenguaje natural con el paciente virtual, que escucha, reflexiona y responde.',
  },
  {
    titulo: 'La sesión queda medida',
    texto: 'Al finalizar se resumen la duración, las intervenciones y las latencias de respuesta.',
  },
] as const;

const DATOS_ESTRUCTURADOS = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebSite',
      '@id': `${URL_SITIO}/#sitio`,
      url: `${URL_SITIO}/`,
      name: NOMBRE_SITIO,
      description: DESCRIPCION_SITIO,
      inLanguage: 'es-CO',
    },
    {
      '@type': 'WebApplication',
      '@id': `${URL_SITIO}/#aplicacion`,
      name: NOMBRE_SITIO,
      headline: TITULO_SITIO,
      description: DESCRIPCION_SITIO,
      url: `${URL_SITIO}/`,
      applicationCategory: 'EducationalApplication',
      operatingSystem: 'Navegador web',
      inLanguage: 'es-CO',
      audience: { '@type': 'EducationalAudience', educationalRole: 'student' },
      author: { '@type': 'Person', name: 'Brayan Steven Narváez Valdés' },
      creator: {
        '@type': 'CollegeOrUniversity',
        name: 'Universidad del Valle',
        url: 'https://www.univalle.edu.co',
      },
    },
    {
      '@type': 'FAQPage',
      mainEntity: PREGUNTAS.map(p => ({
        '@type': 'Question',
        name: p.pregunta,
        acceptedAnswer: { '@type': 'Answer', text: p.respuesta },
      })),
    },
  ],
};

const NIVELES = ['', 'Básico', 'Intermedio', 'Avanzado'] as const;

export default function Home() {
  return (
    <div className="flex min-h-screen flex-1 flex-col bg-background pb-20 md:pb-0">
      <JsonLd datos={DATOS_ESTRUCTURADOS} />
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
        <nav aria-label="Principal" className="flex items-center gap-2 sm:gap-6">
          <a
            href="#como-funciona"
            className="hidden text-sm text-muted-foreground hover:text-foreground md:inline"
          >
            Cómo funciona
          </a>
          <a
            href="#escenarios"
            className="hidden text-sm text-muted-foreground hover:text-foreground md:inline"
          >
            Escenarios
          </a>
          <a
            href="#preguntas-frecuentes"
            className="hidden text-sm text-muted-foreground hover:text-foreground md:inline"
          >
            Preguntas frecuentes
          </a>
          <Button asChild variant="outline">
            <Link href="/login">Ingresar</Link>
          </Button>
        </nav>
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

        {/* Resumen */}
        <aside
          aria-labelledby="resumen"
          className="rounded-lg border border-l-4 border-l-primary bg-card p-6"
        >
          <h2 id="resumen" className="text-sm font-medium tracking-wide text-primary uppercase">
            En resumen
          </h2>
          <ul className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
            {[
              'Paciente virtual con IA que responde en lenguaje natural.',
              'Seis escenarios, de lo cotidiano a la intervención en crisis.',
              'Consultorio 3D en el navegador, sin gafas ni instalaciones.',
              'El docente configura el caso y revisa métricas de cada sesión.',
            ].map(t => (
              <li key={t} className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                {t}
              </li>
            ))}
          </ul>
        </aside>

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

        {/* Cómo funciona */}
        <Seccion id="como-funciona" titulo="Cómo funciona en tres pasos">
          <ol className="grid gap-4 sm:grid-cols-3">
            {PASOS.map((paso, i) => (
              <li key={paso.titulo} className="flex flex-col gap-3 rounded-2xl border bg-card p-6">
                <span className="flex size-8 items-center justify-center rounded-full bg-primary font-mono text-sm text-primary-foreground">
                  {i + 1}
                </span>
                <h3 className="text-lg font-semibold">{paso.titulo}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{paso.texto}</p>
              </li>
            ))}
          </ol>
        </Seccion>

        {/* Escenarios */}
        <Seccion id="escenarios" titulo="Seis escenarios, de lo cotidiano a la crisis">
          <div className="overflow-x-auto rounded-2xl border bg-card">
            <table className="w-full min-w-[34rem] text-left text-sm">
              <caption className="sr-only">
                Escenarios disponibles con su categoría, nivel y competencia que se entrena
              </caption>
              <thead className="border-b bg-muted/50 text-xs tracking-wide text-muted-foreground uppercase">
                <tr>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Código
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Escenario
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Categoría
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Nivel
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Competencia que se entrena
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {ESCENARIOS.map(e => (
                  <tr key={e.codigo}>
                    <td className="px-4 py-3 font-mono text-xs">{e.codigo}</td>
                    <th scope="row" className="px-4 py-3 font-semibold">
                      {e.titulo}
                    </th>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5">
                        {e.categoria === 'Clínico' ? (
                          <HeartPulse className="size-3.5 text-primary" aria-hidden />
                        ) : (
                          <Coffee className="size-3.5 text-primary" aria-hidden />
                        )}
                        {e.categoria}
                      </span>
                    </td>
                    <td className="px-4 py-3">{NIVELES[e.nivel]}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      <span className="inline-flex items-center gap-2">
                        <Target className="size-4 shrink-0 text-primary" aria-hidden />
                        {e.competencia}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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

        {/* Preguntas frecuentes */}
        <Seccion id="preguntas-frecuentes" titulo="Preguntas frecuentes">
          <div className="flex flex-col divide-y rounded-2xl border bg-card">
            {PREGUNTAS.map(p => (
              <details key={p.pregunta} className="group px-6 py-4">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
                  <h3 className="text-base font-semibold">{p.pregunta}</h3>
                  <span
                    aria-hidden
                    className="text-xl text-muted-foreground transition-transform group-open:rotate-45"
                  >
                    +
                  </span>
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{p.respuesta}</p>
              </details>
            ))}
          </div>
        </Seccion>
      </main>

      {/* CTA fijo en móvil: el botón del encabezado queda fuera de vista al hacer scroll. */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 p-3 backdrop-blur md:hidden">
        <Button asChild size="lg" className="w-full">
          <Link href="/login">
            Ingresar como docente
            <ArrowRight aria-hidden />
          </Link>
        </Button>
      </div>

      <PiePagina className="mt-16" />
    </div>
  );
}

function Seccion({ id, titulo, children }: { id?: string; titulo: string; children: ReactNode }) {
  return (
    <section id={id} className="flex scroll-mt-8 flex-col gap-8 border-t py-16">
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
