import { ArrowRight, PersonStanding } from 'lucide-react';
import type { Metadata, Route } from 'next';
import Link from 'next/link';

import { EncabezadoPagina } from '@/components/comun/encabezado-pagina';
import { requerirSuperadmin } from '@/lib/auth/dal';

export const metadata: Metadata = {
  title: 'Herramientas de desarrollo',
};

interface Experimento {
  href: Route;
  titulo: string;
  descripcion: string;
  estado: string;
}

/** Prototipos en prueba antes de integrarse en la simulación. */
const EXPERIMENTOS: Experimento[] = [
  {
    href: '/laboratorio/npc',
    titulo: 'Personajes con esqueleto y animaciones',
    descripcion:
      'Seis personajes low poly (Tomás, Ernesto, Leo, Lucía, Marina y Rosa), cada uno con esqueleto y 13 animaciones (reposo, saludar, asentir, pensar, sentarse…), globo de diálogo y pose manual. Ya son los pacientes de la simulación.',
    estado: 'En la simulación',
  },
];

/**
 * Herramientas de desarrollo: solo para el Administrador, desde el menú de su cuenta. No forman
 * parte de la práctica.
 */
export default async function LaboratorioPage() {
  await requerirSuperadmin();
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-8 sm:px-6 sm:py-10">
      <EncabezadoPagina
        titulo="Herramientas de desarrollo"
        descripcion="Pruebas internas del proyecto. Solo las ve la administración; no forman parte de la práctica ni afectan a los estudiantes."
      />

      <ul className="grid gap-4 sm:grid-cols-2">
        {EXPERIMENTOS.map(experimento => (
          <li key={experimento.href}>
            <Link
              href={experimento.href}
              className="group flex h-full flex-col gap-3 rounded-xl border bg-card p-5 transition-[border-color,box-shadow] hover:border-nogal/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-hidden"
            >
              <div className="flex items-center gap-2">
                <PersonStanding className="size-5 text-salvia" aria-hidden />
                <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                  {experimento.estado}
                </span>
              </div>
              <h2 className="text-lg font-bold">{experimento.titulo}</h2>
              <p className="text-sm text-muted-foreground">{experimento.descripcion}</p>
              <span className="mt-auto flex items-center gap-1 text-sm font-semibold">
                Abrir
                <ArrowRight
                  className="size-4 transition-transform group-hover:translate-x-0.5"
                  aria-hidden
                />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
