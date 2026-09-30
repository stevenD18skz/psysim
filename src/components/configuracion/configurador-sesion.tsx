'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, ArrowRight, Loader2, RotateCcw, UserRound } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useId, useState, useTransition } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';

import { ConfiguracionesGuardadas } from '@/components/configuracion/configuraciones-guardadas';
import { GuardarConfiguracion } from '@/components/configuracion/guardar-configuracion';
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
import { type ConfiguracionGuardada, type EscenarioCatalogo } from '@/types';

interface ConfiguradorSesionProps {
  escenarios: EscenarioCatalogo[];
  configuracionesIniciales: ConfiguracionGuardada[];
}

/**
 * HU-06 y HU-07 — Pantalla de preparación de la simulación.
 *
 * 1. El docente elige un escenario (un solo escenario seleccionado a la vez).
 * 2. Revisa el perfil del paciente virtual y ajusta su comportamiento (prompt del sistema).
 * 3. Ingresa los datos del estudiante e inicia la sesión, o guarda la configuración.
 */
export function ConfiguradorSesion({
  escenarios,
  configuracionesIniciales,
}: ConfiguradorSesionProps) {
  const router = useRouter();
  const iniciarSesionEnStore = useAppStore(state => state.sesion.iniciar);
  const idGrupo = useId();

  const [configuraciones, setConfiguraciones] = useState(configuracionesIniciales);
  const [listaAbierta, setListaAbierta] = useState(false);
  const [configuracionCargadaId, setConfiguracionCargadaId] = useState<string | null>(null);
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
      escenarioId: '',
      promptSistema: '',
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

  const seleccionarEscenario = (nuevo: EscenarioCatalogo, prompt = nuevo.npc.promptSistema) => {
    const opciones = { shouldDirty: true, shouldValidate: isSubmitted };
    setValue('escenarioId', nuevo.id, opciones);
    setValue('promptSistema', prompt, opciones);
  };

  const onSeleccionar = (nuevo: EscenarioCatalogo) => {
    if (nuevo.id === escenarioId) return;
    seleccionarEscenario(nuevo);
    setConfiguracionCargadaId(null);
  };

  // HU-07 · T04: cargar una configuración no toca los datos del estudiante.
  const onCargarConfiguracion = (configuracion: ConfiguracionGuardada) => {
    const destino = escenarios.find(e => e.id === configuracion.escenarioId);
    if (!destino) return;
    seleccionarEscenario(destino, configuracion.promptPersonalizado);
    setConfiguracionCargadaId(configuracion.id);
    toast.info(`Configuración «${configuracion.nombre}» cargada.`);
    document.getElementById('paso-paciente')?.scrollIntoView({ behavior: 'smooth' });
  };

  const onGuardada = (configuracion: ConfiguracionGuardada) => {
    setConfiguraciones(actuales => [configuracion, ...actuales]);
    setConfiguracionCargadaId(configuracion.id);
    setListaAbierta(true);
  };

  const onEliminada = (id: string) => {
    setConfiguraciones(actuales => actuales.filter(c => c.id !== id));
    if (id === configuracionCargadaId) setConfiguracionCargadaId(null);
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
        inicio: new Date().toISOString(),
        estudiante: { codigo: datos.codigoEstudiante, nombre: datos.nombreEstudiante },
        escenario: {
          id: seleccionado.id,
          codigo: seleccionado.codigo,
          titulo: seleccionado.titulo,
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
      <ConfiguracionesGuardadas
        configuraciones={configuraciones}
        escenarios={escenarios}
        abierto={listaAbierta}
        onAbiertoChange={setListaAbierta}
        cargadaId={configuracionCargadaId}
        onCargar={onCargarConfiguracion}
        onEliminada={onEliminada}
      />

      <form
        noValidate
        onSubmit={handleSubmit(onSubmit)}
        className="flex flex-col gap-10"
        aria-label="Configuración de la simulación"
      >
        {/* Paso 1 — Escenario */}
        <section className="flex flex-col gap-4">
          <EncabezadoPaso numero={1} titulo="Elige el escenario" id="paso-escenario-titulo">
            Cada escenario trae un paciente virtual con un perfil clínico distinto.
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
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3"
          >
            {escenarios.map(e => (
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
                      esta sesión, a menos que guardes la configuración.
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
          <GuardarConfiguracion
            escenarioId={escenario?.id ?? null}
            promptActual={promptSistema}
            deshabilitado={iniciando}
            onGuardada={onGuardada}
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
