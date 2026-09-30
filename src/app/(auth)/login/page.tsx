import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

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
    <main className="flex flex-1 items-center justify-center bg-muted/40 px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight">PsySim</h1>
          <p className="mt-2 text-sm text-muted-foreground">Simulador de escenarios psicológicos</p>
        </div>
        <LoginForm siguiente={siguiente} />
      </div>
    </main>
  );
}
