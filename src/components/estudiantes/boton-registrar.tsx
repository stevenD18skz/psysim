'use client';

import { UserPlus } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { DialogoEstudiante } from '@/components/estudiantes/dialogo-estudiante';
import { Button } from '@/components/ui/button';

/**
 * "Registrar estudiante": la acción principal de la página de estudiantes (latón). Al guardar,
 * recarga el listado.
 */
export function BotonRegistrarEstudiante({
  variant = 'accion',
}: {
  variant?: 'accion' | 'default' | 'outline';
}) {
  const router = useRouter();
  return (
    <DialogoEstudiante
      onGuardado={() => router.refresh()}
      disparador={
        <Button size="lg" variant={variant}>
          <UserPlus aria-hidden />
          Registrar estudiante
        </Button>
      }
    />
  );
}
