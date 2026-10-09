'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cambiarContrasena } from '@/lib/auth/actions';
import {
  type CambiarContrasenaInput,
  cambiarContrasenaSchema,
  LONGITUD_MAXIMA_CONTRASENA,
  LONGITUD_MINIMA_CONTRASENA,
} from '@/schemas/auth.schema';

/** Cambio de contraseña desde el menú de la cuenta (o desde el aviso de contraseña temporal). */
export function DialogoCambiarContrasena({
  abierto,
  onAbiertoCambia,
}: {
  abierto: boolean;
  onAbiertoCambia: (abierto: boolean) => void;
}) {
  const router = useRouter();
  const [visible, setVisible] = useState(false);
  const [errorServidor, setErrorServidor] = useState<string | null>(null);
  const [guardando, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CambiarContrasenaInput>({
    resolver: zodResolver(cambiarContrasenaSchema),
    mode: 'onTouched',
    defaultValues: { nueva: '', confirmacion: '' },
  });

  const cambiarAbierto = (valor: boolean) => {
    if (guardando) return;
    onAbiertoCambia(valor);
    if (!valor) {
      reset();
      setErrorServidor(null);
      setVisible(false);
    }
  };

  const onSubmit = (datos: CambiarContrasenaInput) => {
    setErrorServidor(null);
    startTransition(async () => {
      const resultado = await cambiarContrasena(datos);
      if (!resultado.ok) {
        setErrorServidor(resultado.error);
        return;
      }
      toast.success('Contraseña actualizada.');
      onAbiertoCambia(false);
      reset();
      router.refresh();
    });
  };

  const tipo = visible ? 'text' : 'password';

  return (
    <Dialog open={abierto} onOpenChange={cambiarAbierto}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Cambiar contraseña</DialogTitle>
          <DialogDescription>
            Usa al menos {LONGITUD_MINIMA_CONTRASENA} caracteres. Una frase corta es fácil de
            recordar y difícil de adivinar.
          </DialogDescription>
        </DialogHeader>
        <form
          noValidate
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-4"
          aria-label="Cambiar contraseña"
        >
          {errorServidor && (
            <Alert variant="destructive" role="alert">
              <AlertCircle aria-hidden />
              <AlertDescription>{errorServidor}</AlertDescription>
            </Alert>
          )}
          <div className="flex flex-col gap-2">
            <Label htmlFor="contrasena-nueva">Nueva contraseña</Label>
            <div className="relative">
              <Input
                id="contrasena-nueva"
                type={tipo}
                autoComplete="new-password"
                maxLength={LONGITUD_MAXIMA_CONTRASENA}
                className="pr-10"
                aria-invalid={errors.nueva ? true : undefined}
                aria-describedby={errors.nueva ? 'contrasena-nueva-error' : undefined}
                disabled={guardando}
                {...register('nueva')}
              />
              <button
                type="button"
                onClick={() => setVisible(valor => !valor)}
                aria-label={visible ? 'Ocultar contraseñas' : 'Mostrar contraseñas'}
                aria-pressed={visible}
                className="absolute top-1/2 right-1 flex size-8 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                {visible ? (
                  <EyeOff className="size-4" aria-hidden />
                ) : (
                  <Eye className="size-4" aria-hidden />
                )}
              </button>
            </div>
            {errors.nueva && (
              <p id="contrasena-nueva-error" className="text-sm text-destructive">
                {errors.nueva.message}
              </p>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="contrasena-confirmacion">Repite la nueva contraseña</Label>
            <Input
              id="contrasena-confirmacion"
              type={tipo}
              autoComplete="new-password"
              maxLength={LONGITUD_MAXIMA_CONTRASENA}
              aria-invalid={errors.confirmacion ? true : undefined}
              aria-describedby={errors.confirmacion ? 'contrasena-confirmacion-error' : undefined}
              disabled={guardando}
              {...register('confirmacion')}
            />
            {errors.confirmacion && (
              <p id="contrasena-confirmacion-error" className="text-sm text-destructive">
                {errors.confirmacion.message}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => cambiarAbierto(false)}
              disabled={guardando}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={guardando} aria-busy={guardando}>
              {guardando && <Loader2 className="animate-spin" aria-hidden />}
              Guardar contraseña
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
