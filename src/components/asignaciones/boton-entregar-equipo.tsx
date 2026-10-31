'use client';

import { Loader2, MonitorSmartphone } from 'lucide-react';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useEsComputador } from '@/hooks/use-es-computador';
import { olvidarDatosDeLaCuenta } from '@/lib/datos-locales';
import { entregarEquipo } from '@/lib/equipo-compartido/actions';
import { primerNombre } from '@/lib/equipo-compartido/entrega';

/**
 * Modo presencial: el estudiante hace la práctica en el computador del docente. Antes de entregarlo
 * se cierra la sesión del docente, para que el estudiante no pueda ver el panel ni los datos de
 * otros estudiantes. Solo aparece en un computador: en un celular no se puede practicar.
 */
export function BotonEntregarEquipo({
  asignacionId,
  estudiante,
  size = 'sm',
  variant = 'ghost',
}: {
  asignacionId: string;
  estudiante: string;
  size?: 'default' | 'sm';
  variant?: 'ghost' | 'outline';
}) {
  const esComputador = useEsComputador();
  const [abierto, setAbierto] = useState(false);
  const [entregando, startTransition] = useTransition();
  const nombre = primerNombre(estudiante);

  if (esComputador !== true) return null;

  const entregar = () =>
    startTransition(async () => {
      // El estudiante que recibe el equipo no debe encontrar borradores de retroalimentación.
      olvidarDatosDeLaCuenta();
      // Si todo va bien, la acción cierra la sesión y redirige a la pantalla de entrega.
      const resultado = await entregarEquipo({ id: asignacionId });
      if (resultado && !resultado.ok) {
        toast.error(resultado.error);
        setAbierto(false);
      }
    });

  return (
    <>
      <Button size={size} variant={variant} onClick={() => setAbierto(true)}>
        <MonitorSmartphone aria-hidden />
        Practicar en este equipo
      </Button>
      <Dialog open={abierto} onOpenChange={valor => !entregando && setAbierto(valor)}>
        <DialogContent role="alertdialog" className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>¿{nombre} practica en este computador?</DialogTitle>
            <DialogDescription>
              Se cerrará tu sesión en este navegador para que {nombre} entre con su cuenta
              institucional y haga la práctica aquí. Cuando termine, vuelve a entrar con la tuya.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAbierto(false)} disabled={entregando}>
              Cancelar
            </Button>
            <Button variant="accion" onClick={entregar} disabled={entregando}>
              {entregando && <Loader2 className="animate-spin" aria-hidden />}
              Cerrar mi sesión y entregar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
