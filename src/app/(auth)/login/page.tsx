import { ArrowLeft } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { obtenerSesionDocente } from '@/lib/auth/dal';
import { PARAM_SIGUIENTE, rutaSiguienteSegura } from '@/lib/auth/routes';

import { LoginForm } from './login-form';
import { PanelMarca } from './panel-marca';

export const metadata: Metadata = {
  title: 'Iniciar sesión',
  description: 'Acceso para docentes de la plataforma PsySim de la Universidad del Valle.',
  alternates: { canonical: '/login' },
  robots: { index: false, follow: false },
};

export default async function LoginPage({ searchParams }: PageProps<'/login'>) {
  const params = await searchParams;
  const valor = params[PARAM_SIGUIENTE];
  const siguiente = typeof valor === 'string' ? valor : null;

  // Un docente con sesión activa no necesita ver el formulario (HU-02 · T04).
  const sesion = await obtenerSesionDocente();
  if (sesion.estado === 'autorizado') {
    redirect(rutaSiguienteSegura(siguiente));
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
