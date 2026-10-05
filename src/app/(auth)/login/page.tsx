import { ArrowLeft, CheckCircle2, ShieldCheck } from 'lucide-react';
import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { LogoUnivalle } from '@/components/layout/logo-univalle';
import { PiePagina } from '@/components/layout/pie-pagina';
import { obtenerSesionDocente } from '@/lib/auth/dal';
import { PARAM_SIGUIENTE, rutaSiguienteSegura } from '@/lib/auth/routes';
import { ESCENARIOS_PUBLICOS } from '@/lib/landing/escenarios';

import { LoginForm } from './login-form';

export const metadata: Metadata = {
  title: 'Iniciar sesión',
  description: 'Acceso para docentes de la plataforma PsySim de la Universidad del Valle.',
  alternates: { canonical: '/login' },
  robots: { index: false, follow: false },
};

const PUNTOS = [
  'Seis escenarios clínicos y cotidianos, o los casos que tú crees.',
  'Un paciente virtual con IA que responde en lenguaje natural.',
  'Duración, intervenciones y tiempos de respuesta de cada sesión.',
] as const;

export default async function LoginPage({ searchParams }: PageProps<'/login'>) {
  const params = await searchParams;
  const valor = params[PARAM_SIGUIENTE];
  const siguiente = typeof valor === 'string' ? valor : null;

  // Un docente con sesión activa no necesita ver el formulario (HU-02 · T04).
  const sesion = await obtenerSesionDocente();
  if (sesion.estado === 'autorizado') {
    redirect(rutaSiguienteSegura(siguiente));
  }

  const [duelo] = ESCENARIOS_PUBLICOS;

  return (
    <div className="flex min-h-dvh flex-1 flex-col bg-background">
      {/* Filete con el rojo institucional de la Universidad del Valle. */}
      <div aria-hidden className="h-1 bg-marca" />

      <main className="grid flex-1 lg:grid-cols-[1.1fr_1fr]">
        {/* Panel de marca: la simulación de fondo y lo que ofrece la plataforma. */}
        <aside className="relative isolate flex flex-col justify-between gap-10 overflow-hidden bg-neutral-950 px-6 py-8 text-white lg:px-12 lg:py-12">
          {duelo && (
            <Image
              src={duelo.imagen.src}
              alt=""
              fill
              priority
              sizes="(min-width: 1024px) 55vw, 100vw"
              className="-z-20 object-cover opacity-70"
            />
          )}
          <div
            aria-hidden
            className="absolute inset-0 -z-10 bg-linear-to-b from-black/80 via-black/45 to-black/85"
          />

          <div className="flex items-center gap-3">
            <span className="rounded-xl bg-white p-2 shadow-lg">
              <LogoUnivalle className="h-10" />
            </span>
            <span className="grid leading-tight">
              <span className="font-heading text-2xl font-semibold">PsySim</span>
              <span className="text-xs text-white/70">Simulador de escenarios psicológicos</span>
            </span>
          </div>

          <div className="hidden max-w-lg flex-col gap-8 lg:flex">
            <p className="font-heading text-4xl leading-tight font-semibold text-balance">
              Practica la entrevista clínica antes de la consulta real.
            </p>
            <ul className="flex flex-col gap-3">
              {PUNTOS.map(punto => (
                <li key={punto} className="flex items-start gap-3 text-white/85">
                  <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-white" aria-hidden />
                  {punto}
                </li>
              ))}
            </ul>
          </div>

          {duelo && (
            <figure className="hidden max-w-md rounded-2xl border border-white/15 bg-white/10 p-5 backdrop-blur-md lg:block">
              <blockquote className="font-heading text-lg leading-snug">
                «{duelo.paciente.apertura}»
              </blockquote>
              <figcaption className="mt-3 text-sm text-white/70">
                {duelo.paciente.nombre}, {duelo.paciente.edad} años · {duelo.codigo}, {duelo.titulo}
              </figcaption>
            </figure>
          )}
        </aside>

        {/* Formulario */}
        <section className="relative flex items-center justify-center px-6 py-12 sm:px-10">
          <div
            aria-hidden
            className="absolute inset-0 -z-10 bg-[radial-gradient(30rem_20rem_at_100%_0%,color-mix(in_oklab,var(--marca)_8%,transparent),transparent)]"
          />
          <div className="flex w-full max-w-sm flex-col gap-8">
            <div className="flex flex-col gap-2">
              <p className="flex w-fit items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
                <ShieldCheck className="size-3.5 text-primary" aria-hidden />
                Acceso exclusivo para docentes
              </p>
              <h1 className="text-4xl font-semibold tracking-tight">Bienvenido de nuevo</h1>
              <p className="text-muted-foreground">
                Ingresa con tu correo institucional para preparar y dirigir las sesiones de
                práctica.
              </p>
            </div>

            <LoginForm siguiente={siguiente} />

            <div className="flex flex-col gap-3 border-t pt-6 text-sm text-muted-foreground">
              <p>
                ¿No tienes cuenta o olvidaste tu contraseña? Las cuentas las gestiona el
                administrador de la plataforma.
              </p>
              <Link
                href="/"
                className="inline-flex w-fit items-center gap-1.5 font-medium text-foreground underline-offset-4 hover:underline"
              >
                <ArrowLeft className="size-4" aria-hidden />
                Volver al inicio
              </Link>
            </div>
          </div>
        </section>
      </main>

      <PiePagina />
    </div>
  );
}
