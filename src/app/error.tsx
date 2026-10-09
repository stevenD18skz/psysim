'use client';

import { RotateCw, TriangleAlert } from 'lucide-react';
import Link from 'next/link';
import { useEffect } from 'react';

import { Button } from '@/components/ui/button';

/**
 * Error inesperado en cualquier página (p. ej. la base de datos no respondió). En lugar del error
 * técnico, el usuario ve qué pasó y puede reintentar. En producción `error.message` es genérico;
 * `digest` permite encontrar el error en los logs de Vercel.
 */
export default function ErrorPagina({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-5 px-4 py-16 text-center">
      <span className="flex size-12 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
        <TriangleAlert className="size-6" aria-hidden />
      </span>
      <div className="flex max-w-md flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Algo salió mal</h1>
        <p className="text-muted-foreground">
          No pudimos cargar esta página. Puede ser un problema momentáneo de conexión: inténtalo de
          nuevo en unos segundos.
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        <Button onClick={() => retry()}>
          <RotateCw aria-hidden />
          Reintentar
        </Button>
        <Button asChild variant="outline">
          <Link href="/">Volver al inicio</Link>
        </Button>
      </div>
      {error.digest && (
        <p className="text-xs text-muted-foreground">
          Si el problema continúa, comparte este código con el administrador:{' '}
          <code className="font-mono">{error.digest}</code>
        </p>
      )}
    </main>
  );
}
