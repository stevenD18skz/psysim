'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  AlertCircle,
  CheckCircle2,
  GraduationCap,
  KeyRound,
  Loader2,
  Mail,
  ShieldCheck,
} from 'lucide-react';
import { useId, useState, useTransition } from 'react';
import { type UseFormRegisterReturn, useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';

import { CredencialesAcceso } from '@/components/admin/credenciales-acceso';
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
import { actualizarDocente, crearDocente } from '@/lib/admin/actions';
import { cn } from '@/lib/utils';
import {
  type CrearDocenteData,
  type CrearDocenteInput,
  crearDocenteSchema,
  LIMITES_DOCENTE,
} from '@/schemas/admin.schema';
import { type DocenteAdmin } from '@/types';

interface DialogoDocenteProps {
  /** Con un docente, edita sus datos y su rol. Sin él, crea una cuenta nueva. */
  docente?: Pick<DocenteAdmin, 'id' | 'nombre' | 'correo' | 'codigoInstitucional' | 'rol'>;
  /** No puede quitarse a sí mismo el rol de Administrador. */
  esPropio?: boolean;
  disparador?: React.ReactNode;
  abierto?: boolean;
  onAbiertoCambia?: (abierto: boolean) => void;
  onGuardado?: () => void;
}

/**
 * Alta o edición de una cuenta del equipo docente. Al crearla con contraseña temporal, el diálogo
 * pasa a mostrar las credenciales para enviárselas al docente.
 */
export function DialogoDocente({
  docente,
  esPropio = false,
  disparador,
  abierto: abiertoControlado,
  onAbiertoCambia,
  onGuardado,
}: DialogoDocenteProps) {
  const editando = docente !== undefined;
  const [abiertoInterno, setAbiertoInterno] = useState(false);
  const abierto = abiertoControlado ?? abiertoInterno;
  const [errorServidor, setErrorServidor] = useState<string | null>(null);
  const [credenciales, setCredenciales] = useState<{
    nombre: string;
    correo: string;
    contrasena: string;
  } | null>(null);
  const [guardando, startTransition] = useTransition();

  const valoresIniciales: CrearDocenteInput = {
    nombre: docente?.nombre ?? '',
    correo: docente?.correo ?? '',
    codigo: docente?.codigoInstitucional ?? '',
    rol: docente?.rol === 'superadmin' ? 'superadmin' : 'docente',
    acceso: 'google',
  };
  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<CrearDocenteInput, unknown, CrearDocenteData>({
    resolver: zodResolver(crearDocenteSchema),
    mode: 'onTouched',
    defaultValues: valoresIniciales,
  });

  const cambiarAbierto = (valor: boolean) => {
    // Mientras se guarda no se cierra. Con las credenciales ya a la vista sí: la transición puede
    // seguir pendiente solo porque la lista se está recargando.
    if (guardando && !credenciales) return;
    setAbiertoInterno(valor);
    onAbiertoCambia?.(valor);
    if (!valor) {
      setErrorServidor(null);
      setCredenciales(null);
      reset(valoresIniciales);
    }
  };

  const onSubmit = (datos: CrearDocenteData) => {
    setErrorServidor(null);
    startTransition(async () => {
      if (editando) {
        const resultado = await actualizarDocente({
          id: docente.id,
          nombre: datos.nombre,
          correo: datos.correo,
          codigo: datos.codigo,
          rol: datos.rol,
        });
        if (!resultado.ok) {
          setErrorServidor(resultado.error);
          return;
        }
        toast.success('Datos de la cuenta actualizados.');
        onGuardado?.();
        cambiarAbierto(false);
        return;
      }

      const resultado = await crearDocente(datos);
      if (!resultado.ok) {
        setErrorServidor(resultado.error);
        return;
      }
      onGuardado?.();
      if (resultado.datos.contrasena) {
        setCredenciales({
          nombre: datos.nombre,
          correo: datos.correo,
          contrasena: resultado.datos.contrasena,
        });
      } else {
        toast.success(`Cuenta de ${datos.nombre} creada. Ya puede entrar con Google.`);
        cambiarAbierto(false);
      }
    });
  };

  const [rol, acceso] = useWatch({ control, name: ['rol', 'acceso'] });

  return (
    <Dialog open={abierto} onOpenChange={cambiarAbierto}>
      {disparador && <DialogTrigger asChild>{disparador}</DialogTrigger>}
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-lg">
        {credenciales ? (
          <>
            <DialogHeader>
              <span className="mb-1 flex size-10 items-center justify-center rounded-xl bg-success/15 text-success">
                <CheckCircle2 className="size-5" aria-hidden />
              </span>
              <DialogTitle>Cuenta creada</DialogTitle>
              <DialogDescription>
                Envíale estos datos a {credenciales.nombre} por un medio seguro (correo
                institucional o mensaje directo).
              </DialogDescription>
            </DialogHeader>
            <CredencialesAcceso {...credenciales} />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => cambiarAbierto(false)}>
                Listo
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>{editando ? 'Editar cuenta' : 'Nuevo docente'}</DialogTitle>
              <DialogDescription>
                {editando
                  ? 'Corrige sus datos o cambia su rol. Si cambias el correo, entrará con el nuevo.'
                  : 'Crea la cuenta y elige cómo entrará a PsySim.'}
              </DialogDescription>
            </DialogHeader>

            <form
              noValidate
              onSubmit={handleSubmit(onSubmit)}
              className="flex flex-col gap-5"
              aria-label={editando ? 'Editar cuenta' : 'Nuevo docente'}
            >
              {errorServidor && (
                <Alert variant="destructive" role="alert">
                  <AlertCircle aria-hidden />
                  <AlertDescription>{errorServidor}</AlertDescription>
                </Alert>
              )}

              <Campo id="docente-nombre" etiqueta="Nombre completo" error={errors.nombre?.message}>
                <Input
                  id="docente-nombre"
                  autoComplete="off"
                  placeholder="Ej.: María Fernanda López"
                  maxLength={LIMITES_DOCENTE.nombre.max + 10}
                  aria-invalid={errors.nombre ? true : undefined}
                  aria-describedby={errors.nombre ? 'docente-nombre-error' : undefined}
                  disabled={guardando}
                  {...register('nombre')}
                />
              </Campo>

              <div className="grid gap-5 sm:grid-cols-[1fr_10rem]">
                <Campo id="docente-correo" etiqueta="Correo" error={errors.correo?.message}>
                  <div className="relative">
                    <Mail
                      className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                      aria-hidden
                    />
                    <Input
                      id="docente-correo"
                      type="email"
                      inputMode="email"
                      autoComplete="off"
                      placeholder="nombre@correounivalle.edu.co"
                      className="pl-9"
                      aria-invalid={errors.correo ? true : undefined}
                      aria-describedby={errors.correo ? 'docente-correo-error' : undefined}
                      disabled={guardando}
                      {...register('correo')}
                    />
                  </div>
                </Campo>
                <Campo id="docente-codigo" etiqueta="Código" error={errors.codigo?.message}>
                  <Input
                    id="docente-codigo"
                    autoComplete="off"
                    placeholder="Ej.: DOC-0420"
                    maxLength={LIMITES_DOCENTE.codigo.max}
                    aria-invalid={errors.codigo ? true : undefined}
                    aria-describedby={errors.codigo ? 'docente-codigo-error' : undefined}
                    disabled={guardando}
                    {...register('codigo')}
                  />
                </Campo>
              </div>

              {esPropio ? (
                <p className="flex items-center gap-2 rounded-lg bg-muted/60 p-3 text-sm text-muted-foreground">
                  <ShieldCheck className="size-4 shrink-0 text-primary" aria-hidden />
                  Eres Administrador. Tu propio rol no se puede cambiar desde aquí.
                </p>
              ) : (
                <fieldset className="flex flex-col gap-2" disabled={guardando}>
                  <legend className="mb-2 text-sm font-medium">Rol</legend>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Opcion
                      registro={register('rol')}
                      valor="docente"
                      elegido={rol === 'docente'}
                      icono={GraduationCap}
                      titulo="Docente"
                      descripcion="Prepara simulaciones y retroalimenta a sus estudiantes."
                    />
                    <Opcion
                      registro={register('rol')}
                      valor="superadmin"
                      elegido={rol === 'superadmin'}
                      icono={ShieldCheck}
                      titulo="Administrador"
                      descripcion="Además gestiona las cuentas de los docentes."
                    />
                  </div>
                </fieldset>
              )}

              {!editando && (
                <fieldset className="flex flex-col gap-2" disabled={guardando}>
                  <legend className="mb-2 text-sm font-medium">Acceso</legend>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Opcion
                      registro={register('acceso')}
                      valor="google"
                      elegido={acceso === 'google'}
                      icono={Mail}
                      titulo="Con Google"
                      descripcion="Entra con «Continuar con Google» usando este correo."
                    />
                    <Opcion
                      registro={register('acceso')}
                      valor="contrasena"
                      elegido={acceso === 'contrasena'}
                      icono={KeyRound}
                      titulo="Contraseña temporal"
                      descripcion="Se genera ahora y la cambia al entrar."
                    />
                  </div>
                </fieldset>
              )}

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
                  {editando ? 'Guardar cambios' : 'Crear cuenta'}
                </Button>
              </DialogFooter>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Campo({
  id,
  etiqueta,
  error,
  children,
}: {
  id: string;
  etiqueta: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{etiqueta}</Label>
      {children}
      {error && (
        <p id={`${id}-error`} className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

/** Tarjeta de un grupo de opciones (radio nativo: teclado y lector de pantalla de serie). */
function Opcion({
  registro,
  valor,
  elegido,
  icono: Icono,
  titulo,
  descripcion,
}: {
  registro: UseFormRegisterReturn;
  valor: string;
  elegido: boolean;
  icono: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
  titulo: string;
  descripcion: string;
}) {
  const id = useId();
  return (
    <label
      className={cn(
        'relative flex cursor-pointer gap-3 rounded-xl border p-3 transition-colors has-focus-visible:ring-3 has-focus-visible:ring-ring/50 has-disabled:cursor-not-allowed has-disabled:opacity-60',
        elegido ? 'border-primary bg-primary/5' : 'hover:bg-muted/60'
      )}
    >
      <input
        type="radio"
        value={valor}
        className="sr-only"
        aria-labelledby={`${id}-titulo`}
        aria-describedby={`${id}-descripcion`}
        {...registro}
      />
      <span
        className={cn(
          'flex size-8 shrink-0 items-center justify-center rounded-lg',
          elegido ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
        )}
      >
        <Icono className="size-4" aria-hidden />
      </span>
      <span className="flex flex-col gap-0.5">
        <span id={`${id}-titulo`} className="text-sm font-medium">
          {titulo}
        </span>
        <span id={`${id}-descripcion`} className="text-xs leading-snug text-muted-foreground">
          {descripcion}
        </span>
      </span>
    </label>
  );
}
