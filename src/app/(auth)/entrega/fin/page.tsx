import { CheckCircle2 } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';

import { MarcaPsySim } from '@/components/layout/marca-psysim';
import { Button } from '@/components/ui/button';
import { RUTA_LOGIN } from '@/lib/auth/routes';
import { URL_CERRAR_GOOGLE } from '@/lib/equipo-compartido/entrega';

import { PanelMarca } from '../../login/panel-marca';

export const metadata: Metadata = {
  title: 'Sesión cerrada',
  robots: { index: false, follow: false },
};

/**
 * Fin de una práctica en un equipo compartido. La sesión de PsySim ya se cerró; falta la de
 * Google, que sigue abierta en el navegador y quedaría disponible para el siguiente estudiante.
 */
export default function FinEntregaPage() {
  return (
    <div className="flex min-h-dvh flex-1 flex-col bg-background">
      <main className="grid flex-1 lg:grid-cols-[1fr_1fr]">
        <PanelMarca />

        <section className="flex flex-col px-6 py-8 sm:px-10">
          <Link
            href="/"
            className="w-fit rounded-lg outline-hidden focus-visible:ring-2 focus-visible:ring-ring lg:hidden"
          >
            <MarcaPsySim className="h-8" />
          </Link>

          <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-8 py-10">
            <div className="flex flex-col gap-3">
              <span className="flex size-12 items-center justify-center rounded-full bg-salvia-suave text-salvia-oscuro">
                <CheckCircle2 className="size-6" aria-hidden />
              </span>
              <h1 className="text-[2.2rem] leading-[1.05] font-bold tracking-[-0.025em]">
                Cerraste tu sesión en PsySim
              </h1>
              <p className="text-muted-foreground">
                Falta un paso: tu cuenta de Google sigue abierta en este navegador. Ciérrala para
                que el próximo estudiante no pueda entrar con ella.
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <Button variant="accion" size="lg" asChild>
                <a href={URL_CERRAR_GOOGLE}>Cerrar mi sesión de Google</a>
              </Button>
              <p className="text-sm text-muted-foreground">
                Después, tu docente puede volver a entrar a PsySim con su cuenta.
              </p>
            </div>

            <Link
              href={`${RUTA_LOGIN}?docente=1`}
              className="w-fit text-sm font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              Volver al acceso de PsySim
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
