'use client';

import { ArrowRight, Monitor } from 'lucide-react';
import { type Route } from 'next';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { useEsComputador } from '@/hooks/use-es-computador';

/**
 * Acción de la práctica abierta en Mis prácticas. En un computador lleva a la simulación; en un
 * celular no la monta: recuerda que se abre en el computador y hasta qué hora.
 */
export function AccionAbierta({
  href,
  etiqueta,
  plazo,
}: {
  href: Route;
  etiqueta: string;
  plazo: string;
}) {
  const esComputador = useEsComputador();

  if (esComputador === false) {
    return (
      <p className="flex max-w-xs items-start gap-2 rounded-lg bg-lino/10 px-3 py-2 text-sm">
        <Monitor className="mt-0.5 size-4 shrink-0 text-sidebar-muted" aria-hidden />
        Para continuar, ábrela en tu computador antes de las {plazo}.
      </p>
    );
  }

  return (
    <Button asChild variant="accion" size="lg" className="shrink-0">
      <Link href={href}>
        {etiqueta}
        <ArrowRight aria-hidden />
      </Link>
    </Button>
  );
}
