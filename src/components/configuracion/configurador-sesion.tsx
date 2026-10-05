'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  AlertCircle,
  ArrowRight,
  Bookmark,
  FilePlus2,
  Loader2,
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
import { avatarDeEscena } from '@/lib/pacientes/avatar';
import { cn } from '@/lib/utils';
import {
  type IniciarSimulacionData,
  type IniciarSimulacionInput,
  iniciarSimulacionSchema,
  LIMITES,
} from '@/schemas/configuracion.schema';
import { useAppStore } from '@/store/app-store-provider';
import { type EscenarioCatalogo } from '@/types';

interface ConfiguradorSesionProps {
  /** Catálogo oficial y casos propios del docente. */
  escenarios: EscenarioCatalogo[];
  /** Caso que llega preseleccionado (p. ej. recién guardado desde el constructor). */
  casoInicialId?: string | null;
}

/**
 * HU-06 y HU-07 — Pantalla de preparación de la simulación.
 *
 * 1. El docente elige un caso: uno predefinido o uno de "Mis casos" (un solo caso a la vez).
 * 2. Revisa el perfil del paciente virtual y ajusta su comportamiento (prompt del sistema).
 * 3. Ingresa los datos del estudiante e inicia la sesión, o guarda el ajuste como caso propio.
 */
export function ConfiguradorSesion({ escenarios, casoInicialId = null }: ConfiguradorSesionProps) {
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
      codigoEstudiante: '',
      nombreEstudiante: '',
    },
  });

  const [escenarioId, promptSistema] = useWatch({
    control,
    name: ['escenarioId', 'promptSistema'],
  });
  const escenario = escenarios.find(e => e.id === escenarioId) ?? null;
  const promptPersonalizado = escenario !== null && promptSistema !== escenario.npc.promptSistema;

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
        className="flex flex-col gap-10"
        aria-label="Configuración de la simulación"
      >
        {/* Paso 1 — Escenario */}
        <section className="flex flex-col gap-4">
          <EncabezadoPaso numero={1} titulo="Elige el caso" id="paso-escenario-titulo">
            Usa uno de los escenarios predefinidos o uno de tus propios casos. Pulsa de nuevo el
            caso elegido para quitar la selección.
          </EncabezadoPaso>
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
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-medium tracking-wide text-muted-foreground uppercase">
                  Mis casos
                </h3>
                <Button asChild variant="outline" size="sm">
                  <Link href="/configuracion/casos/nuevo">
                    <Plus aria-hidden />
                    Crear caso nuevo
                  </Link>
                </Button>
              </div>
              {propios.length === 0 ? (
                <EstadoVacioMisCasos />
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {propios.map(e => (
                    <div key={e.id} className="flex flex-col gap-2">
                      <TarjetaEscenario
                        escenario={e}
                        nombreGrupo={idGrupo}
                        seleccionado={e.id === escenarioId}
                        onSeleccionar={onSeleccionar}
                        onDeseleccionar={onDeseleccionar}
                        describedBy={errors.escenarioId ? 'escenario-error' : undefined}
                      />
                      <AccionesCasoPropio
                        casoId={e.id}
                        titulo={e.titulo}
                        onEliminado={onCasoEliminado}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Paso 2 — Paciente virtual (se expande al elegir un escenario) */}
        {escenario && (
          <section
            id="paso-paciente"
            aria-labelledby="paso-paciente-titulo"
            className="flex animate-in scroll-mt-20 flex-col gap-4 fade-in-0 slide-in-from-top-2"
          >
            <EncabezadoPaso
              numero={2}
              titulo="Ajusta al paciente virtual"
              id="paso-paciente-titulo"
            >
              Revisa su perfil y, si lo necesitas, adapta cómo debe comportarse en esta sesión.
            </EncabezadoPaso>

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
          </section>
        )}

        {/* Paso 3 — Estudiante */}
        <section aria-labelledby="paso-estudiante-titulo" className="flex flex-col gap-4">
          <EncabezadoPaso
            numero={escenario ? 3 : 2}
            titulo="Datos del estudiante"
            id="paso-estudiante-titulo"
          >
            Quedan registrados en la sesión para el seguimiento de su desempeño.
          </EncabezadoPaso>
          <div className="grid gap-4 rounded-2xl border bg-card p-5 shadow-xs sm:grid-cols-2">
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
          </div>
        </section>

        {errorServidor && (
          <Alert variant="destructive" role="alert">
            <AlertCircle aria-hidden />
            <AlertDescription>{errorServidor}</AlertDescription>
          </Alert>
        )}

        {/* Acciones */}
        <div className="sticky bottom-4 z-10 flex flex-col gap-3 rounded-2xl border bg-card/95 p-4 shadow-lg backdrop-blur sm:flex-row sm:items-center">
          <GuardarComoCaso
            escenarioId={escenario?.id ?? null}
            tituloSugerido={escenario?.titulo ?? ''}
            promptActual={promptSistema}
            deshabilitado={iniciando}
            onGuardado={onGuardadaComoCaso}
          />
          <p className="text-sm text-muted-foreground sm:ml-auto">
            {escenario ? (
              <>
                Listo para <span className="font-medium text-foreground">{escenario.titulo}</span>
              </>
            ) : (
              'Elige un escenario para comenzar'
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

interface EncabezadoPasoProps {
  numero: number;
  titulo: string;
  id: string;
  children: React.ReactNode;
}

function EncabezadoPaso({ numero, titulo, id, children }: EncabezadoPasoProps) {
  return (
    <div className="flex items-start gap-3">
      <span
        aria-hidden
        className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground"
      >
        {numero}
      </span>
      <div className="flex flex-col gap-0.5">
        <h2 id={id} className="text-xl font-semibold tracking-tight">
          <span className="sr-only">Paso {numero}: </span>
          {titulo}
        </h2>
        <p className="text-sm text-muted-foreground">{children}</p>
      </div>
    </div>
  );
}
