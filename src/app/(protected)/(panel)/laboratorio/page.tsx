import { ArrowRight, FlaskConical, PersonStanding } from 'lucide-react';
import type { Metadata, Route } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Laboratorio',
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
    titulo: 'NPC con esqueleto y animaciones',
    descripcion:
      'Seis personajes low poly en GLB (Tomás, Ernesto, Leo, Lucía, Marina y Rosa), cada uno con su esqueleto y 13 animaciones (reposo, saludar, asentir, pensar, sentarse…), globo de diálogo y pose manual. Ya son los pacientes de la simulación.',
    estado: 'En la simulación',
  },
];

export default function LaboratorioPage() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-10 sm:px-6">
      <header className="flex flex-col gap-2">
        <p className="flex items-center gap-2 text-sm font-medium tracking-wide text-primary uppercase">
          <FlaskConical className="size-4" aria-hidden />
          Laboratorio
        </p>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Pruebas y prototipos</h1>
        <p className="max-w-2xl text-muted-foreground">
          Espacio para probar componentes nuevos de forma aislada antes de llevarlos a la
          simulación. Nada de lo que hagas aquí afecta a las sesiones ni a los estudiantes.
        </p>
      </header>

      <ul className="grid gap-4 sm:grid-cols-2">
        {EXPERIMENTOS.map(experimento => (
          <li key={experimento.href}>
            <Link
              href={experimento.href}
              className="group flex h-full flex-col gap-3 rounded-2xl border bg-card p-5 shadow-xs transition-[border-color,box-shadow] hover:border-primary/40 hover:shadow-md focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              <div className="flex items-center gap-2">
                <span className="flex size-9 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                  <PersonStanding className="size-5" aria-hidden />
                </span>
                <span className="ml-auto rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">
                  {experimento.estado}
                </span>
              </div>
              <h2 className="text-lg font-semibold">{experimento.titulo}</h2>
              <p className="text-sm text-muted-foreground">{experimento.descripcion}</p>
              <span className="mt-auto flex items-center gap-1 text-sm font-medium text-primary">
                Abrir
                <ArrowRight className="size-4" aria-hidden />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
