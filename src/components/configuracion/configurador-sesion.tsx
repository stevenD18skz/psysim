'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  AlertCircle,
  ArrowRight,
  Bookmark,
  Check,
  CheckCircle2,
  FilePlus2,
  Loader2,
  LockKeyhole,
  type LucideIcon,
  Plus,
  Repeat2,
  RotateCcw,
  Target,
  Wand2,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useId, useState, useTransition } from 'react';
import { useForm, useWatch } from 'react-hook-form';

import { AvatarPaciente } from '@/components/pacientes/avatar-paciente';
import { ReglasFijas } from '@/components/casos/reglas-fijas';
import { AccionesCasoPropio } from '@/components/configuracion/acciones-caso-propio';
import { BuscadorEstudiante } from '@/components/configuracion/buscador-estudiante';
import { EstadoEstudiante } from '@/components/configuracion/estado-estudiante';
import { GuardarComoCaso } from '@/components/configuracion/guardar-como-caso';
import { TarjetaEscenario } from '@/components/configuracion/tarjeta-escenario';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { iniciarSimulacion } from '@/lib/escenarios/actions';
import { ETIQUETA_CATEGORIA, ETIQUETA_DIFICULTAD } from '@/lib/escenarios/etiquetas';
import { buscarPorCodigo } from '@/lib/estudiantes/estudiantes';
import { avatarDeEscena } from '@/lib/pacientes/avatar';
import { cn } from '@/lib/utils';
import { promptSchema } from '@/schemas/configuracion.schema';
import {
  codigoEstudianteSchema,
  nombreEstudianteSchema,
  type IniciarSimulacionData,
  type IniciarSimulacionInput,
  iniciarSimulacionSchema,
  LIMITES,
} from '@/schemas/configuracion.schema';
import { useAppStore } from '@/store/app-store-provider';
import { type EscenarioCatalogo, type EstudianteRegistrado } from '@/types';

interface ConfiguradorSesionProps {
  /** Catálogo oficial y casos propios del docente. */
  escenarios: EscenarioCatalogo[];
  /** Caso que llega preseleccionado (p. ej. recién guardado desde el constructor). */
  casoInicialId?: string | null;
  /** Estudiantes registrados por el docente, para elegirlos en lugar de escribirlos. */
  estudiantes?: EstudianteRegistrado[];
  /** Estudiante que llega preseleccionado (p. ej. desde la página de estudiantes). */
  estudianteInicial?: EstudianteRegistrado | null;
}

/**
 * HU-06 y HU-07 — Pantalla de preparación de la simulación.
 *
 * 1. El docente elige un caso: uno predefinido o uno de "Mis casos" (un solo caso a la vez).
 * 2. Revisa el perfil del paciente virtual y ajusta su comportamiento (prompt del sistema).
 * 3. Elige a un estudiante registrado o escribe sus datos (si es nuevo, queda registrado al
 *    iniciar) e inicia la sesión, o guarda el ajuste como caso propio.
 */
export function ConfiguradorSesion({
  escenarios,
  casoInicialId = null,
  estudiantes = [],
  estudianteInicial = null,
}: ConfiguradorSesionProps) {
  const router = useRouter();
  const iniciarSesionEnStore = useAppStore(state => state.sesion.iniciar);
  const idGrupo = useId();

  const oficiales = escenarios.filter(e => !e.propio);
  const propios = escenarios
    .filter(e => e.propio)
    .sort((a, b) => b.creadoEn.localeCompare(a.creadoEn));
  const casoInicial = escenarios.find(e => e.id === casoInicialId) ?? null;

  const [errorServidor, setErrorServidor] = useState<string | null>(null);
  const [iniciando, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors, isSubmitted },
  } = useForm<IniciarSimulacionInput, unknown, IniciarSimulacionData>({
    resolver: zodResolver(iniciarSimulacionSchema),
    mode: 'onTouched',
    defaultValues: {
      escenarioId: casoInicial?.id ?? '',
      promptSistema: casoInicial?.npc.promptSistema ?? '',
      codigoEstudiante: estudianteInicial?.codigo ?? '',
      nombreEstudiante: estudianteInicial?.nombre ?? '',
    },
  });

  const [escenarioId, promptSistema, codigoEstudiante, nombreEstudiante] = useWatch({
    control,
    name: ['escenarioId', 'promptSistema', 'codigoEstudiante', 'nombreEstudiante'],
  });
  const escenario = escenarios.find(e => e.id === escenarioId) ?? null;
  const promptPersonalizado = escenario !== null && promptSistema !== escenario.npc.promptSistema;

  // Estado de cada paso: completado (✓), actual (el primero pendiente) o pendiente.
  const codigoValido = codigoEstudianteSchema.safeParse(codigoEstudiante).success;
  const estudianteValido =
    codigoValido && nombreEstudianteSchema.safeParse(nombreEstudiante).success;
  const registrado = buscarPorCodigo(estudiantes, codigoEstudiante);
  const estadoPaso1: EstadoPaso = escenario ? 'completado' : 'actual';
  const estadoPaso2: EstadoPaso = !escenario
    ? 'pendiente'
    : promptSchema.safeParse(promptSistema).success
      ? 'completado'
      : 'actual';
  const estadoPaso3: EstadoPaso = estudianteValido
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
  const elegirEstudiante = (estudiante: EstudianteRegistrado) => {
    setValue('codigoEstudiante', estudiante.codigo, opcionesEstudiante);
    setValue('nombreEstudiante', estudiante.nombre, opcionesEstudiante);
  };

  const restablecerPrompt = () => {
    if (!escenario) return;
    setValue('promptSistema', escenario.npc.promptSistema, {
      shouldDirty: true,
      shouldValidate: true,
    });
  };

  const onSubmit = (datos: IniciarSimulacionData) => {
    const seleccionado = escenarios.find(e => e.id === datos.escenarioId);
    if (!seleccionado) return;

    setErrorServidor(null);
    startTransition(async () => {
      const resultado = await iniciarSimulacion(datos);
      if (!resultado.ok) {
        setErrorServidor(resultado.error);
        return;
      }

      const { sesionId } = resultado.datos;
      iniciarSesionEnStore({
        id: sesionId,
        // Provisional: el inicio real lo fija la base de datos cuando el estudiante confirma las
        // instrucciones del caso (HU-23); el servidor vuelve a sincronizarlo en /simulacion.
        inicio: new Date().toISOString(),
        comenzada: false,
        estudiante: { codigo: datos.codigoEstudiante, nombre: datos.nombreEstudiante },
        escenario: {
          id: seleccionado.id,
          codigo: seleccionado.codigo,
          titulo: seleccionado.titulo,
          descripcion: seleccionado.descripcion,
          categoria: seleccionado.categoria,
          dificultad: seleccionado.dificultad,
          competenciaCentral: seleccionado.competenciaCentral,
          configuracion3d: seleccionado.configuracion3d,
        },
        npc: {
          id: seleccionado.npc.id,
          nombre: seleccionado.npc.nombre,
          edad: seleccionado.npc.edad,
          perfilClinico: seleccionado.npc.perfilClinico,
        },
      });
      router.push(`/simulacion?sesion=${sesionId}`);
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
                    disabled={iniciando}
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

        {/* Paso 3 — Estudiante */}
        <Paso
          numero={3}
          id="paso-estudiante-titulo"
          titulo="Datos del estudiante"
          estado={estadoPaso3}
          ultimo
          descripcion="Elige a un estudiante que ya practicó o escribe sus datos: queda registrado para el seguimiento de su desempeño."
        >
          <div className="grid gap-4 rounded-2xl border bg-card p-5 shadow-xs sm:grid-cols-2">
            {estudiantes.length > 0 && (
              <div className="border-b border-dashed pb-4 sm:col-span-2">
                <BuscadorEstudiante
                  estudiantes={estudiantes}
                  onSeleccionar={elegirEstudiante}
                  deshabilitado={iniciando}
                />
              </div>
            )}
            <div className="flex flex-col gap-2">
              <Label htmlFor="codigoEstudiante">Código institucional</Label>
              <Input
                id="codigoEstudiante"
                inputMode="numeric"
                autoComplete="off"
                placeholder="Ej.: 202012345"
                maxLength={LIMITES.codigoEstudiante.max + 4}
                aria-invalid={errors.codigoEstudiante ? true : undefined}
                aria-describedby={errors.codigoEstudiante ? 'codigoEstudiante-error' : undefined}
                disabled={iniciando}
                {...register('codigoEstudiante')}
              />
              {errors.codigoEstudiante && (
                <p id="codigoEstudiante-error" className="text-sm text-destructive">
                  {errors.codigoEstudiante.message}
                </p>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="nombreEstudiante">Nombre completo</Label>
              <Input
                id="nombreEstudiante"
                autoComplete="off"
                placeholder="Ej.: Ana María Pérez"
                maxLength={LIMITES.nombreEstudiante.max + 10}
                aria-invalid={errors.nombreEstudiante ? true : undefined}
                aria-describedby={errors.nombreEstudiante ? 'nombreEstudiante-error' : undefined}
                disabled={iniciando}
                {...register('nombreEstudiante')}
              />
              {errors.nombreEstudiante && (
                <p id="nombreEstudiante-error" className="text-sm text-destructive">
                  {errors.nombreEstudiante.message}
                </p>
              )}
            </div>
            <EstadoEstudiante
              registrado={registrado}
              nombre={nombreEstudiante}
              codigoValido={codigoValido}
              onUsarNombre={nombre => setValue('nombreEstudiante', nombre, opcionesEstudiante)}
            />
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
            deshabilitado={iniciando}
            onGuardado={onGuardadaComoCaso}
          />
          <p
            aria-live="polite"
            className="flex items-center gap-2 text-sm text-muted-foreground sm:ml-auto"
          >
            {!escenario ? (
              'Elige un caso para comenzar'
            ) : !estudianteValido ? (
              <>Completa los datos del estudiante</>
            ) : (
              <>
                <CheckCircle2 className="size-4 text-success" aria-hidden />
                <span>
                  Listo para <span className="font-medium text-foreground">{escenario.titulo}</span>
                </span>
              </>
            )}
          </p>
          <Button type="submit" size="lg" disabled={iniciando} aria-busy={iniciando}>
            {iniciando ? <Loader2 className="animate-spin" aria-hidden /> : null}
            {iniciando ? 'Iniciando…' : 'Iniciar simulación'}
            {!iniciando && <ArrowRight aria-hidden />}
          </Button>
        </div>
      </form>
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
