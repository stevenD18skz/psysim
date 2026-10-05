'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, Eye, EyeOff, Loader2, LockKeyhole, Mail } from 'lucide-react';
import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { iniciarSesion } from '@/lib/auth/actions';
import { type LoginData, type LoginInput, loginSchema } from '@/schemas/auth.schema';

interface LoginFormProps {
  siguiente: string | null;
}

export function LoginForm({ siguiente }: LoginFormProps) {
  const [errorServidor, setErrorServidor] = useState<string | null>(null);
  const [verContrasena, setVerContrasena] = useState(false);
  const [enviando, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput, unknown, LoginData>({
    resolver: zodResolver(loginSchema),
    mode: 'onTouched',
    defaultValues: { correo: '', contrasena: '' },
  });

  const onSubmit = (datos: LoginData) => {
    setErrorServidor(null);
    startTransition(async () => {
      // Si las credenciales son válidas, la acción redirige y no devuelve resultado.
      const resultado = await iniciarSesion(datos, siguiente);
      if (resultado?.error) {
        setErrorServidor(resultado.error);
      }
    });
  };

  return (
    <form noValidate onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
      {errorServidor && (
        <Alert variant="destructive" role="alert">
          <AlertCircle aria-hidden />
          <AlertDescription>{errorServidor}</AlertDescription>
        </Alert>
      )}

      <div className="flex flex-col gap-2">
        <Label htmlFor="correo">Correo institucional</Label>
        <div className="relative">
          <Mail
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            id="correo"
            type="email"
            autoComplete="email"
            inputMode="email"
            placeholder="nombre@correounivalle.edu.co"
            aria-invalid={errors.correo ? true : undefined}
            aria-describedby={errors.correo ? 'correo-error' : undefined}
            disabled={enviando}
            className="h-11 pl-10"
            {...register('correo')}
          />
        </div>
        {errors.correo && (
          <p id="correo-error" className="text-sm text-destructive">
            {errors.correo.message}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="contrasena">Contraseña</Label>
        <div className="relative">
          <LockKeyhole
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            id="contrasena"
            type={verContrasena ? 'text' : 'password'}
            autoComplete="current-password"
            aria-invalid={errors.contrasena ? true : undefined}
            aria-describedby={errors.contrasena ? 'contrasena-error' : undefined}
            disabled={enviando}
            className="h-11 pr-11 pl-10"
            {...register('contrasena')}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="absolute top-1/2 right-1.5 -translate-y-1/2 text-muted-foreground"
            onClick={() => setVerContrasena(visible => !visible)}
            aria-label={verContrasena ? 'Ocultar la contraseña' : 'Mostrar la contraseña'}
            aria-pressed={verContrasena}
            disabled={enviando}
          >
            {verContrasena ? <EyeOff aria-hidden /> : <Eye aria-hidden />}
          </Button>
        </div>
        {errors.contrasena && (
          <p id="contrasena-error" className="text-sm text-destructive">
            {errors.contrasena.message}
          </p>
        )}
      </div>

      <Button
        type="submit"
        size="lg"
        className="h-11 text-base"
        disabled={enviando}
        aria-busy={enviando}
      >
        {enviando && <Loader2 className="animate-spin" aria-hidden />}
        {enviando ? 'Ingresando…' : 'Iniciar sesión'}
      </Button>
    </form>
  );
}
