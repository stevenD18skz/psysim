'use client';

import './globals.css';

/**
 * Error en el layout raíz: reemplaza todo el documento, así que trae su propio `<html>` y estilos
 * (ver src/app/error.tsx para los errores de las páginas).
 */
export default function ErrorGlobal({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <html lang="es">
      <body className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-background px-4 text-center text-foreground antialiased">
        <title>Algo salió mal · PsySim</title>
        <h1 className="text-2xl font-semibold tracking-tight">Algo salió mal</h1>
        <p className="max-w-md text-muted-foreground">
          PsySim no pudo cargarse. Inténtalo de nuevo en unos segundos.
        </p>
        <button
          type="button"
          onClick={() => retry()}
          className="h-9 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground"
        >
          Reintentar
        </button>
        {error.digest && (
          <p className="text-xs text-muted-foreground">
            Código del error: <code className="font-mono">{error.digest}</code>
          </p>
        )}
      </body>
    </html>
  );
}
