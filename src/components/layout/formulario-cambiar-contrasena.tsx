'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';

import { sinPerderElPanel } from '@/components/comun/sin-perder-el-panel';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cambiarContrasena } from '@/lib/auth/actions';
import { cn } from '@/lib/utils';
import {
  type CambiarContrasenaInput,
  cambiarContrasenaSchema,
  LONGITUD_MAXIMA_CONTRASENA,
} from '@/schemas/auth.schema';

interface Props {
  /** La contraseña quedó cambiada. */
  onListo: () => void;
  /** Con él aparece el botón «Cancelar» (el diálogo); sin él, el cambio no se puede saltar. */
  onCancelar?: () => void;
  /** Avisa mientras se guarda, para que quien lo contiene no se cierre a mitad. */
  onGuardando?: (guardando: boolean) => void;
  /** Clases de la fila de botones (el diálogo la dibuja como su pie). */
  claseAcciones?: string;
}

/**
 * Los tres campos del cambio de contraseña y su envío. Lo usan el diálogo del menú de la cuenta y
 * la pantalla que obliga a cambiar la contraseña temporal.
 */
export function FormularioCambiarContrasena({
  onListo,
  onCancelar,
  onGuardando,
  claseAcciones,
}: Props) {
  const [visible, setVisible] = useState(false);
  const [errorServidor, setErrorServidor] = useState<string | null>(null);
  const [guardando, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CambiarContrasenaInput>({
    resolver: zodResolver(cambiarContrasenaSchema),
    mode: 'onTouched',
    defaultValues: { actual: '', nueva: '', confirmacion: '' },
  });

  const onSubmit = (datos: CambiarContrasenaInput) => {
    setErrorServidor(null);
    onGuardando?.(true);
    startTransition(
      sinPerderElPanel(async () => {
        try {
          const resultado = await cambiarContrasena(datos);
          if (!resultado.ok) {
            setErrorServidor(resultado.error);
            return;
          }
          onListo();
        } finally {
          onGuardando?.(false);
        }
      })
    );
  };

  const tipo = visible ? 'text' : 'password';

  return (
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
        <Label htmlFor="contrasena-actual">Contraseña actual</Label>
        <Input
          id="contrasena-actual"
          type={tipo}
          autoComplete="current-password"
          maxLength={LONGITUD_MAXIMA_CONTRASENA}
          aria-invalid={errors.actual ? true : undefined}
          aria-describedby={errors.actual ? 'contrasena-actual-error' : undefined}
          disabled={guardando}
          {...register('actual')}
        />
        {errors.actual && (
          <p id="contrasena-actual-error" className="text-sm text-destructive">
            {errors.actual.message}
          </p>
        )}
      </div>
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
            className="absolute top-1/2 right-1 flex size-8 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground outline-hidden hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring"
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
      <div className={cn('flex flex-col-reverse gap-2 sm:flex-row sm:justify-end', claseAcciones)}>
        {onCancelar && (
          <Button type="button" variant="outline" onClick={onCancelar} disabled={guardando}>
            Cancelar
          </Button>
        )}
        <Button type="submit" disabled={guardando} aria-busy={guardando}>
          {guardando && <Loader2 className="motion-safe:animate-spin" aria-hidden />}
          Guardar contraseña
        </Button>
      </div>
    </form>
  );
}
