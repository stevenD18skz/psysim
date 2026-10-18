import type { Metadata } from 'next';
import Link from 'next/link';

import { MarcaPsySim } from '@/components/layout/marca-psysim';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = {
  title: 'Página no encontrada',
  robots: { index: false },
};

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-8 px-4 py-16 text-center">
      <Link
        href="/"
        className="rounded-lg outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
      >
        <MarcaPsySim className="h-8" />
      </Link>
      {/* Un vano de puerta vacío: aquí no hay consultorio. */}
      <span
        aria-hidden
        className="h-24 w-20 rounded-t-full border-[3px] border-dashed border-laton/70"
      />
      <div className="flex max-w-md flex-col gap-2">
        <h1 className="text-2xl font-bold tracking-[-0.02em]">No encontramos esta página</h1>
        <p className="text-muted-foreground">
          Puede que el enlace esté incompleto o que la página ya no exista.
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        <Button asChild variant="accion">
          <Link href="/inicio">Ir a mi inicio</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/">Ir a la página de inicio</Link>
        </Button>
      </div>
    </main>
  );
}
