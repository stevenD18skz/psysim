import { UserX } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { MarcaPsySim } from '@/components/layout/marca-psysim';
import { Button } from '@/components/ui/button';
import { cerrarSesion } from '@/lib/auth/actions';
import { RUTA_LOGIN } from '@/lib/auth/routes';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = {
  title: 'Cuenta no registrada',
  robots: { index: false, follow: false },
};

async function entrarConOtraCuenta() {
  'use server';
  // Cierra la sesión sin permisos para poder entrar con otra cuenta.
  await cerrarSesion();
  redirect(RUTA_LOGIN);
}

/**
 * Cuenta sin rol en PsySim (p. ej. un Gmail personal o un estudiante que su docente aún no
 * registró). Dice con qué correo se intentó entrar y qué hacer según el rol, sin alarma: es un
 * problema de registro, no de seguridad.
 */
export default async function AccesoDenegadoPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const correo = data.user?.email ?? null;

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-8 bg-background px-4 py-12">
      <Link
        href="/"
        className="rounded-lg outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
      >
        <MarcaPsySim className="h-8" />
      </Link>
      <section className="flex w-full max-w-md flex-col gap-5 rounded-2xl border bg-card p-7">
        <span className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <UserX className="size-6" aria-hidden />
        </span>
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl leading-tight font-bold tracking-[-0.02em]">
            Tu cuenta no está registrada en PsySim
          </h1>
          {correo && (
            <p className="text-sm text-muted-foreground">
              Intentaste entrar con <span className="font-medium text-foreground">{correo}</span>.
            </p>
          )}
        </div>
        <ul className="flex flex-col gap-2 text-sm leading-relaxed text-muted-foreground">
          <li>
            Si eres estudiante, pídele a tu docente que te registre con tu correo
            @correounivalle.edu.co. Después vuelve a entrar con Google.
          </li>
          <li>Si eres docente, pídele al administrador de PsySim que cree tu cuenta.</li>
        </ul>
        <div className="flex flex-col gap-2 sm:flex-row">
          <form action={entrarConOtraCuenta} className="flex-1">
            <Button type="submit" variant="accion" className="w-full">
              Entrar con otra cuenta
            </Button>
          </form>
          <Button asChild variant="outline" className="flex-1">
            <Link href="/">Ir a la página de inicio</Link>
          </Button>
        </div>
      </section>
    </main>
  );
}
