'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, Loader2, Mail } from 'lucide-react';
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
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DOMINIO_ESTUDIANTES } from '@/lib/auth/google';
import { actualizarEstudiante, registrarEstudiante } from '@/lib/estudiantes/actions';
import { LIMITES } from '@/schemas/configuracion.schema';
import {
  type RegistrarEstudianteData,
  type RegistrarEstudianteInput,
  registrarEstudianteSchema,
} from '@/schemas/estudiante.schema';
import { type EstudianteRegistrado } from '@/types';

interface DialogoEstudianteProps {
  /** Con un estudiante, edita su nombre y correo (o agrega el correo a un registro antiguo). */
  estudiante?: Pick<EstudianteRegistrado, 'id' | 'codigo' | 'nombre' | 'correo'>;
  /** Botón que abre el diálogo (sin él, el diálogo se controla con `abierto`). */
  disparador?: React.ReactNode;
  /** Modo controlado, p. ej. para abrirlo desde un menú de acciones. */
  abierto?: boolean;
  onAbiertoCambia?: (abierto: boolean) => void;
  onGuardado?: (id: string) => void;
}

/**
 * Registro de un estudiante (código, nombre y correo institucional). Al guardar se le crea la
 * cuenta: entra a PsySim con «Continuar con Google» usando ese correo, sin contraseña.
 */
export function DialogoEstudiante({
  estudiante,
  disparador,
  abierto: abiertoControlado,
  onAbiertoCambia,
  onGuardado,
}: DialogoEstudianteProps) {
  const [abiertoInterno, setAbiertoInterno] = useState(false);
  const abierto = abiertoControlado ?? abiertoInterno;
  const setAbierto = (valor: boolean) => {
    setAbiertoInterno(valor);
    onAbiertoCambia?.(valor);
  };
  const [errorServidor, setErrorServidor] = useState<string | null>(null);
  const [guardando, startTransition] = useTransition();
  const editando = estudiante !== undefined;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<RegistrarEstudianteInput, unknown, RegistrarEstudianteData>({
    resolver: zodResolver(registrarEstudianteSchema),
    mode: 'onTouched',
    defaultValues: {
      codigo: estudiante?.codigo ?? '',
      nombre: estudiante?.nombre ?? '',
      correo: estudiante?.correo ?? '',
    },
  });

  const cambiarAbierto = (valor: boolean) => {
    setAbierto(valor);
    if (!valor) {
      setErrorServidor(null);
      reset();
    }
  };

  const onSubmit = (datos: RegistrarEstudianteData) => {
    setErrorServidor(null);
    startTransition(async () => {
      const resultado = editando
        ? await actualizarEstudiante({
            id: estudiante.id,
            nombre: datos.nombre,
            correo: datos.correo,
          })
        : await registrarEstudiante(datos);
      if (!resultado.ok) {
        setErrorServidor(resultado.error);
        return;
      }
      toast.success(
        editando ? 'Datos del estudiante actualizados.' : `${datos.nombre} quedó registrado.`
      );
      setAbierto(false);
      reset(datos);
      onGuardado?.(resultado.datos.id);
    });
  };

  return (
    <Dialog open={abierto} onOpenChange={cambiarAbierto}>
      {disparador && <DialogTrigger asChild>{disparador}</DialogTrigger>}
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editando ? 'Editar estudiante' : 'Registrar estudiante'}</DialogTitle>
          <DialogDescription>
            Con su correo institucional entra a PsySim con «Continuar con Google». No necesita
            contraseña.
          </DialogDescription>
        </DialogHeader>

        <form
          noValidate
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-4"
          aria-label={editando ? 'Editar estudiante' : 'Registrar estudiante'}
        >
          {errorServidor && (
            <Alert variant="destructive" role="alert">
              <AlertCircle aria-hidden />
              <AlertDescription>{errorServidor}</AlertDescription>
            </Alert>
          )}

          <div className="flex flex-col gap-2">
            <Label htmlFor="estudiante-codigo">Código institucional</Label>
            <Input
              id="estudiante-codigo"
              inputMode="numeric"
              autoComplete="off"
              placeholder="Ej.: 202012345"
              maxLength={LIMITES.codigoEstudiante.max + 4}
              // El código identifica al estudiante en el historial: no se cambia al editar.
              readOnly={editando}
              aria-invalid={errors.codigo ? true : undefined}
              aria-describedby={errors.codigo ? 'estudiante-codigo-error' : undefined}
              disabled={guardando}
              {...register('codigo')}
            />
            {errors.codigo && (
              <p id="estudiante-codigo-error" className="text-sm text-destructive">
                {errors.codigo.message}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="estudiante-nombre">Nombre completo</Label>
            <Input
              id="estudiante-nombre"
              autoComplete="off"
              placeholder="Ej.: Ana María Pérez"
              maxLength={LIMITES.nombreEstudiante.max + 10}
              aria-invalid={errors.nombre ? true : undefined}
              aria-describedby={errors.nombre ? 'estudiante-nombre-error' : undefined}
              disabled={guardando}
              {...register('nombre')}
            />
            {errors.nombre && (
              <p id="estudiante-nombre-error" className="text-sm text-destructive">
                {errors.nombre.message}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="estudiante-correo">Correo institucional</Label>
            <div className="relative">
              <Mail
                className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                id="estudiante-correo"
                type="email"
                inputMode="email"
                autoComplete="off"
                placeholder={`nombre.apellido@${DOMINIO_ESTUDIANTES}`}
                className="pl-9"
                aria-invalid={errors.correo ? true : undefined}
                aria-describedby={
                  errors.correo ? 'estudiante-correo-error' : 'estudiante-correo-ayuda'
                }
                disabled={guardando}
                {...register('correo')}
              />
            </div>
            {errors.correo ? (
              <p id="estudiante-correo-error" className="text-sm text-destructive">
                {errors.correo.message}
              </p>
            ) : (
              <p id="estudiante-correo-ayuda" className="text-xs text-muted-foreground">
                Solo se aceptan cuentas @{DOMINIO_ESTUDIANTES}.
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
              {editando ? 'Guardar cambios' : 'Registrar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
