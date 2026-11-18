import { KeyRound, LogOut, UserRound } from 'lucide-react';
import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { ControlCitado } from '@/components/comun/control-citado';
import { MarcaPsySim } from '@/components/layout/marca-psysim';
import { SaltarContenido } from '@/components/layout/saltar-contenido';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
} from '@/lib/equipo-compartido/entrega';

import { BotonGoogle } from '../login/boton-google';
import { PanelMarca } from '../login/panel-marca';

import { PasoCerrarGoogle } from './paso-cerrar-google';

export const metadata: Metadata = {
  title: 'Equipo listo',
  robots: { index: false, follow: false },
};

/** El acceso del estudiante, detrás del paso del docente cuando este tiene Google vinculado. */
function AccesoDelEstudiante({
  conPaso,
  estudiante,
  children,
}: {
  conPaso: boolean;
  estudiante: string;
  children: React.ReactNode;
}) {
  if (!conPaso) return <>{children}</>;
  return <PasoCerrarGoogle estudiante={estudiante}>{children}</PasoCerrarGoogle>;
}

/**
 * Modo presencial: pantalla que el docente deja abierta al entregar su computador. El estudiante
 * entra con su cuenta y llega directo a su código. Si el docente tenía Google vinculado, primero
 * confirma que cerró esa sesión; aunque no lo haga, su cuenta no entra con Google mientras dure la
 * entrega (`lib/equipo-compartido/ventana.ts`).
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
      <SaltarContenido />
      <main className="grid flex-1 lg:grid-cols-[1fr_1fr]">
        <PanelMarca />

        {/* Destino de «Saltar al contenido»: antes van los doce casos del panel de marca. */}
        <section
          id="contenido"
          tabIndex={-1}
          className="flex flex-col px-6 py-8 outline-hidden sm:px-10"
        >
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
                  su correo institucional. Si eres el docente y quieres recuperar el equipo, usa{' '}
                  <ControlCitado>Volver a entrar como docente</ControlCitado>.
                </AlertDescription>
              </Alert>
            )}
            {/* Con Google vinculado, el docente confirma primero que cerró esa sesión. */}
            <AccesoDelEstudiante conPaso={entrega.docenteConGoogle} estudiante={nombre}>
              <div className="flex flex-col gap-2">
                <p className="mb-2 w-fit rounded-full bg-salvia-suave px-3 py-1 text-sm font-medium text-salvia-oscuro">
                  Equipo listo para {entrega.estudiante}
                </p>
                <h1 className="text-[2.2rem] leading-[1.05] font-bold tracking-[-0.025em]">
                  Hola, {nombre}
                </h1>
                <p className="text-muted-foreground">
                  Tu docente te preparó la práctica{' '}
                  <span className="font-medium text-foreground">{entrega.caso}</span> en este
                  computador.
                </p>
              </div>

              <ol className="flex flex-col gap-3 text-sm leading-relaxed">
                <li className="flex gap-3">
                  <UserRound className="mt-0.5 size-4 shrink-0 text-salvia" aria-hidden />
                  <span>
                    Entra con tu correo @correounivalle.edu.co. Si Google te muestra otra cuenta,
                    elige <ControlCitado>Usar otra cuenta</ControlCitado>.
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
            </AccesoDelEstudiante>

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
