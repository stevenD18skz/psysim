'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  AlertCircle,
  Bookmark,
  Check,
  CheckCircle2,
  FilePlus2,
  KeyRound,
  Loader2,
  LockKeyhole,
  type LucideIcon,
  Mail,
  Plus,
  Repeat2,
  RotateCcw,
  Target,
  UserPlus,
  Wand2,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useId, useState, useTransition } from 'react';
import { useForm, useWatch } from 'react-hook-form';

import { AvatarPaciente } from '@/components/pacientes/avatar-paciente';
import { ReglasFijas } from '@/components/casos/reglas-fijas';
import { AccionesCasoPropio } from '@/components/configuracion/acciones-caso-propio';
import { CodigoGenerado, type CodigoParaEnviar } from '@/components/asignaciones/codigo-generado';
import { BuscadorEstudiante } from '@/components/configuracion/buscador-estudiante';
import { GuardarComoCaso } from '@/components/configuracion/guardar-como-caso';
import { DialogoEstudiante } from '@/components/estudiantes/dialogo-estudiante';
import { TarjetaEscenario } from '@/components/configuracion/tarjeta-escenario';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { generarAsignacion } from '@/lib/asignaciones/actions';
import { textoDias } from '@/lib/asignaciones/codigo';
import { ETIQUETA_CATEGORIA, ETIQUETA_DIFICULTAD } from '@/lib/escenarios/etiquetas';
import { contarSesiones } from '@/lib/estudiantes/estudiantes';
import { avatarDeEscena } from '@/lib/pacientes/avatar';
import { cn } from '@/lib/utils';
import {
  type GenerarAsignacionData,
  type GenerarAsignacionInput,
  generarAsignacionSchema,
  LIMITES,
  promptSchema,
  VIGENCIA_POR_DEFECTO,
  VIGENCIAS_DIAS,
} from '@/schemas/configuracion.schema';
import { type EscenarioCatalogo, type EstudianteRegistrado } from '@/types';

interface ConfiguradorSesionProps {
  /** Catálogo oficial y casos propios del docente. */
  escenarios: EscenarioCatalogo[];
  /** Caso que llega preseleccionado (p. ej. recién guardado desde el constructor). */
  casoInicialId?: string | null;
  /** Estudiantes registrados por el docente (solo los que tienen cuenta reciben códigos). */
  estudiantes?: EstudianteRegistrado[];
  /** Estudiante que llega preseleccionado (p. ej. desde la página de estudiantes). */
  estudianteInicial?: EstudianteRegistrado | null;
}

/**
 * HU-06 y HU-07 — Pantalla de preparación de la simulación.
 *
 * 1. El docente elige un caso: uno predefinido o uno de "Mis casos" (un solo caso a la vez).
 * 2. Revisa el perfil del paciente virtual y ajusta su comportamiento (prompt del sistema).
 * 3. Asigna la simulación a uno de sus estudiantes y elige la vigencia del código. Al generar
 *    el código se lo envía; el estudiante la hace desde su propio equipo. También puede guardar
 *    el ajuste como caso propio.
 */
export function ConfiguradorSesion({
  escenarios,
  casoInicialId = null,
  estudiantes = [],
  estudianteInicial = null,
}: ConfiguradorSesionProps) {
  const router = useRouter();
  const idGrupo = useId();

  const oficiales = escenarios.filter(e => !e.propio);
  const propios = escenarios
    .filter(e => e.propio)
    .sort((a, b) => b.creadoEn.localeCompare(a.creadoEn));
  const casoInicial = escenarios.find(e => e.id === casoInicialId) ?? null;
  const conCuenta = estudiantes.filter(e => e.cuentaVinculada);

  const [errorServidor, setErrorServidor] = useState<string | null>(null);
  const [codigoGenerado, setCodigoGenerado] = useState<CodigoParaEnviar | null>(null);
  const [generando, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors, isSubmitted },
  } = useForm<GenerarAsignacionInput, unknown, GenerarAsignacionData>({
    resolver: zodResolver(generarAsignacionSchema),
    mode: 'onTouched',
    defaultValues: {
      escenarioId: casoInicial?.id ?? '',
      promptSistema: casoInicial?.npc.promptSistema ?? '',
      estudianteId: estudianteInicial?.cuentaVinculada ? estudianteInicial.id : '',
      vigenciaDias: VIGENCIA_POR_DEFECTO,
    },
  });

  const [escenarioId, promptSistema, estudianteId, vigenciaDias] = useWatch({
    control,
    name: ['escenarioId', 'promptSistema', 'estudianteId', 'vigenciaDias'],
  });
  const escenario = escenarios.find(e => e.id === escenarioId) ?? null;
  const promptPersonalizado = escenario !== null && promptSistema !== escenario.npc.promptSistema;
  const estudiante = conCuenta.find(e => e.id === estudianteId) ?? null;

  // Estado de cada paso: completado (✓), actual (el primero pendiente) o pendiente.
  const estadoPaso1: EstadoPaso = escenario ? 'completado' : 'actual';
  const estadoPaso2: EstadoPaso = !escenario
    ? 'pendiente'
    : promptSchema.safeParse(promptSistema).success
      ? 'completado'
      : 'actual';
  const estadoPaso3: EstadoPaso = estudiante
    ? 'completado'
    : estadoPaso2 === 'completado'
      ? 'actual'
      : 'pendiente';

  const seleccionarEscenario = (nuevo: EscenarioCatalogo) => {
    const opciones = { shouldDirty: true, shouldValidate: isSubmitted };
    setValue('escenarioId', nuevo.id, opciones);
    setValue('promptSistema', nuevo.npc.promptSistema, opciones);
  };

  const onSeleccionar = (nuevo: EscenarioCatalogo) => {
    if (nuevo.id === escenarioId) return;
    seleccionarEscenario(nuevo);
  };

  // Volver a pulsar el caso elegido lo deselecciona y oculta el paso del paciente.
  const onDeseleccionar = () => {
    setValue('escenarioId', '', { shouldDirty: true });
    setValue('promptSistema', '', { shouldDirty: true });
  };

  // Un caso recién guardado entra en la lista al recargar los datos del servidor.
  const onGuardadaComoCaso = () => router.refresh();

  // Si el caso seleccionado se elimina, se limpia la selección.
  const onCasoEliminado = (id: string) => {
    if (id === escenarioId) onDeseleccionar();
    router.refresh();
  };

  const opcionesEstudiante = { shouldDirty: true, shouldValidate: true } as const;
  const elegirEstudiante = (elegido: EstudianteRegistrado) =>
    setValue('estudianteId', elegido.id, opcionesEstudiante);
  const quitarEstudiante = () => setValue('estudianteId', '', { shouldDirty: true });

  // Un estudiante recién registrado aparece al recargar los datos del servidor; queda elegido.
  const onEstudianteRegistrado = (id: string) => {
    setValue('estudianteId', id, { shouldDirty: true });
    router.refresh();
  };

  const restablecerPrompt = () => {
    if (!escenario) return;
    setValue('promptSistema', escenario.npc.promptSistema, {
      shouldDirty: true,
      shouldValidate: true,
    });
  };

  const onSubmit = (datos: GenerarAsignacionData) => {
    const seleccionado = escenarios.find(e => e.id === datos.escenarioId);
    const destinatario = conCuenta.find(e => e.id === datos.estudianteId);
    if (!seleccionado || !destinatario) return;

    setErrorServidor(null);
    startTransition(async () => {
      const resultado = await generarAsignacion(datos);
      if (!resultado.ok) {
        setErrorServidor(resultado.error);
        return;
      }
      setCodigoGenerado({
        codigo: resultado.datos.codigo,
        expiraEn: resultado.datos.expiraEn,
        estudiante: {
          id: destinatario.id,
          nombre: destinatario.nombre,
          correo: destinatario.correo,
        },
        caso: seleccionado.titulo,
      });
      // El caso queda elegido para asignárselo enseguida a otro estudiante.
      quitarEstudiante();
      router.refresh();
    });
  };

  return (
    <div className="flex flex-col gap-8">
      <form
        noValidate
        onSubmit={handleSubmit(onSubmit)}
        className="flex flex-col"
        aria-label="Configuración de la simulación"
      >
        {/* Paso 1 — Escenario */}
        <Paso
          numero={1}
          id="paso-escenario-titulo"
          titulo="Elige el caso"
          estado={estadoPaso1}
          descripcion="Usa uno de los escenarios predefinidos o uno de tus propios casos. Pulsa de nuevo el caso elegido para quitar la selección."
        >
          {errors.escenarioId && (
            <p id="escenario-error" role="alert" className="text-sm text-destructive">
              {errors.escenarioId.message}
            </p>
          )}
          <div
            role="radiogroup"
            aria-labelledby="paso-escenario-titulo"
            aria-required
            aria-invalid={errors.escenarioId ? true : undefined}
            className="flex flex-col gap-8"
          >
            <div className="flex flex-col gap-3">
              <h3 className="text-sm font-medium tracking-wide text-muted-foreground uppercase">
                Escenarios predefinidos
              </h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {oficiales.map(e => (
                  <TarjetaEscenario
                    key={e.id}
                    escenario={e}
                    nombreGrupo={idGrupo}
                    seleccionado={e.id === escenarioId}
                    onSeleccionar={onSeleccionar}
                    onDeseleccionar={onDeseleccionar}
                    describedBy={errors.escenarioId ? 'escenario-error' : undefined}
                  />
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <h3 className="text-sm font-medium tracking-wide text-muted-foreground uppercase">
                Mis casos
              </h3>
              {propios.length === 0 ? (
                <EstadoVacioMisCasos />
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {propios.map(e => (
                    <TarjetaEscenario
                      key={e.id}
                      escenario={e}
                      nombreGrupo={idGrupo}
                      seleccionado={e.id === escenarioId}
                      onSeleccionar={onSeleccionar}
                      onDeseleccionar={onDeseleccionar}
                      describedBy={errors.escenarioId ? 'escenario-error' : undefined}
                      acciones={
                        <AccionesCasoPropio
                          casoId={e.id}
                          titulo={e.titulo}
                          onEliminado={onCasoEliminado}
                        />
                      }
                    />
                  ))}
                  <TarjetaNuevoCaso />
                </div>
              )}
            </div>
          </div>
        </Paso>

        {/* Paso 2 — Paciente virtual (se desbloquea al elegir un caso) */}
        <Paso
          numero={2}
          id="paso-paciente-titulo"
          seccionId="paso-paciente"
          titulo="Ajusta al paciente virtual"
          estado={estadoPaso2}
          descripcion="Revisa su perfil y, si lo necesitas, adapta cómo debe comportarse en esta sesión."
        >
          {!escenario && (
            <div className="flex items-center gap-3 rounded-2xl border border-dashed bg-muted/30 p-5 text-sm text-muted-foreground">
              <LockKeyhole className="size-4 shrink-0" aria-hidden />
              Elige un caso en el paso 1 para ver a su paciente y ajustar su comportamiento.
            </div>
          )}
          {escenario && (
            <div className="flex flex-col gap-4 motion-safe:animate-in motion-safe:duration-500 motion-safe:fade-in-0 motion-safe:slide-in-from-top-2">
              <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:items-stretch">
                {/* Izquierda: el perfil del paciente y, debajo, las reglas que siempre se aplican. */}
                <div className="flex flex-col gap-4">
                  <article className="overflow-hidden rounded-2xl border bg-card shadow-xs">
                    <div className="flex items-center gap-4 bg-linear-to-br from-accent via-accent/60 to-card px-5 py-5">
                      <AvatarPaciente
                        src={avatarDeEscena(escenario.configuracion3d)}
                        nombre={escenario.npc.nombre}
                        className="size-16 font-heading text-xl shadow-sm ring-4 ring-card"
                      />
                      <div className="min-w-0 leading-tight">
                        <h3 className="truncate font-heading text-2xl font-semibold">
                          {escenario.npc.nombre}
                        </h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {escenario.npc.edad} años
                          {escenario.propio ? '' : ` · ${escenario.codigo}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col gap-4 p-5">
                      <div className="flex flex-wrap gap-2">
                        <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium">
                          {ETIQUETA_CATEGORIA[escenario.categoria]}
                        </span>
                        <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium">
                          Nivel {ETIQUETA_DIFICULTAD[escenario.dificultad].toLowerCase()}
                        </span>
                      </div>
                      <div className="flex flex-col gap-1">
                        <h4 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                          Caso
                        </h4>
                        <p className="text-sm font-medium">{escenario.titulo}</p>
                      </div>
                      <div className="flex flex-col gap-1">
                        <h4 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                          Perfil clínico
                        </h4>
                        <p className="text-sm leading-relaxed">{escenario.npc.perfilClinico}</p>
                      </div>
                      <div className="flex items-start gap-2 border-t border-dashed pt-4 text-sm">
                        <Target className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                        <p>
                          <span className="text-muted-foreground">Se entrena: </span>
                          <span className="font-medium">{escenario.competenciaCentral}</span>
                        </p>
                      </div>
                    </div>
                  </article>
                  <ReglasFijas />
                </div>

                <div className="flex min-h-96 flex-col gap-3 rounded-2xl border bg-card p-5 shadow-xs">
                  <div className="flex flex-wrap items-center gap-2">
                    <Label htmlFor="promptSistema">Comportamiento del paciente</Label>
                    {promptPersonalizado && <Badge variant="secondary">Personalizado</Badge>}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="ml-auto"
                      onClick={restablecerPrompt}
                      disabled={!promptPersonalizado}
                    >
                      <RotateCcw aria-hidden />
                      Restablecer original
                    </Button>
                  </div>
                  <Textarea
                    id="promptSistema"
                    // Ocupa todo el alto disponible: la tarjeta mide lo mismo que la columna del perfil.
                    className="field-sizing-fixed min-h-64 flex-1 resize-none font-mono text-[13px] leading-relaxed"
                    aria-invalid={errors.promptSistema ? true : undefined}
                    aria-describedby={
                      errors.promptSistema ? 'promptSistema-error' : 'promptSistema-ayuda'
                    }
                    disabled={generando}
                    {...register('promptSistema')}
                  />
                  <div className="flex items-start justify-between gap-4 text-xs text-muted-foreground">
                    {errors.promptSistema ? (
                      <p id="promptSistema-error" className="text-sm text-destructive">
                        {errors.promptSistema.message}
                      </p>
                    ) : (
                      <p id="promptSistema-ayuda">
                        Estas instrucciones guían al modelo de lenguaje. Los cambios solo aplican a
                        esta sesión, a menos que los guardes como caso propio.
                      </p>
                    )}
                    <span
                      className={cn(
                        'shrink-0 tabular-nums',
                        promptSistema.length > LIMITES.prompt.max && 'text-destructive'
                      )}
                    >
                      {promptSistema.length.toLocaleString('es-CO')}/
                      {LIMITES.prompt.max.toLocaleString('es-CO')}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </Paso>

        {/* Paso 3 — Estudiante y código de acceso */}
        <Paso
          numero={3}
          id="paso-estudiante-titulo"
          titulo="Asigna la simulación"
          estado={estadoPaso3}
          ultimo
          descripcion="Elige al estudiante y cuánto tiempo será válido el código. Él entra con su correo institucional y hace la simulación desde su equipo."
        >
          <div className="flex flex-col gap-5 rounded-2xl border bg-card p-5 shadow-xs">
            {errors.estudianteId && (
              <p id="estudiante-error" role="alert" className="text-sm text-destructive">
                {errors.estudianteId.message}
              </p>
            )}

            {estudiante ? (
              <div className="flex flex-wrap items-center gap-3 rounded-xl border bg-accent/30 p-3">
                <span
                  aria-hidden
                  className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground"
                >
                  {iniciales(estudiante.nombre)}
                </span>
                <div className="min-w-0 flex-1 leading-tight">
                  <p className="truncate font-medium" data-testid="estudiante-elegido">
                    {estudiante.nombre}
                  </p>
                  <p className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                    <span className="font-mono">{estudiante.codigo}</span>
                    <span className="flex items-center gap-1">
                      <Mail className="size-3" aria-hidden />
                      {estudiante.correo}
                    </span>
                    <span>· {contarSesiones(estudiante.metricas.sesiones)}</span>
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={quitarEstudiante}
                  disabled={generando}
                >
                  <X aria-hidden />
                  Cambiar
                </Button>
              </div>
            ) : conCuenta.length > 0 ? (
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <div className="flex-1">
                  <BuscadorEstudiante
                    estudiantes={conCuenta}
                    onSeleccionar={elegirEstudiante}
                    deshabilitado={generando}
                    mensajeVacio="Ningún estudiante con cuenta coincide. Regístralo con su correo institucional."
                  />
                </div>
                <DialogoEstudiante
                  onGuardado={onEstudianteRegistrado}
                  disparador={
                    <Button type="button" variant="outline" size="lg" disabled={generando}>
                      <UserPlus aria-hidden />
                      Registrar estudiante
                    </Button>
                  }
                />
              </div>
            ) : (
              <div className="flex flex-col items-start gap-3 rounded-xl border border-dashed bg-muted/30 p-4 text-sm sm:flex-row sm:items-center">
                <UserPlus className="size-5 shrink-0 text-primary" aria-hidden />
                <p className="flex-1 text-muted-foreground">
                  Aún no tienes estudiantes con cuenta. Regístralos con su correo institucional para
                  enviarles códigos de acceso.
                </p>
                <DialogoEstudiante
                  onGuardado={onEstudianteRegistrado}
                  disparador={
                    <Button type="button" disabled={generando}>
                      <UserPlus aria-hidden />
                      Registrar estudiante
                    </Button>
                  }
                />
              </div>
            )}

            <div
              role="radiogroup"
              aria-labelledby="vigencia-titulo"
              className="flex flex-col gap-2 border-t border-dashed pt-4"
            >
              <p id="vigencia-titulo" className="text-sm font-medium">
                Vigencia del código
              </p>
              <div className="flex flex-wrap gap-2">
                {VIGENCIAS_DIAS.map(dias => (
                  <label
                    key={dias}
                    className={cn(
                      'flex cursor-pointer items-center rounded-full border px-3.5 py-1.5 text-sm transition-colors has-focus-visible:ring-3 has-focus-visible:ring-ring/50',
                      vigenciaDias === dias
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'bg-background hover:bg-muted'
                    )}
                  >
                    <input
                      type="radio"
                      className="sr-only"
                      name="vigenciaDias"
                      checked={vigenciaDias === dias}
                      onChange={() => setValue('vigenciaDias', dias, { shouldDirty: true })}
                      disabled={generando}
                    />
                    {textoDias(dias)}
                  </label>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Si el estudiante no lo usa a tiempo, vence. Puedes anularlo antes desde su ficha.
              </p>
            </div>
          </div>
        </Paso>

        {errorServidor && (
          <Alert variant="destructive" role="alert" className="mt-6">
            <AlertCircle aria-hidden />
            <AlertDescription>{errorServidor}</AlertDescription>
          </Alert>
        )}

        {/* Acciones */}
        <div className="sticky bottom-4 z-10 mt-8 flex flex-col gap-3 rounded-2xl border bg-card/95 p-4 shadow-lg backdrop-blur sm:flex-row sm:items-center">
          <GuardarComoCaso
            escenarioId={escenario?.id ?? null}
            tituloSugerido={escenario?.titulo ?? ''}
            promptActual={promptSistema}
            deshabilitado={generando}
            onGuardado={onGuardadaComoCaso}
          />
          <p
            aria-live="polite"
            className="flex items-center gap-2 text-sm text-muted-foreground sm:ml-auto"
          >
            {!escenario ? (
              'Elige un caso para comenzar'
            ) : !estudiante ? (
              <>Elige al estudiante</>
            ) : (
              <>
                <CheckCircle2 className="size-4 text-success" aria-hidden />
                <span>
                  <span className="font-medium text-foreground">{escenario.titulo}</span> para{' '}
                  <span className="font-medium text-foreground">{estudiante.nombre}</span>
                </span>
              </>
            )}
          </p>
          <Button type="submit" size="lg" disabled={generando} aria-busy={generando}>
            {generando ? (
              <Loader2 className="animate-spin" aria-hidden />
            ) : (
              <KeyRound aria-hidden />
            )}
            {generando ? 'Generando…' : 'Generar código de acceso'}
          </Button>
        </div>
      </form>
      <CodigoGenerado datos={codigoGenerado} onCerrar={() => setCodigoGenerado(null)} />
    </div>
  );
}

const CONSEJOS_MIS_CASOS: { icono: LucideIcon; titulo: string; texto: string }[] = [
  {
    icono: Wand2,
    titulo: 'Desde cero',
    texto: 'Un constructor guiado con vista previa del prompt y prueba del paciente.',
  },
  {
    icono: Bookmark,
    titulo: 'Desde un escenario',
    texto: 'Elige uno arriba, ajusta su comportamiento y pulsa «Guardar como mi caso».',
  },
  {
    icono: Repeat2,
    titulo: 'Reutilízalos',
    texto: 'Quedan en esta lista, listos para cada sesión y cada grupo.',
  },
];

/** Tarjeta punteada, al lado de los casos propios, para crear uno nuevo. */
function TarjetaNuevoCaso() {
  return (
    <Link
      href="/configuracion/casos/nuevo"
      className="group flex min-h-56 flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed bg-card/40 p-6 text-center transition-[border-color,background-color] hover:border-primary/50 hover:bg-accent/40 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
    >
      <span className="flex size-12 items-center justify-center rounded-full border-2 border-dashed border-primary/50 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
        <Plus className="size-6" aria-hidden />
      </span>
      <span className="flex flex-col gap-1">
        <span className="font-heading text-lg font-semibold">Crear caso nuevo</span>
        <span className="text-sm text-muted-foreground">
          Diseña un paciente con el constructor guiado
        </span>
      </span>
    </Link>
  );
}

/** "Mis casos" sin casos todavía: explica qué son y las dos formas de empezar. */
function EstadoVacioMisCasos() {
  return (
    <div className="overflow-hidden rounded-2xl border border-dashed bg-linear-to-br from-accent/60 via-card to-card">
      <div className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:p-8">
        <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
          <FilePlus2 className="size-7" aria-hidden />
        </span>
        <div className="flex flex-1 flex-col gap-1.5">
          <h4 className="font-heading text-xl font-semibold">Aquí vivirán tus propios casos</h4>
          <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
            Aún no tienes casos propios. Crea pacientes a tu medida y reutilízalos con cada grupo,
            sin volver a escribir nada.
          </p>
        </div>
        <Button asChild size="lg">
          <Link href="/configuracion/casos/nuevo">
            <Plus aria-hidden />
            Crear mi primer caso
          </Link>
        </Button>
      </div>
      <ul className="grid gap-4 border-t border-dashed bg-card/60 p-6 text-sm sm:grid-cols-3 sm:px-8">
        {CONSEJOS_MIS_CASOS.map(({ icono: Icono, titulo, texto }) => (
          <li key={titulo} className="flex items-start gap-3">
            <Icono className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
            <p className="leading-snug">
              <span className="font-medium">{titulo}. </span>
              <span className="text-muted-foreground">{texto}</span>
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}

type EstadoPaso = 'completado' | 'actual' | 'pendiente';

interface PasoProps {
  numero: number;
  id: string;
  titulo: string;
  descripcion: string;
  estado: EstadoPaso;
  /** El último paso no dibuja la línea hacia el siguiente. */
  ultimo?: boolean;
  /** `id` de la sección, para poder desplazarse hasta ella. */
  seccionId?: string;
  children: React.ReactNode;
}

/**
 * Paso del asistente: el número va a la izquierda de todo el contenido, unido al siguiente por
 * una línea punteada. Completado se marca con ✓ en verde y la línea se colorea; el paso actual
 * se resalta y los pendientes quedan en gris.
 */
function Paso({
  numero,
  id,
  titulo,
  descripcion,
  estado,
  ultimo = false,
  seccionId,
  children,
}: PasoProps) {
  return (
    <section
      id={seccionId}
      aria-labelledby={id}
      data-estado={estado}
      className="grid scroll-mt-20 grid-cols-[2rem_minmax(0,1fr)] gap-x-4 sm:gap-x-5"
    >
      <div className="flex flex-col items-center">
        <span
          aria-hidden
          className={cn(
            'flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold transition-[background-color,color,box-shadow,border-color] duration-300',
            estado === 'completado' && 'bg-success text-success-foreground',
            estado === 'actual' && 'bg-primary text-primary-foreground ring-4 ring-primary/20',
            estado === 'pendiente' && 'border-2 border-border bg-background text-muted-foreground'
          )}
        >
          {estado === 'completado' ? <Check className="size-4" strokeWidth={3} /> : numero}
        </span>
        {!ultimo && (
          <span
            aria-hidden
            className={cn(
              'mt-2 w-0 flex-1 border-l-2 border-dashed transition-colors duration-500',
              estado === 'completado' ? 'border-success/60' : 'border-border'
            )}
          />
        )}
      </div>

      <div className={cn('flex min-w-0 flex-col gap-4', !ultimo && 'pb-12')}>
        <div className="flex flex-col gap-0.5 pt-0.5">
          <h2
            id={id}
            className={cn(
              'text-xl font-semibold tracking-tight transition-colors',
              estado === 'pendiente' && 'text-muted-foreground'
            )}
          >
            <span className="sr-only">Paso {numero}: </span>
            {titulo}
            {estado === 'completado' && <span className="sr-only"> (completado)</span>}
          </h2>
          <p className="text-sm text-muted-foreground">{descripcion}</p>
        </div>
        {children}
      </div>
    </section>
  );
}

/** Iniciales para el avatar del estudiante ("Ana María Pérez" → "AM"). */
function iniciales(nombre: string) {
  return nombre
    .split(/\s+/)
    .slice(0, 2)
    .map(parte => parte[0] ?? '')
    .join('')
    .toUpperCase();
}
