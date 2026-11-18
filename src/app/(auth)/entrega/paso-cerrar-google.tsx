'use client';

import { LogOut } from 'lucide-react';
import { useState } from 'react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { URL_CERRAR_GOOGLE } from '@/lib/equipo-compartido/entrega';

/**
 * Paso del docente antes de soltar el equipo: cerrar su sesión de Google en este navegador. El
 * acceso del estudiante (`children`) aparece cuando lo confirma, para que el aviso no se pueda
 * pasar por alto. Es una ayuda para el docente, no el control: lo que impide entrar con su cuenta
 * es la entrega anotada en el servidor (`lib/equipo-compartido/ventana.ts`).
 */
export function PasoCerrarGoogle({
  estudiante,
  children,
}: {
  estudiante: string;
  children: React.ReactNode;
}) {
  const [confirmado, setConfirmado] = useState(false);

  if (confirmado) return <>{children}</>;

  return (
    <Alert role="alert">
      {/* El saludo al estudiante (el título de la página) aparece al confirmar. */}
      <h1 className="sr-only">Antes de entregar el equipo</h1>
      <LogOut aria-hidden />
      <AlertTitle>Docente: antes de entregar el equipo</AlertTitle>
      <AlertDescription className="flex flex-col gap-3">
        <p>
          Tu cuenta de Google sigue abierta en este navegador. Ciérrala para que {estudiante} no la
          vea al entrar. Mientras dure la entrega, tu cuenta de PsySim solo entra con tu correo y tu
          contraseña.
        </p>
        <a
          href={URL_CERRAR_GOOGLE}
          target="_blank"
          rel="noopener noreferrer"
          className="w-fit font-semibold text-foreground underline underline-offset-4"
        >
          Cerrar mi sesión de Google (se abre en otra pestaña)
        </a>
        <Button type="button" size="sm" className="w-fit" onClick={() => setConfirmado(true)}>
          Ya la cerré: entregar el equipo
        </Button>
      </AlertDescription>
    </Alert>
  );
}
