'use client';

import { UserPlus } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { DialogoDocente } from '@/components/admin/dialogo-docente';
import { Button } from '@/components/ui/button';

/** "Nuevo docente" del panel del Administrador: al crear la cuenta, recarga el listado. */
export function BotonNuevoDocente() {
  const router = useRouter();
  return (
    <DialogoDocente
      onGuardado={() => router.refresh()}
      disparador={
        <Button size="lg">
          <UserPlus aria-hidden />
          Nuevo docente
        </Button>
      }
    />
  );
}
