import { KeyRound } from 'lucide-react';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { CambioObligatorioDeContrasena } from '@/components/layout/cambio-obligatorio-de-contrasena';
import { MarcaPsySim } from '@/components/layout/marca-psysim';
import { debeCambiarContrasena, requerirUsuario } from '@/lib/auth/dal';
import { RUTA_INICIO } from '@/lib/auth/routes';
import { LONGITUD_MINIMA_CONTRASENA } from '@/schemas/auth.schema';

export const metadata: Metadata = { title: 'Cambia tu contraseña' };

/**
 * A donde llega un docente (o el Administrador) que todavía usa la contraseña temporal que le
 * generó el Administrador. Esa contraseña suele viajar por un chat o un correo: hasta que la
 * cambie, el panel no le abre nada más (`requerirDocente` y el layout del panel redirigen aquí).
 *
 * Usa `requerirUsuario`, no `requerirDocente`: esta es la única pantalla que debe abrirse con la
 * contraseña temporal. Quien ya la cambió, o no tiene que cambiarla, vuelve a su inicio.
 */
export default async function CambiarContrasenaPage() {
  const perfil = await requerirUsuario();
  if (!debeCambiarContrasena(perfil)) {
    redirect(RUTA_INICIO[perfil.rol]);
  }

  return (
    <main className="flex min-h-svh flex-1 flex-col items-center justify-center gap-8 bg-background px-4 py-12">
      <MarcaPsySim className="h-8" />
      <section className="flex w-full max-w-md flex-col gap-5 rounded-2xl border bg-card p-7">
        <span className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <KeyRound className="size-6" aria-hidden />
        </span>
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl leading-tight font-bold tracking-[-0.02em]">
            Cambia tu contraseña temporal
          </h1>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Entraste con la contraseña temporal que te dio el administrador de PsySim. Antes de
            continuar, cámbiala por una que solo tú conozcas: usa al menos{' '}
            {LONGITUD_MINIMA_CONTRASENA} caracteres. Una frase corta es fácil de recordar y difícil
            de adivinar.
          </p>
        </div>
        <CambioObligatorioDeContrasena destino={RUTA_INICIO[perfil.rol]} />
      </section>
    </main>
  );
}
