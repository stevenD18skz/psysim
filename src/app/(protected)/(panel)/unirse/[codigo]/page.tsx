import { Clock, KeyRound, Monitor } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';

import { FormularioCodigo } from '@/components/practicas/formulario-codigo';
import { normalizarCodigoAcceso } from '@/lib/asignaciones/codigo';
import { requerirEstudiante } from '@/lib/auth/dal';

export const metadata: Metadata = {
  title: 'Tu práctica',
};

const ANTES_DE_ENTRAR = [
  { icono: KeyRound, texto: 'El código es de un solo uso y solo funciona con tu cuenta.' },
  {
    icono: Clock,
    texto:
      'Al entrar, la práctica queda abierta. Si pasan 10 minutos sin actividad, se cierra sola, también mientras lees las instrucciones.',
  },
  { icono: Monitor, texto: 'Se abre en un computador con teclado y ratón.' },
] as const;

/**
 * Enlace directo que el docente envía (/unirse/abc-defg-hij). Si el estudiante no ha iniciado
 * sesión, el proxy lo lleva a /login y vuelve aquí después. Usar el código exige confirmar con un
 * botón (abrir un enlace no crea la práctica) y, en un celular, el formulario ni siquiera lo usa:
 * protege el código hasta que lo abra en un computador.
 */
export default async function UnirsePage({ params }: PageProps<'/unirse/[codigo]'>) {
  const perfil = await requerirEstudiante();
  const { codigo } = await params;
  const normalizado = normalizarCodigoAcceso(codigo) ?? '';

  return (
    <div className="flex flex-1 items-start justify-center px-4 py-10 sm:items-center sm:py-16">
      <section
        aria-labelledby="unirse-titulo"
        className="flex w-full max-w-xl flex-col gap-7 rounded-2xl border bg-card p-6 shadow-[0_1px_2px_rgb(58_36_24/0.06),0_12px_32px_-12px_rgb(58_36_24/0.18)] sm:p-9"
      >
        <h1
          id="unirse-titulo"
          className="text-[1.9rem] leading-[1.08] font-bold tracking-[-0.025em] sm:text-4xl"
        >
          Tu docente te asignó una práctica
        </h1>

        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold">Antes de entrar</h2>
          <ul className="flex flex-col gap-3">
            {ANTES_DE_ENTRAR.map(({ icono: Icono, texto }) => (
              <li key={texto} className="flex gap-3 text-sm leading-relaxed text-muted-foreground">
                <Icono className="mt-0.5 size-4 shrink-0 text-salvia" aria-hidden />
                {texto}
              </li>
            ))}
          </ul>
        </div>

        <FormularioCodigo codigoInicial={normalizado} correo={perfil.correo} variante="unirse" />

        <Link
          href="/practicas"
          className="w-fit text-sm font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          Ahora no, ir a Mis prácticas
        </Link>
      </section>
    </div>
  );
}
