'use client';

import { KeyRound, TriangleAlert } from 'lucide-react';

import { BotonCopiar } from '@/components/asignaciones/boton-copiar';

/**
 * Correo y contraseña temporal recién generados. Se muestran una sola vez: el Administrador los
 * copia y se los envía al docente, que cambia la contraseña al entrar.
 */
export function CredencialesAcceso({
  nombre,
  correo,
  contrasena,
}: {
  nombre: string;
  correo: string;
  contrasena: string;
}) {
  const mensaje = () =>
    [
      `Hola, ${nombre.split(' ')[0]}. Ya tienes cuenta en PsySim.`,
      `Entra en ${window.location.origin}/login con:`,
      `Correo: ${correo}`,
      `Contraseña temporal: ${contrasena}`,
      'Al entrar te pediremos cambiarla por una tuya.',
    ].join('\n');

  return (
    <div className="flex flex-col gap-4">
      <dl className="flex flex-col gap-3 rounded-xl border bg-muted/40 p-4">
        <div className="flex flex-col gap-0.5">
          <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Correo
          </dt>
          <dd className="font-medium break-all">{correo}</dd>
        </div>
        <div className="flex flex-col gap-1.5">
          <dt className="flex items-center gap-1.5 text-xs font-medium tracking-wide text-muted-foreground uppercase">
            <KeyRound className="size-3.5" aria-hidden />
            Contraseña temporal
          </dt>
          <dd className="flex flex-wrap items-center gap-2">
            <code className="rounded-md bg-background px-2.5 py-1.5 font-mono text-base font-semibold tracking-wide ring-1 ring-border select-all">
              {contrasena}
            </code>
            <BotonCopiar texto={contrasena} etiqueta="Copiar" />
          </dd>
        </div>
      </dl>
      <p className="flex gap-2 text-sm text-muted-foreground">
        <TriangleAlert className="mt-0.5 size-4 shrink-0 text-amber-600" aria-hidden />
        Cópiala ahora: no se volverá a mostrar. Si se pierde, puedes generar otra.
      </p>
      <BotonCopiar texto={mensaje} etiqueta="Copiar mensaje para enviar" variant="default" />
    </div>
  );
}
