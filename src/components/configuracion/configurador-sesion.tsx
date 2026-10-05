'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, ArrowRight, Loader2, Plus, RotateCcw, UserRound } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useId, useState, useTransition } from 'react';
import { useForm, useWatch } from 'react-hook-form';

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

  // Un caso recién guardado entra en la lista al recargar los datos del servidor.
  const onGuardadaComoCaso = () => router.refresh();

  // Si el caso seleccionado se elimina, se limpia la selección.
  const onCasoEliminado = (id: string) => {
    if (id === escenarioId) {
      setValue('escenarioId', '', { shouldDirty: true });
      setValue('promptSistema', '', { shouldDirty: true });
    }
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
            Usa uno de los escenarios predefinidos o uno de tus propios casos.
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
                <p className="rounded-2xl border border-dashed p-6 text-sm text-muted-foreground">
                  Aún no tienes casos propios. Crea uno desde cero o guarda como caso el ajuste de
                  un escenario predefinido.
                </p>
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {propios.map(e => (
                    <div key={e.id} className="flex flex-col gap-2">
                      <TarjetaEscenario
                        escenario={e}
                        nombreGrupo={idGrupo}
                        seleccionado={e.id === escenarioId}
                        onSeleccionar={onSeleccionar}
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

            <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
              <article className="flex flex-col gap-4 rounded-2xl border bg-card p-5 shadow-xs">
                <div className="flex items-center gap-3">
                  <span className="flex size-12 items-center justify-center rounded-full bg-accent text-accent-foreground">
                    <UserRound className="size-6" aria-hidden />
                  </span>
                  <div>
                    <h3 className="text-xl font-semibold">{escenario.npc.nombre}</h3>
                    <p className="text-sm text-muted-foreground">
                      {escenario.npc.edad} años · {escenario.codigo} {escenario.titulo}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <h4 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                    Perfil clínico
                  </h4>
                  <p className="text-sm leading-relaxed">{escenario.npc.perfilClinico}</p>
                </div>
              </article>

              <div className="flex flex-col gap-2 rounded-2xl border bg-card p-5 shadow-xs">
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
                  rows={10}
                  className="max-h-96 min-h-48 font-mono text-[13px] leading-relaxed"
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
                <ReglasFijas className="mt-1" />
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
