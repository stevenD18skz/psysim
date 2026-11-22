import { ArrowRight, BookOpen, ChevronDown, Monitor } from 'lucide-react';
import Link from 'next/link';

import { BotonGoogle } from '@/app/(auth)/login/boton-google';
import { BarraCodigoMovil } from '@/components/landing/barra-codigo-movil';
import { CicloPractica } from '@/components/landing/ciclo-practica';
import { EntradaCodigo } from '@/components/landing/entrada-codigo';
import { EscenariosGaleria } from '@/components/landing/escenarios-galeria';
import { HeroConsultorio } from '@/components/landing/hero-consultorio';
import { RevisionIlustrativa } from '@/components/landing/revision-ilustrativa';
import { LogoUnivalle } from '@/components/layout/logo-univalle';
import { MarcaPsySim } from '@/components/layout/marca-psysim';
import { PiePagina } from '@/components/layout/pie-pagina';
import { SaltarContenido } from '@/components/layout/saltar-contenido';
import { ESCENARIOS_PUBLICOS } from '@/lib/landing/escenarios';
import { JsonLd } from '@/lib/seo/json-ld';
import { DESCRIPCION_SITIO, NOMBRE_SITIO, TITULO_SITIO, URL_SITIO } from '@/lib/sitio';
import { cn } from '@/lib/utils';

const PREGUNTAS = [
  {
    pregunta: '¿Converso con una persona real?',
    respuesta:
      'No. El paciente es una IA que sigue el caso que preparó tu docente. Puede equivocarse o salirse del papel.',
  },
  {
    pregunta: '¿Quién lee mi conversación?',
    respuesta:
      'Tu docente, cuando terminas. No la ve en vivo. El proveedor de IA la procesa para generar las respuestas del paciente. Los detalles están en el aviso de privacidad.',
  },
  {
    pregunta: '¿Puedo hacerla en el celular?',
    respuesta:
      'Puedes ver tus prácticas, el manual y tu retroalimentación en el celular. La simulación 3D necesita un computador con teclado y ratón.',
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
      isAccessibleForFree: true,
      image: `${URL_SITIO}/opengraph-image.png`,
      publisher: { '@id': `${URL_SITIO}/#universidad` },
      inLanguage: 'es-CO',
      audience: { '@type': 'EducationalAudience', educationalRole: 'student' },
      author: { '@type': 'Person', name: 'Brayan Steven Narváez Valdés' },
      creator: { '@id': `${URL_SITIO}/#universidad` },
    },
    {
      '@type': 'CollegeOrUniversity',
      '@id': `${URL_SITIO}/#universidad`,
      name: 'Universidad del Valle',
      url: 'https://www.univalle.edu.co',
      logo: `${URL_SITIO}/icon.png`,
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

const CLASE_ENLACE_NOGAL =
  'relative hidden min-h-11 items-center rounded-lg px-3.5 text-sm font-medium text-sidebar-foreground/85 outline-hidden transition-[color,background-color] duration-200 ease-salida hover:bg-lino/[0.07] hover:text-lino focus-visible:ring-2 focus-visible:ring-laton-claro after:pointer-events-none after:absolute after:inset-x-3.5 after:bottom-2 after:h-0.5 after:origin-center after:scale-x-0 after:rounded-full after:bg-laton-texto after:transition-transform after:duration-200 after:ease-salida hover:after:scale-x-100 focus-visible:after:scale-x-100 motion-reduce:after:transition-none md:inline-flex';

export default function Home() {
  return (
    <div className="flex min-h-screen flex-1 flex-col bg-background pb-20 md:pb-0">
      <SaltarContenido />
      <JsonLd datos={DATOS_ESTRUCTURADOS} />

      {/* El consultorio visto desde el umbral: la franja de nogal lleva la marca y la acción. */}
      <div className="vetas-nogal text-sidebar-foreground">
        <header className="mx-auto flex w-full max-w-7xl items-center gap-4 px-5 py-4 sm:px-8">
          <Link
            href="/"
            className="rounded-lg outline-hidden focus-visible:ring-2 focus-visible:ring-laton-claro"
          >
            <MarcaPsySim className="h-8" />
          </Link>
          <nav aria-label="Principal" className="ml-auto flex items-center gap-1 sm:gap-1.5">
            <a href="#como-funciona" className={CLASE_ENLACE_NOGAL}>
              Cómo funciona
            </a>
            <a href="#casos" className={CLASE_ENLACE_NOGAL}>
              Casos
            </a>
            <Link href="/manual" className={CLASE_ENLACE_NOGAL}>
              Manual de uso
            </Link>
            <Link href="/privacidad" className={CLASE_ENLACE_NOGAL}>
              Privacidad
            </Link>
            <Link
              href="/login?docente=1"
              className="ml-1 inline-flex min-h-11 items-center rounded-full border border-lino/40 px-4 text-sm font-medium text-lino outline-hidden transition-[border-color,background-color] duration-200 hover:border-lino/80 hover:bg-lino/10 focus-visible:ring-2 focus-visible:ring-laton-claro"
            >
              Soy docente
            </Link>
          </nav>
        </header>

        <section
          aria-labelledby="titulo-principal"
          className="mx-auto grid w-full max-w-7xl items-center gap-10 px-5 pt-4 pb-10 sm:px-8 sm:pt-6 sm:pb-12 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:gap-14 lg:pt-8 lg:pb-14"
        >
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-4">
              <h1
                id="titulo-principal"
                className="max-w-[16ch] text-[2.5rem] leading-[1.02] font-bold tracking-[-0.035em] text-balance ancho-expandido sm:text-[3.3rem] lg:text-[3.8rem]"
              >
                Practica la entrevista clínica con un paciente que responde.
              </h1>
              <p className="max-w-xl text-base leading-relaxed text-sidebar-foreground/85 sm:text-lg">
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

          <HeroConsultorio escenarios={ESCENARIOS_PUBLICOS} />
        </section>

        <div className="border-t border-laton/55">
          <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-3 px-5 py-3.5 text-sm text-sidebar-muted sm:px-8">
            <p className="flex items-center gap-3">
              <span className="rounded-md bg-white p-1">
                <LogoUnivalle className="h-6" />
              </span>
              Un proyecto de grado de la Universidad del Valle
            </p>
            <Link
              href="/manual"
              className="inline-flex min-h-9 items-center gap-1.5 text-xs font-medium text-laton-texto underline-offset-4 hover:text-lino hover:underline focus-visible:ring-2 focus-visible:ring-laton-claro focus-visible:outline-hidden md:hidden"
            >
              <BookOpen className="size-3.5" aria-hidden />
              Ver manual de uso
            </Link>
          </div>
        </div>
      </div>

      <main
        id="contenido"
        tabIndex={-1}
        className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-5 outline-hidden sm:px-8"
      >
        <Seccion
          id="como-funciona"
          titulo="Cómo funciona una práctica"
          descripcion="Del código que prepara tu docente a la retroalimentación frase por frase, paso a paso."
          conBorde={false}
        >
          <CicloPractica />
        </Seccion>

        <Seccion
          id="casos"
          titulo="Doce casos para empezar"
          descripcion="De lo cotidiano a la crisis. Tu docente también puede crear los suyos."
        >
          <EscenariosGaleria />
        </Seccion>

        <Seccion
          id="revision"
          titulo="La revisión, frase por frase"
          descripcion="Tu docente subraya lo que dijiste, comenta momentos clave y publica una retroalimentación con nota."
        >
          <RevisionIlustrativa />
        </Seccion>

        <Seccion id="preguntas-frecuentes" titulo="Lo que conviene saber">
          <div className="flex flex-col divide-y rounded-xl border bg-card">
            {PREGUNTAS.map(p => (
              <details key={p.pregunta} className="group px-5 py-4">
                <summary className="flex min-h-7 cursor-pointer list-none items-center justify-between gap-4 rounded-md text-base font-bold outline-hidden focus-visible:ring-2 focus-visible:ring-ring">
                  {p.pregunta}
                  <ChevronDown
                    className="size-5 shrink-0 text-muted-foreground transition-transform duration-300 ease-salida group-open:rotate-180"
                    aria-hidden
                  />
                </summary>
                <p className="mt-3 max-w-[65ch] text-sm leading-relaxed text-muted-foreground">
                  {p.respuesta}
                </p>
              </details>
            ))}
          </div>
          <p className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span>¿Necesitas los controles de la simulación o resolver un mensaje de error?</span>
            <Link
              href="/manual"
              className="inline-flex min-h-9 items-center gap-1.5 font-semibold text-foreground underline decoration-border underline-offset-4 transition-colors hover:decoration-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-hidden"
            >
              <BookOpen className="size-4 text-salvia" aria-hidden />
              Abre el manual de uso
            </Link>
          </p>
        </Seccion>

        <section className="my-4 flex flex-col gap-5 rounded-2xl vetas-nogal p-6 text-sidebar-foreground sm:flex-row sm:items-center sm:p-8">
          <div className="flex flex-1 flex-col gap-2">
            <h2 className="text-2xl font-bold tracking-[-0.02em]">Para docentes</h2>
            <p className="max-w-xl text-sidebar-foreground/85">
              Asigna un caso con un código, sigue quién está practicando y revisa cada conversación
              frase por frase.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/manual#docente"
              className="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-3 text-sm font-medium text-laton-texto underline-offset-4 transition-colors hover:bg-lino/10 hover:text-lino hover:underline focus-visible:ring-2 focus-visible:ring-laton-claro focus-visible:outline-hidden"
            >
              <BookOpen className="size-4" aria-hidden />
              Guía docente
            </Link>
            {/* Contorno sobre la madera: el latón de la página es solo «Entrar». */}
            <Link
              href="/login?docente=1"
              className="inline-flex h-11 w-fit items-center gap-2 rounded-lg border border-lino/45 px-5 font-semibold outline-hidden transition-[border-color,background-color] hover:border-lino/80 hover:bg-sidebar-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-laton-claro focus-visible:outline-solid"
            >
              Ingresar como docente
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          </div>
        </section>

        <details className="group mt-4 mb-2 rounded-xl border bg-card">
          <summary className="flex min-h-12 cursor-pointer list-none items-center gap-2 rounded-xl px-5 py-3.5 text-sm font-semibold outline-hidden focus-visible:ring-2 focus-visible:ring-ring">
            Ficha técnica del proyecto
            <ChevronDown
              className="ml-auto size-4 transition-transform duration-300 ease-salida group-open:rotate-180"
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
              [
                'Paciente',
                'Orquestador de NPC y Google Gemini mediante Vercel AI SDK, con reglas fijas de seguridad',
              ],
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

      <PiePagina className="mt-8" />
    </div>
  );
}

function Seccion({
  id,
  titulo,
  descripcion,
  conBorde = true,
  children,
}: {
  id?: string;
  titulo: string;
  descripcion?: string;
  conBorde?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      className={cn(
        'flex scroll-mt-8 flex-col gap-5 py-8 sm:gap-6 sm:py-10',
        conBorde && 'border-t border-border/65'
      )}
    >
      <div className="flex max-w-2xl flex-col gap-1.5">
        <h2 className="text-[1.75rem] leading-tight font-bold tracking-[-0.02em] sm:text-[2.1rem]">
          {titulo}
        </h2>
        {descripcion && <p className="text-base text-muted-foreground sm:text-lg">{descripcion}</p>}
      </div>
      {children}
    </section>
  );
}
