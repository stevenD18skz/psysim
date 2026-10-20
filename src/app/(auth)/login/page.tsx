import { ArrowLeft, ChevronDown } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { MarcaPsySim } from '@/components/layout/marca-psysim';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { obtenerSesionUsuario } from '@/lib/auth/dal';
import { ERRORES_GOOGLE, esErrorGoogle, PARAM_ERROR_LOGIN } from '@/lib/auth/google';
import { PARAM_SIGUIENTE, rutaSiguienteSegura } from '@/lib/auth/routes';

import { BotonGoogle } from './boton-google';
import { LoginForm } from './login-form';
import { PanelMarca } from './panel-marca';

export const metadata: Metadata = {
  title: 'Entrar',
  description: 'Acceso a PsySim para estudiantes y docentes.',
  alternates: { canonical: '/login' },
  robots: { index: false, follow: false },
};

const RUTAS_DOCENTE = [
  '/inicio',
  '/sesiones',
  '/estudiantes',
  '/configuracion',
  '/admin',
  '/laboratorio',
];

/**
 * Entrar a PsySim. Google es el camino principal (los estudiantes entran con su correo
 * institucional); el correo y la contraseña de los docentes quedan en un desplegable que se abre
 * solo cuando se llega desde «Soy docente» (`?docente=1`). Si se viene de un enlace de práctica,
 * se dice para qué es el acceso.
 */
export default async function LoginPage({ searchParams }: PageProps<'/login'>) {
  const params = await searchParams;
  const valor = params[PARAM_SIGUIENTE];
  const siguiente = typeof valor === 'string' ? valor : null;
  const motivo = params[PARAM_ERROR_LOGIN];
  const errorGoogle = esErrorGoogle(motivo) ? ERRORES_GOOGLE[motivo] : null;
  const vieneDePractica = siguiente?.startsWith('/unirse/') ?? false;
  // Volver a una página de docente (p. ej. tras caducar la sesión) también abre su formulario.
  const esDocente =
    params.docente === '1' ||
    (siguiente !== null && RUTAS_DOCENTE.some(ruta => siguiente.startsWith(ruta)));

  // Con una sesión activa no hace falta el formulario (HU-02 · T04).
  const sesion = await obtenerSesionUsuario();
  if (sesion.estado === 'autorizado') {
    redirect(rutaSiguienteSegura(siguiente, sesion.perfil.rol));
  }

  return (
    <div className="flex min-h-dvh flex-1 flex-col bg-background">
      <main className="grid flex-1 lg:grid-cols-[1fr_1fr]">
        <PanelMarca />

        <section className="flex flex-col px-6 py-8 sm:px-10">
          {/* En móvil no hay panel de marca: la marca va arriba. */}
          <Link
            href="/"
            className="w-fit rounded-lg outline-hidden focus-visible:ring-2 focus-visible:ring-ring lg:hidden"
          >
            <MarcaPsySim className="h-8" />
          </Link>

          <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-8 py-10">
            <div className="flex flex-col gap-2">
              {vieneDePractica && (
                <p className="mb-2 w-fit rounded-full bg-salvia-suave px-3 py-1 text-sm font-medium text-salvia-oscuro">
                  Entra para abrir tu práctica.
                </p>
              )}
              <h1 className="text-[2.2rem] leading-[1.05] font-bold tracking-[-0.025em]">
                Entra a PsySim
              </h1>
              <p className="text-muted-foreground">
                Practica, o prepara y revisa las prácticas de tus estudiantes.
              </p>
            </div>

            <section aria-labelledby="acceso-google" className="flex flex-col gap-3">
              <h2 id="acceso-google" className="sr-only">
                Con tu cuenta de Google
              </h2>
              {errorGoogle && (
                <Alert variant="destructive" role="alert">
                  <AlertDescription>{errorGoogle}</AlertDescription>
                </Alert>
              )}
              <BotonGoogle siguiente={siguiente} />
              <p className="text-sm text-muted-foreground">
                Estudiantes: usa tu correo @correounivalle.edu.co. Tu docente debe haberte
                registrado.
              </p>
            </section>

            <details open={esDocente} className="group rounded-xl border bg-card">
              <summary className="flex cursor-pointer list-none items-center gap-2 rounded-xl px-4 py-3.5 text-sm font-semibold outline-hidden focus-visible:ring-2 focus-visible:ring-ring">
                Soy docente: entrar con correo y contraseña
                <ChevronDown
                  className="ml-auto size-4 transition-transform group-open:rotate-180"
                  aria-hidden
                />
              </summary>
              <div className="border-t px-4 pt-4 pb-5">
                <LoginForm siguiente={siguiente} />
              </div>
            </details>

            <div className="flex flex-col gap-3 text-sm text-muted-foreground">
              <p>
                ¿Sin cuenta u olvidaste tu contraseña? Las cuentas de estudiantes las crea su
                docente; las de docentes, el administrador de PsySim.
              </p>
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                <Link
                  href="/"
                  className="inline-flex w-fit items-center gap-1.5 font-medium text-foreground underline-offset-4 hover:underline"
                >
                  <ArrowLeft className="size-4" aria-hidden />
                  Volver al inicio
                </Link>
                <Link
                  href="/privacidad"
                  className="underline-offset-4 hover:text-foreground hover:underline"
                >
                  Privacidad
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
