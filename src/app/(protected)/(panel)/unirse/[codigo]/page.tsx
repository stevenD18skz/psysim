import { KeyRound } from 'lucide-react';
import type { Metadata } from 'next';

import { FormularioCodigo } from '@/components/practicas/formulario-codigo';
import { normalizarCodigoAcceso } from '@/lib/asignaciones/codigo';
import { requerirEstudiante } from '@/lib/auth/dal';

export const metadata: Metadata = {
  title: 'Unirse a la simulación',
};

/**
 * Enlace directo que el docente envía (/unirse/abc-defg-hij). Si el estudiante no ha iniciado
 * sesión, el proxy lo lleva a /login y vuelve aquí después. Entrar exige confirmar con un botón:
 * abrir un enlace no debe crear la sesión por sí solo.
 */
export default async function UnirsePage({ params }: PageProps<'/unirse/[codigo]'>) {
  await requerirEstudiante();
  const { codigo } = await params;
  const normalizado = normalizarCodigoAcceso(codigo) ?? '';

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-16">
      <section
        aria-labelledby="unirse-titulo"
        className="flex w-full max-w-lg flex-col gap-6 rounded-3xl border bg-card p-6 shadow-sm sm:p-8"
      >
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
            <KeyRound className="size-6" aria-hidden />
          </span>
          <h1 id="unirse-titulo" className="text-2xl font-semibold tracking-tight">
            Tu docente te invitó a una simulación
          </h1>
          <p className="text-muted-foreground">
            Revisa el código y entra cuando estés listo. El tiempo empieza a contar cuando confirmes
            las instrucciones del caso.
          </p>
        </div>
        <FormularioCodigo codigoInicial={normalizado} />
      </section>
    </div>
  );
}
