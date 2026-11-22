'use client';

import { useRouter } from 'next/navigation';

import { DialogoEstudiante } from '@/components/estudiantes/dialogo-estudiante';
import { Button } from '@/components/ui/button';
import { type EstudianteRegistrado } from '@/types';

/** Botón de la ficha del estudiante para corregir su nombre o correo. */
export function EditarEstudiante({
  estudiante,
  etiqueta,
  icono,
  size = 'lg',
  className,
}: {
  estudiante: Pick<EstudianteRegistrado, 'id' | 'codigo' | 'nombre' | 'correo'>;
  etiqueta: string;
  icono?: React.ReactNode;
  size?: 'default' | 'lg';
  className?: string;
}) {
  const router = useRouter();
  return (
    <DialogoEstudiante
      estudiante={{
        id: estudiante.id,
        codigo: estudiante.codigo,
        nombre: estudiante.nombre,
        correo: estudiante.correo,
      }}
      onGuardado={() => router.refresh()}
      disparador={
        <Button size={size} variant="outline" className={className}>
          {icono}
          {etiqueta}
        </Button>
      }
    />
  );
}
