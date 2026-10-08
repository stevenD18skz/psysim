'use client';

import { UserPlus } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { DialogoEstudiante } from '@/components/estudiantes/dialogo-estudiante';
import { Button } from '@/components/ui/button';

/** "Registrar estudiante" de la página de estudiantes: al guardar, recarga el listado. */
export function BotonRegistrarEstudiante({
  variant = 'default',
}: {
  variant?: 'default' | 'outline';
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
