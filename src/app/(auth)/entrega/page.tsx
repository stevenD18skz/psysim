import { KeyRound, LogOut, UserRound } from 'lucide-react';
import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { MarcaPsySim } from '@/components/layout/marca-psysim';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { rutaUnirse } from '@/lib/asignaciones/codigo';
import { obtenerSesionUsuario } from '@/lib/auth/dal';
import { RUTA_INICIO, RUTA_LOGIN } from '@/lib/auth/routes';
import { cancelarEntrega } from '@/lib/equipo-compartido/actions';
import {
  COOKIE_ENTREGA,
  leerEntrega,
  PARAM_CUENTA_RECHAZADA,
  primerNombre,
  URL_CERRAR_GOOGLE,
} from '@/lib/equipo-compartido/entrega';

import { BotonGoogle } from '../login/boton-google';
import { PanelMarca } from '../login/panel-marca';

export const metadata: Metadata = {
  title: 'Equipo listo',
  robots: { index: false, follow: false },
};

/**
 * Modo presencial: pantalla que el docente deja abierta al entregar su computador. El estudiante
 * entra con su cuenta y llega directo a su código. Si el docente tenía Google vinculado, primero se
 * le pide cerrar esa sesión: el selector de cuentas de Google le permitiría al estudiante elegirla.
 */
export default async function EntregaPage({ searchParams }: PageProps<'/entrega'>) {
  const cuentaRechazada = (await searchParams)[PARAM_CUENTA_RECHAZADA] === '1';
  const entrega = leerEntrega((await cookies()).get(COOKIE_ENTREGA)?.value);
  if (!entrega) redirect(RUTA_LOGIN);

  const destino = rutaUnirse(entrega.codigo);
  const sesion = await obtenerSesionUsuario();
  if (sesion.estado === 'autorizado') {
    redirect(sesion.perfil.rol === 'estudiante' ? destino : RUTA_INICIO[sesion.perfil.rol]);
  }

  const nombre = primerNombre(entrega.estudiante);

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
            {cuentaRechazada && (
              <Alert variant="destructive" role="alert">
                <AlertDescription>
                  Esa cuenta no es de un estudiante. En este equipo solo puede entrar {nombre} con
                  su correo institucional. Si eres el docente y quieres recuperar el equipo, usa
                  «Volver a entrar como docente».
                </AlertDescription>
              </Alert>
            )}
            {entrega.docenteConGoogle && (
              <Alert role="alert">
                <LogOut aria-hidden />
                <AlertTitle>Docente: antes de entregar el equipo</AlertTitle>
                <AlertDescription className="flex flex-col gap-2">
                  <p>
                    Tu cuenta de Google sigue abierta en este navegador. Ciérrala para que {nombre}{' '}
                    no pueda elegirla al entrar.
                  </p>
                  <a
                    href={URL_CERRAR_GOOGLE}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-fit font-semibold text-foreground underline underline-offset-4"
                  >
                    Cerrar mi sesión de Google (se abre en otra pestaña)
                  </a>
                </AlertDescription>
              </Alert>
            )}

            <div className="flex flex-col gap-2">
              <p className="mb-2 w-fit rounded-full bg-salvia-suave px-3 py-1 text-sm font-medium text-salvia-oscuro">
                Equipo listo para {entrega.estudiante}
              </p>
              <h1 className="text-[2.2rem] leading-[1.05] font-bold tracking-[-0.025em]">
                Hola, {nombre}
              </h1>
              <p className="text-muted-foreground">
                Tu docente te preparó la práctica «{entrega.caso}» en este computador.
              </p>
            </div>

            <ol className="flex flex-col gap-3 text-sm leading-relaxed">
              <li className="flex gap-3">
                <UserRound className="mt-0.5 size-4 shrink-0 text-salvia" aria-hidden />
                <span>
                  Entra con tu correo @correounivalle.edu.co. Si Google te muestra otra cuenta,
                  elige «Usar otra cuenta».
                </span>
              </li>
              <li className="flex gap-3">
                <KeyRound className="mt-0.5 size-4 shrink-0 text-salvia" aria-hidden />
                <span>
                  Tu código <span className="font-mono font-semibold">{entrega.codigo}</span> ya
                  está cargado: solo confírmalo.
                </span>
              </li>
              <li className="flex gap-3">
                <LogOut className="mt-0.5 size-4 shrink-0 text-salvia" aria-hidden />
                <span>Al terminar, cierra tu sesión para que nadie más vea tus prácticas.</span>
              </li>
            </ol>

            <BotonGoogle siguiente={destino} />

            <form action={cancelarEntrega}>
              <Button type="submit" variant="link" className="h-auto px-0 text-muted-foreground">
                ¿No eres {nombre}? Volver a entrar como docente
              </Button>
            </form>
          </div>
        </section>
      </main>
    </div>
  );
}
