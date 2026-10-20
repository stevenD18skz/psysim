import { ArrowRight, ChevronDown, Monitor } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

import { BotonGoogle } from '@/app/(auth)/login/boton-google';
import { BarraCodigoMovil } from '@/components/landing/barra-codigo-movil';
import { EntradaCodigo } from '@/components/landing/entrada-codigo';
import { EscenariosGaleria } from '@/components/landing/escenarios-galeria';
import { LogoUnivalle } from '@/components/layout/logo-univalle';
import { MarcaPsySim } from '@/components/layout/marca-psysim';
import { PiePagina } from '@/components/layout/pie-pagina';
import { ESCENARIOS_PUBLICOS } from '@/lib/landing/escenarios';
import { JsonLd } from '@/lib/seo/json-ld';
import { DESCRIPCION_SITIO, NOMBRE_SITIO, TITULO_SITIO, URL_SITIO } from '@/lib/sitio';

const PREGUNTAS = [
  {
    pregunta: '¿Converso con una persona real?',
    respuesta:
      'No. El paciente es una IA (Google Gemini) que sigue el caso que preparó tu docente. Puede equivocarse o salirse del papel.',
  },
  {
    pregunta: '¿Quién lee mi conversación?',
    respuesta:
      'Tu docente, cuando terminas. No la ve en vivo. Google la procesa para generar las respuestas del paciente. Los detalles están en el aviso de privacidad.',
  },
  {
    pregunta: '¿Puedo hacerla en el celular?',
    respuesta:
      'Puedes ver tus prácticas y tu retroalimentación en el celular. La simulación necesita un computador con teclado y ratón.',
  },
  {
    pregunta: '¿Tengo que instalar algo?',
    respuesta:
      'No. Funciona en el navegador de un portátil de oficina, sin gafas de realidad virtual.',
  },
  {
    pregunta: '¿Reemplaza la práctica con personas?',
    respuesta:
      'No. Es un espacio para ensayar la entrevista antes de la práctica real, sin riesgo para nadie.',
  },
  {
    pregunta: '¿Y si me equivoco?',
    respuesta:
      'Para eso está. Es una práctica formativa: los comentarios de tu docente te ayudan a mejorar.',
  },
] as const;

const CICLO = [
  {
    titulo: 'Tu docente prepara el caso',
    texto: 'Elige un caso, ajusta cómo actúa el paciente y te envía un código de un solo uso.',
  },
  {
    titulo: 'Abres el enlace en un computador',
    texto: 'Entras con tu correo institucional. No hay nada que instalar.',
  },
  {
    titulo: 'Lees el caso y las reglas',
    texto: 'Sabes qué vas a practicar, de qué trata el caso y qué puede cerrar la práctica.',
  },
  {
    titulo: 'Conversas con el paciente',
    texto:
      'Recorres el consultorio y escribes como lo harías en consulta. El paciente responde y su rostro reacciona.',
  },
  {
    titulo: 'Tu docente te deja comentarios',
    texto:
      'Lee la conversación, comenta frases concretas y publica una retroalimentación con nota.',
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
  const portada = ESCENARIOS_PUBLICOS[0];

  return (
    <div className="flex min-h-screen flex-1 flex-col bg-background pb-20 md:pb-0">
      <JsonLd datos={DATOS_ESTRUCTURADOS} />

      {/* El consultorio visto desde el umbral: la franja de nogal lleva la marca y la acción. */}
      <div className="vetas-nogal text-sidebar-foreground">
        <header className="mx-auto flex w-full max-w-7xl items-center gap-6 px-5 py-5 sm:px-8">
          <Link
            href="/"
            className="rounded-lg outline-hidden focus-visible:ring-2 focus-visible:ring-laton"
          >
            <MarcaPsySim className="h-8" />
          </Link>
          <nav aria-label="Principal" className="ml-auto flex items-center gap-1 sm:gap-2">
            {[
              ['#como-funciona', 'Cómo funciona'],
              ['#casos', 'Casos'],
              ['/privacidad', 'Privacidad'],
            ].map(([href, texto]) => (
              <a
                key={href}
                href={href}
                className="hidden rounded-md px-3 py-2 text-sm text-sidebar-foreground/85 outline-hidden hover:bg-sidebar-accent hover:text-sidebar-foreground focus-visible:ring-2 focus-visible:ring-laton md:inline"
              >
                {texto}
              </a>
            ))}
            <Link
              href="/login?docente=1"
              className="rounded-full border border-lino/35 px-4 py-2 text-sm font-medium outline-hidden hover:border-lino/70 focus-visible:ring-2 focus-visible:ring-laton"
            >
              Soy docente
            </Link>
          </nav>
        </header>

        <section
          aria-labelledby="titulo-principal"
          className="mx-auto grid w-full max-w-7xl items-center gap-12 px-5 pt-6 pb-16 sm:px-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:gap-16 lg:pt-10 lg:pb-24"
        >
          <div className="flex flex-col gap-7">
            <div className="flex flex-col gap-5">
              <h1
                id="titulo-principal"
                className="max-w-[16ch] text-[2.6rem] leading-[1.02] font-bold tracking-[-0.035em] text-balance ancho-expandido sm:text-[3.4rem] lg:text-[3.9rem]"
              >
                Practica la entrevista clínica con un paciente que responde.
              </h1>
              <p className="max-w-xl text-lg leading-relaxed text-sidebar-foreground/85">
                Entra al consultorio 3D desde tu navegador, conversa por escrito con un paciente
                simulado con IA y recibe los comentarios de tu docente, frase por frase.
              </p>
            </div>

            {/* La acción real del estudiante, en su forma de trabajo. */}
            <div
              id="codigo"
              className="flex max-w-lg scroll-mt-6 flex-col gap-4 rounded-2xl bg-card p-5 text-card-foreground shadow-[0_24px_48px_-24px_rgb(0_0_0/0.55)] sm:p-6"
            >
              <EntradaCodigo />
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <span aria-hidden className="h-px flex-1 bg-border" />o
                <span aria-hidden className="h-px flex-1 bg-border" />
              </div>
              <BotonGoogle siguiente={null} />
              <p className="text-sm text-muted-foreground">
                Usa tu correo @correounivalle.edu.co. Tu docente debe haberte registrado.
              </p>
              <p className="flex items-center gap-2 border-t pt-3 text-sm text-muted-foreground">
                <Monitor className="size-4 shrink-0 text-salvia" aria-hidden />
                La práctica se hace en un computador con teclado y ratón.
              </p>
            </div>
          </div>

          {portada && (
            <figure className="mx-auto flex w-full max-w-md flex-col gap-5 lg:max-w-none lg:pl-6">
              {/* El vano de la puerta del consultorio, con la captura real de la simulación. */}
              {/* Jamba oscura con el filo de latón: se lee como una puerta, no como un marco. */}
              <div className="rounded-t-[999px] bg-[#2a190f] p-3 shadow-[0_40px_80px_-40px_rgb(0_0_0/0.7)] sm:p-3.5">
                <div className="relative aspect-[4/5] w-full overflow-hidden rounded-t-[999px] border-2 border-laton">
                  <Image
                    src={portada.imagen.src}
                    alt="Consultorio 3D con Marta Lucía, la paciente del caso E-01, sentada en un sillón"
                    fill
                    priority
                    sizes="(min-width: 1024px) 520px, 90vw"
                    className="object-cover"
                  />
                </div>
              </div>
              <figcaption className="flex flex-col gap-2">
                <blockquote className="text-xl leading-snug font-medium text-balance">
                  «{portada.paciente.apertura}»
                </blockquote>
                <span className="text-sm text-sidebar-muted">
                  {portada.paciente.nombre}, {portada.paciente.edad} años · {portada.codigo}{' '}
                  {portada.titulo}
                </span>
              </figcaption>
            </figure>
          )}
        </section>

        <div className="border-t border-laton/60">
          <p className="mx-auto flex w-full max-w-7xl items-center gap-3 px-5 py-4 text-sm text-sidebar-muted sm:px-8">
            <span className="rounded-md bg-white p-1">
              <LogoUnivalle className="h-6" />
            </span>
            Un proyecto de grado de la Universidad del Valle
          </p>
        </div>
      </div>

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-5 sm:px-8">
        {/* El ciclo real, como un registro por etapas. */}
        <Seccion id="como-funciona" titulo="Cómo funciona una práctica">
          {/* Un registro sobre una sola regla de latón: el ordinal va dentro del encabezado. */}
          <ol className="grid gap-x-6 gap-y-7 border-t-2 border-laton pt-5 sm:grid-cols-2 md:grid-cols-5">
            {CICLO.map((paso, i) => (
              <li key={paso.titulo} className="flex flex-col gap-2">
                <h3 className="text-base leading-snug font-bold">
                  <span className="mr-1 text-salvia-oscuro ancho-condensado tabular-nums">
                    {i + 1} ·
                  </span>
                  {paso.titulo}
                </h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{paso.texto}</p>
              </li>
            ))}
          </ol>
        </Seccion>

        <Seccion
          id="casos"
          titulo="Doce casos para empezar"
          descripcion="De lo cotidiano a la crisis. Tu docente también puede crear los suyos."
        >
          <EscenariosGaleria />
        </Seccion>

        <Seccion
          titulo="La revisión, frase por frase"
          descripcion="Tu docente subraya lo que dijiste y te explica por qué funcionó o qué cambiarías."
        >
          <RevisionIlustrativa />
        </Seccion>

        <Seccion id="preguntas-frecuentes" titulo="Lo que conviene saber">
          <div className="flex flex-col divide-y rounded-xl border bg-card">
            {PREGUNTAS.map(p => (
              <details key={p.pregunta} className="group px-5 py-4">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-md text-base font-bold outline-hidden focus-visible:ring-2 focus-visible:ring-ring">
                  {p.pregunta}
                  <ChevronDown
                    className="size-5 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
                    aria-hidden
                  />
                </summary>
                <p className="mt-3 max-w-[65ch] text-sm leading-relaxed text-muted-foreground">
                  {p.respuesta}
                </p>
              </details>
            ))}
          </div>
        </Seccion>

        <section className="my-4 flex flex-col gap-5 rounded-2xl vetas-nogal p-7 text-sidebar-foreground sm:flex-row sm:items-center sm:p-9">
          <div className="flex flex-1 flex-col gap-2">
            <h2 className="text-2xl font-bold tracking-[-0.02em]">Para docentes</h2>
            <p className="max-w-xl text-sidebar-foreground/85">
              Asigna un caso con un código, sigue quién está practicando y revisa cada conversación
              frase por frase.
            </p>
          </div>
          {/* Contorno sobre la madera: el latón de la página es solo «Entrar». */}
          <Link
            href="/login?docente=1"
            className="inline-flex h-11 w-fit items-center gap-2 rounded-lg border border-lino/40 px-5 font-semibold outline-hidden hover:border-lino/80 hover:bg-sidebar-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid"
          >
            Ingresar como docente
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        </section>

        <details className="group mt-8 mb-4 rounded-xl border bg-card">
          <summary className="flex cursor-pointer list-none items-center gap-2 rounded-xl px-5 py-4 text-sm font-semibold outline-hidden focus-visible:ring-2 focus-visible:ring-ring">
            Ficha técnica del proyecto
            <ChevronDown
              className="ml-auto size-4 transition-transform group-open:rotate-180"
              aria-hidden
            />
          </summary>
          <dl className="grid gap-x-8 gap-y-3 border-t px-5 py-5 text-sm sm:grid-cols-2">
            {[
              ['Autor', 'Brayan Steven Narváez Valdés'],
              [
                'Institución',
                'Universidad del Valle · Escuela de Ingeniería de Sistemas y Computación · Trabajo de grado, 2026',
              ],
              ['Interfaz', 'Next.js 16, React 19, Tailwind CSS 4, shadcn/ui'],
              ['Consultorio 3D', 'Three.js, React Three Fiber, Draco'],
              ['Datos y acceso', 'Supabase (PostgreSQL con RLS, Auth, Storage)'],
              ['Paciente', 'Google Gemini mediante Vercel AI SDK, con reglas fijas de seguridad'],
              [
                'Alcance',
                'Práctica formativa de la entrevista clínica. No tiene validación clínica ni sustituye la supervisión docente.',
              ],
              ['Accesibilidad', 'Meta: WCAG 2.2 AA en las pantallas 2D.'],
            ].map(([dato, valor]) => (
              <div key={dato} className="flex flex-col gap-0.5">
                <dt className="font-semibold">{dato}</dt>
                <dd className="text-muted-foreground">{valor}</dd>
              </div>
            ))}
          </dl>
        </details>
      </main>

      {/* En móvil, la acción del estudiante queda a mano cuando ya no se ve el bloque del código. */}
      <BarraCodigoMovil objetivo="codigo" />

      <PiePagina className="mt-12" />
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
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="flex scroll-mt-8 flex-col gap-7 py-14 sm:py-16">
      <div className="flex max-w-2xl flex-col gap-2">
        <h2 className="text-[1.75rem] leading-tight font-bold tracking-[-0.02em] sm:text-[2.1rem]">
          {titulo}
        </h2>
        {descripcion && <p className="text-lg text-muted-foreground">{descripcion}</p>}
      </div>
      {children}
    </section>
  );
}

/**
 * Ejemplo ilustrativo de la revisión: dos intervenciones con un comentario del docente señalado
 * con una línea guía hacia la frase exacta. Es un ejemplo, y así se rotula.
 */
function RevisionIlustrativa() {
  return (
    <figure className="grid gap-6 rounded-xl border bg-card p-5 sm:p-7 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] lg:items-center">
      <ol aria-label="Fragmento de una conversación de práctica" className="flex flex-col gap-3">
        <li className="flex max-w-[88%] flex-col gap-1 self-start">
          <span className="px-1 text-xs font-medium text-muted-foreground">Paciente</span>
          <p className="rounded-2xl rounded-bl-md border bg-background px-4 py-2.5 text-sm leading-relaxed">
            No sé si esto sea algo importante, la verdad. Solo me siento muy cansada.
          </p>
        </li>
        <li className="flex max-w-[88%] flex-col items-end gap-1 self-end">
          <span className="px-1 text-xs font-medium text-muted-foreground">Estudiante</span>
          <p className="rounded-2xl rounded-br-md bg-salvia-suave px-4 py-2.5 text-sm leading-relaxed">
            Entiendo.{' '}
            <mark className="relative rounded-sm bg-ambar-suave px-0.5 text-foreground underline decoration-ambar decoration-2 underline-offset-4">
              ¿Desde cuándo te sientes así?
              <sup className="ml-0.5 text-xs font-semibold text-ambar">1</sup>
            </mark>{' '}
            Cuéntame un poco más.
          </p>
        </li>
      </ol>
      <div className="relative flex flex-col gap-2 lg:pl-8">
        {/* Línea guía hacia la frase comentada (solo en escritorio, donde van lado a lado). */}
        <span aria-hidden className="absolute top-1/2 -left-6 hidden h-px w-12 bg-ambar lg:block" />
        <p className="flex items-center gap-2 text-sm font-bold">
          <span className="flex size-5 items-center justify-center rounded-full bg-ambar-suave text-xs text-ambar">
            1
          </span>
          Comentario del docente
        </p>
        <p className="leading-relaxed">
          Buena pregunta abierta. Antes, valida lo que dijo: «Lo que sientes sí es importante».
        </p>
        <p className="text-xs text-muted-foreground">Ejemplo ilustrativo</p>
      </div>
    </figure>
  );
}
