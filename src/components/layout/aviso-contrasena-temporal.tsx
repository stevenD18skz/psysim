'use client';

import { KeyRound } from 'lucide-react';
import { useState } from 'react';

import { DialogoCambiarContrasena } from '@/components/layout/dialogo-cambiar-contrasena';
import { Button } from '@/components/ui/button';

/**
 * Franja sobre el contenido mientras la cuenta use la contraseña temporal que generó el
 * Administrador. No bloquea el trabajo, pero se queda hasta que la cambie.
 */
export function AvisoContrasenaTemporal() {
  const [abierto, setAbierto] = useState(false);

  return (
    <>
      <div
        role="status"
        className="flex flex-col gap-3 border-b border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 sm:flex-row sm:items-center sm:px-6 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100"
      >
        <KeyRound className="hidden size-4 shrink-0 sm:block" aria-hidden />
        <p className="flex-1">
          Estás usando una <strong>contraseña temporal</strong>. Cámbiala por una tuya para proteger
          tu cuenta.
        </p>
        <Button size="sm" className="w-fit" onClick={() => setAbierto(true)}>
          Cambiar contraseña
        </Button>
      </div>
      <DialogoCambiarContrasena abierto={abierto} onAbiertoCambia={setAbierto} />
    </>
  );
}
