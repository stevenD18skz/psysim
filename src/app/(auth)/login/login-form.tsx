'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, Loader2 } from 'lucide-react';
import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { iniciarSesion } from '@/lib/auth/actions';
import { type LoginData, type LoginInput, loginSchema } from '@/schemas/auth.schema';

interface LoginFormProps {
  siguiente: string | null;
}

export function LoginForm({ siguiente }: LoginFormProps) {
  const [errorServidor, setErrorServidor] = useState<string | null>(null);
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
    <Card>
      <CardHeader>
        <CardTitle>Iniciar sesión</CardTitle>
        <CardDescription>Acceso exclusivo para docentes.</CardDescription>
      </CardHeader>
      <CardContent>
        <form noValidate onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
          {errorServidor && (
            <Alert variant="destructive" role="alert">
              <AlertCircle aria-hidden />
              <AlertDescription>{errorServidor}</AlertDescription>
            </Alert>
          )}

          <div className="flex flex-col gap-2">
            <Label htmlFor="correo">Correo institucional</Label>
            <Input
              id="correo"
              type="email"
              autoComplete="email"
              inputMode="email"
              placeholder="nombre@correounivalle.edu.co"
              aria-invalid={errors.correo ? true : undefined}
              aria-describedby={errors.correo ? 'correo-error' : undefined}
              disabled={enviando}
              {...register('correo')}
            />
            {errors.correo && (
              <p id="correo-error" className="text-sm text-destructive">
                {errors.correo.message}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="contrasena">Contraseña</Label>
            <Input
              id="contrasena"
              type="password"
              autoComplete="current-password"
              aria-invalid={errors.contrasena ? true : undefined}
              aria-describedby={errors.contrasena ? 'contrasena-error' : undefined}
              disabled={enviando}
              {...register('contrasena')}
            />
            {errors.contrasena && (
              <p id="contrasena-error" className="text-sm text-destructive">
                {errors.contrasena.message}
              </p>
            )}
          </div>

          <Button type="submit" size="lg" disabled={enviando} aria-busy={enviando}>
            {enviando && <Loader2 className="animate-spin" aria-hidden />}
            {enviando ? 'Ingresando…' : 'Iniciar sesión'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
