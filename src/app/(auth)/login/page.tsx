import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { LogoUnivalle } from '@/components/layout/logo-univalle';
import { PiePagina } from '@/components/layout/pie-pagina';
import { obtenerSesionDocente } from '@/lib/auth/dal';
import { PARAM_SIGUIENTE, rutaSiguienteSegura } from '@/lib/auth/routes';

import { LoginForm } from './login-form';

export const metadata: Metadata = {
  title: 'Iniciar sesión',
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
    <div className="flex flex-1 flex-col bg-muted/40">
      {/* Filete con el rojo institucional de la Universidad del Valle. */}
      <div aria-hidden className="h-1 bg-marca" />
      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex flex-col items-center gap-4 text-center">
            <LogoUnivalle className="h-20" />
            <div>
              <h1 className="text-3xl font-semibold tracking-tight">PsySim</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Simulador de escenarios psicológicos · Universidad del Valle
              </p>
            </div>
          </div>
          <LoginForm siguiente={siguiente} />
        </div>
      </main>
      <PiePagina />
    </div>
  );
}
