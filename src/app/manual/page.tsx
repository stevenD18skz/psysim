import type { Metadata } from 'next';

import { MarcaPsySim } from '@/components/layout/marca-psysim';
import { PiePagina } from '@/components/layout/pie-pagina';
import { SaltarContenido } from '@/components/layout/saltar-contenido';
import { BotonVolverManual } from '@/components/manual/boton-volver-manual';
import { ContenidoManual } from '@/components/manual/contenido-manual';

export const metadata: Metadata = {
  title: 'Manual de uso',
  description:
    'Guía práctica de PsySim para estudiantes, docentes y administradores: acceso con código, simulación 3D, revisión y solución de problemas.',
  alternates: { canonical: '/manual' },
  openGraph: {
    title: 'Manual de uso · PsySim',
    description:
      'Cómo entrar, practicar en el consultorio 3D, crear casos y publicar retroalimentación en PsySim.',
    url: '/manual',
  },
};

/**
 * Manual de uso público de PsySim (modo Read): guía completa por rol, controles de la simulación
 * 3D, reglas de tiempo y tabla de problemas frecuentes.
 */
export default function ManualPage() {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <SaltarContenido />
      <header className="vetas-nogal text-sidebar-foreground">
        <div className="mx-auto flex w-full max-w-[1400px] items-center gap-4 px-5 py-5 sm:px-8">
          <MarcaPsySim className="h-8" />
          <BotonVolverManual />
        </div>
      </header>

      <main
        id="contenido"
        tabIndex={-1}
        className="mx-auto w-full max-w-[1400px] flex-1 px-5 py-10 outline-hidden sm:px-8 lg:py-12"
      >
        <ContenidoManual />
      </main>

      <PiePagina />
    </div>
  );
}
