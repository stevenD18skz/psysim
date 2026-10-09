import { ArrowLeft } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { obtenerSesionUsuario } from '@/lib/auth/dal';
import { ERRORES_GOOGLE, esErrorGoogle, PARAM_ERROR_LOGIN } from '@/lib/auth/google';
import { PARAM_SIGUIENTE, rutaSiguienteSegura } from '@/lib/auth/routes';

import { BotonGoogle } from './boton-google';
import { LoginForm } from './login-form';
import { PanelMarca } from './panel-marca';

export const metadata: Metadata = {
  title: 'Iniciar sesión',
  description:
    'Acceso para docentes y estudiantes de la plataforma PsySim de la Universidad del Valle.',
  alternates: { canonical: '/login' },
  robots: { index: false, follow: false },
};

export default async function LoginPage({ searchParams }: PageProps<'/login'>) {
  const params = await searchParams;
  const valor = params[PARAM_SIGUIENTE];
  const siguiente = typeof valor === 'string' ? valor : null;
  const motivo = params[PARAM_ERROR_LOGIN];
  const errorGoogle = esErrorGoogle(motivo) ? ERRORES_GOOGLE[motivo] : null;

  // Con una sesión activa no hace falta el formulario (HU-02 · T04).
  const sesion = await obtenerSesionUsuario();
  if (sesion.estado === 'autorizado') {
    redirect(rutaSiguienteSegura(siguiente, sesion.perfil.rol));
  }

  return (
    <div className="flex min-h-dvh flex-1 flex-col bg-background">
      {/* Filete con el rojo institucional de la Universidad del Valle. */}
      <div aria-hidden className="h-1 bg-marca" />

      <main className="grid flex-1 lg:grid-cols-[1.1fr_1fr]">
        {/* Panel de marca: la simulación de fondo (rota entre escenarios) y lo que ofrece. */}
        <PanelMarca />

        {/* Formulario */}
        <section className="relative flex items-center justify-center px-6 py-12 sm:px-10">
          <div
            aria-hidden
            className="absolute inset-0 -z-10 bg-[radial-gradient(30rem_20rem_at_100%_0%,color-mix(in_oklab,var(--marca)_8%,transparent),transparent)]"
          />
          <div className="flex w-full max-w-sm flex-col gap-8 text-center">
            <div className="flex flex-col gap-2">
              <h1 className="text-4xl font-semibold tracking-tight">Bienvenido de nuevo</h1>
              <p className="text-muted-foreground">
                Ingresa con tu cuenta institucional para practicar o para preparar y revisar las
                sesiones.
              </p>
            </div>

            <section aria-labelledby="acceso-estudiantes" className="flex flex-col gap-3 text-left">
              <h2 id="acceso-estudiantes" className="text-sm font-medium text-muted-foreground">
                Estudiantes
              </h2>
              {errorGoogle && (
                <Alert variant="destructive" role="alert">
                  <AlertDescription>{errorGoogle}</AlertDescription>
                </Alert>
              )}
              <BotonGoogle siguiente={siguiente} />
              <p className="text-xs text-muted-foreground">
                Usa tu correo @correounivalle.edu.co. Tu docente debe haberte registrado.
              </p>
            </section>

            <div className="flex items-center gap-3 text-xs tracking-wide text-muted-foreground uppercase">
              <span aria-hidden className="h-px flex-1 bg-border" />
              Docentes
              <span aria-hidden className="h-px flex-1 bg-border" />
            </div>

            <LoginForm siguiente={siguiente} />

            <div className="flex flex-col gap-3 border-t pt-6 text-sm text-muted-foreground">
              <p>
                ¿No tienes cuenta o olvidaste tu contraseña? Las cuentas de los docentes las
                gestiona el administrador; las de los estudiantes, su docente.
              </p>
              <Link
                href="/"
                className="mx-auto inline-flex w-fit items-center gap-1.5 font-medium text-foreground underline-offset-4 hover:underline"
              >
                <ArrowLeft className="size-4" aria-hidden />
                Volver al inicio
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
