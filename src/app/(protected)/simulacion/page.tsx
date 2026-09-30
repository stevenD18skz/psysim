import { ArrowRight, Armchair } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { z } from 'zod';

import { SimulacionCliente } from '@/components/simulacion/simulacion-cliente';
import { Button } from '@/components/ui/button';
import { requerirDocente } from '@/lib/auth/dal';
import {
  obtenerIdUltimaSesionEnCurso,
  obtenerMensajesSesion,
  obtenerSesionEnCurso,
} from '@/lib/escenarios/queries';

export const metadata: Metadata = {
  title: 'Simulación',
};

const idSesionSchema = z.uuid();

export default async function SimulacionPage({ searchParams }: PageProps<'/simulacion'>) {
  await requerirDocente();

  const { sesion: parametro } = await searchParams;

  // Sin sesión en la URL (p. ej. desde el menú): se retoma la última sesión en curso.
  if (parametro === undefined) {
    const ultima = await obtenerIdUltimaSesionEnCurso();
    if (ultima) redirect(`/simulacion?sesion=${ultima}`);
    return (
      <EstadoVacio
        titulo="No hay ninguna simulación en curso"
        descripcion="Prepara una sesión eligiendo un escenario e ingresando los datos del estudiante."
      />
    );
  }

  const id = idSesionSchema.safeParse(parametro);
  const sesion = id.success ? await obtenerSesionEnCurso(id.data) : null;

  if (!sesion) {
    return (
      <EstadoVacio
        titulo="Esta sesión no está disponible"
        descripcion="Puede que ya haya finalizado o que el enlace no sea correcto. Prepara una nueva sesión para continuar."
      />
    );
  }

  // La conversación guardada permite retomar la sesión tras recargar la página.
  const historial = await obtenerMensajesSesion(sesion.id);

  return <SimulacionCliente sesion={sesion} historial={historial} />;
}

function EstadoVacio({ titulo, descripcion }: { titulo: string; descripcion: string }) {
  return (
    <div className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="flex max-w-md flex-col items-center gap-5 text-center">
        <span className="flex size-14 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
          <Armchair className="size-7" aria-hidden />
        </span>
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">{titulo}</h1>
          <p className="text-muted-foreground">{descripcion}</p>
        </div>
        <Button asChild size="lg">
          <Link href="/configuracion">
            Preparar una sesión
            <ArrowRight aria-hidden />
          </Link>
        </Button>
      </div>
    </div>
  );
}
