import {
  Armchair,
  ArrowRight,
  BarChart3,
  Bot,
  CheckCircle2,
  Gauge,
  MessageSquare,
  Wrench,
} from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';

import { EscenariosGaleria } from '@/components/landing/escenarios-galeria';
import { HeroVisual } from '@/components/landing/hero-visual';
import { LogoUnivalle } from '@/components/layout/logo-univalle';
import { PiePagina } from '@/components/layout/pie-pagina';
import { Button } from '@/components/ui/button';
import { JsonLd } from '@/lib/seo/json-ld';
import { DESCRIPCION_SITIO, NOMBRE_SITIO, TITULO_SITIO, URL_SITIO } from '@/lib/sitio';

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

export default function Home() {
  return (
    <div className="flex min-h-screen flex-1 flex-col bg-background pb-20 md:pb-0">
      <JsonLd datos={DATOS_ESTRUCTURADOS} />
      {/* Filete con el rojo institucional de la Universidad del Valle. */}
      <div aria-hidden className="h-1 bg-marca" />
      <div className="relative isolate overflow-hidden border-b">
        {/* Fondo del hero: resplandor con el rojo institucional y trama de puntos. */}
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-[radial-gradient(60rem_32rem_at_85%_-10%,color-mix(in_oklab,var(--marca)_12%,transparent),transparent),radial-gradient(40rem_28rem_at_0%_100%,var(--accent),transparent)]"
        />
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-[radial-gradient(color-mix(in_oklab,var(--foreground)_14%,transparent)_1px,transparent_1px)] [mask-image:linear-gradient(to_bottom,black,transparent_85%)] bg-size-[22px_22px]"
        />
        <header className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-5">
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

        {/* Presentación */}
        <section
          aria-labelledby="titulo-principal"
          className="mx-auto grid w-full max-w-7xl items-center gap-14 px-6 pt-8 pb-20 lg:grid-cols-[1fr_1.1fr] lg:gap-16 lg:pt-14 lg:pb-28"
        >
          <div className="flex flex-col gap-7 motion-safe:animate-in motion-safe:duration-700 motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-3">
            <h1
              id="titulo-principal"
              className="text-4xl leading-[1.08] font-semibold tracking-tight text-balance sm:text-5xl lg:text-[3.4rem]"
            >
              Un consultorio virtual para practicar la{' '}
              <span className="bg-[linear-gradient(transparent_62%,color-mix(in_oklab,var(--marca)_22%,transparent)_62%)] px-1">
                entrevista clínica
              </span>
            </h1>
            <p className="max-w-xl text-lg leading-relaxed text-muted-foreground sm:text-xl">
              Plataforma web 3D donde estudiantes de psicología conversan con{' '}
              <strong className="font-medium text-foreground">pacientes virtuales</strong> guiados
              por inteligencia artificial, en escenarios que el docente configura y evalúa.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Button asChild size="lg" className="h-12 px-6 text-base shadow-md">
                <Link href="/login">
                  Ingresar como docente
                  <ArrowRight aria-hidden />
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="h-12 bg-card/80 px-6 text-base"
              >
                <a href="#escenarios">Ver los escenarios</a>
              </Button>
            </div>
            <dl className="grid max-w-lg grid-cols-3 gap-4 border-t pt-6">
              {[
                ['6', 'escenarios, del día a día a la crisis'],
                ['0', 'instalaciones ni gafas de realidad virtual'],
                ['IA', 'paciente que responde en lenguaje natural'],
              ].map(([valor, texto]) => (
                <div key={texto} className="flex flex-col gap-1">
                  <dt className="font-heading text-3xl font-semibold text-primary">{valor}</dt>
                  <dd className="text-xs leading-snug text-muted-foreground">{texto}</dd>
                </div>
              ))}
            </dl>
            <p className="text-sm text-muted-foreground">
              Proyecto de{' '}
              <span className="font-medium text-foreground">Brayan Steven Narváez Valdés</span>
            </p>
          </div>

          <div className="motion-safe:animate-in motion-safe:duration-1000 motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-5">
            <HeroVisual />
          </div>
        </section>
      </div>

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-6 pt-16">
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
        <Seccion
          id="escenarios"
          titulo="Seis escenarios, de lo cotidiano a la crisis"
          descripcion="Elige uno para ver al paciente, la competencia que entrena y cómo empieza la conversación."
        >
          <EscenariosGaleria />
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

function Seccion({
  id,
  titulo,
  descripcion,
  children,
}: {
  id?: string;
  titulo: string;
  descripcion?: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="flex scroll-mt-8 flex-col gap-8 border-t py-16">
      <div className="flex max-w-2xl flex-col gap-2">
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">{titulo}</h2>
        {descripcion && <p className="text-muted-foreground">{descripcion}</p>}
      </div>
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
