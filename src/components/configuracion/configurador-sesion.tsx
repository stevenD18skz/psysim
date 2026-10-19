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
  Search,
  SlidersHorizontal,
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
import { AjustesPaciente } from '@/components/configuracion/ajustes-paciente';
import { CodigoGenerado, type CodigoParaEnviar } from '@/components/asignaciones/codigo-generado';
import { BuscadorEstudiante } from '@/components/configuracion/buscador-estudiante';
import { GuardarComoCaso } from '@/components/configuracion/guardar-como-caso';
import { DialogoEstudiante } from '@/components/estudiantes/dialogo-estudiante';
import { TarjetaEscenario } from '@/components/configuracion/tarjeta-escenario';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { generarAsignacion } from '@/lib/asignaciones/actions';
import { textoDias } from '@/lib/asignaciones/codigo';
import { AJUSTES_VACIOS, type AjustesPractica, promptConAjustes } from '@/lib/casos/ajustes';
import { coincideBusqueda } from '@/lib/listas';
import { ETIQUETA_CATEGORIA, ETIQUETA_DIFICULTAD } from '@/lib/escenarios/etiquetas';
import { formatearDia } from '@/lib/estudiantes/estudiantes';
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
  /** Llega desde «Crear mi versión»: los ajustes del paciente salen abiertos. */
  ajustarInicial?: boolean;
}

/**
 * HU-06 y HU-07 — Pantalla de preparación de la simulación.
 *
 * 1. El docente elige un caso: uno predefinido o uno de "Mis casos" (un solo caso a la vez).
 * 2. Revisa el perfil del paciente y, si quiere, ajusta su comportamiento (plegado por defecto).
 * 3. Elige al estudiante y la vigencia del código. Al generar el código se lo envía; el estudiante
 *    practica desde su propio computador. También puede guardar el ajuste como caso propio.
 */
export function ConfiguradorSesion({
  escenarios,
  casoInicialId = null,
  estudiantes = [],
  estudianteInicial = null,
  ajustarInicial = false,
}: ConfiguradorSesionProps) {
  const router = useRouter();
  const idGrupo = useId();
  const idBusquedaCaso = useId();
  const [busquedaCaso, setBusquedaCaso] = useState('');

  const coincide = (e: EscenarioCatalogo) =>
    coincideBusqueda(busquedaCaso, e.titulo, e.codigo, e.npc.nombre, e.competenciaCentral);
  const oficiales = escenarios.filter(e => !e.propio && coincide(e));
  const propios = escenarios
    .filter(e => e.propio && coincide(e))
    .sort((a, b) => b.creadoEn.localeCompare(a.creadoEn));
  const totalPropios = escenarios.filter(e => e.propio).length;
  const casoInicial = escenarios.find(e => e.id === casoInicialId) ?? null;
  const conCuenta = estudiantes.filter(e => e.cuentaVinculada);

  const [errorServidor, setErrorServidor] = useState<string | null>(null);
  const [codigoGenerado, setCodigoGenerado] = useState<CodigoParaEnviar | null>(null);
  /** El comportamiento del paciente va plegado hasta que el docente decide ajustarlo. */
  const [ajustando, setAjustando] = useState(ajustarInicial && casoInicial !== null);
  /** Ajustes guiados del paciente para esta práctica (sin escribir instrucciones). */
  const [ajustes, setAjustes] = useState<AjustesPractica>(AJUSTES_VACIOS);
  /** El docente editó el texto completo a mano: los ajustes guiados quedan en pausa. */
  const [textoManual, setTextoManual] = useState(false);
  /** Momento de referencia para mostrar cuándo vencerá el código (se fija al abrir la página). */
  const [ahora] = useState(() => Date.now());
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
    // Los ajustes eran para el paciente anterior.
    setAjustes(AJUSTES_VACIOS);
    setTextoManual(false);
  };

  const cambiarAjustes = (nuevos: AjustesPractica) => {
    setAjustes(nuevos);
    if (!escenario || textoManual) return;
    setValue('promptSistema', promptConAjustes(escenario.npc.promptSistema, nuevos), {
      shouldDirty: true,
      shouldValidate: isSubmitted,
    });
  };

  const onSeleccionar = (nuevo: EscenarioCatalogo) => {
    if (nuevo.id === escenarioId) return;
    seleccionarEscenario(nuevo);
  };

  // Volver a pulsar el caso elegido lo deselecciona y oculta el paso del paciente.
  const onDeseleccionar = () => {
    setValue('escenarioId', '', { shouldDirty: true });
    setValue('promptSistema', '', { shouldDirty: true });
    setAjustes(AJUSTES_VACIOS);
    setTextoManual(false);
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
    setAjustes(AJUSTES_VACIOS);
    setTextoManual(false);
    setValue('promptSistema', escenario.npc.promptSistema, {
      shouldDirty: true,
      shouldValidate: true,
    });
  };

  // Editar el texto completo a mano deja en pausa los ajustes guiados.
  const campoPrompt = register('promptSistema');
  const editarTexto = (evento: React.ChangeEvent<HTMLTextAreaElement>) => {
    void campoPrompt.onChange(evento);
    if (escenario) {
      setTextoManual(
        evento.target.value !== promptConAjustes(escenario.npc.promptSistema, ajustes)
      );
    }
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
        id: resultado.datos.id,
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
          titulo="Caso"
          estado={estadoPaso1}
          descripcion="Un escenario predefinido o uno de tus casos. Pulsa de nuevo el caso elegido para quitar la selección."
        >
          {errors.escenarioId && (
            <p id="escenario-error" role="alert" className="text-sm text-destructive">
              {errors.escenarioId.message}
            </p>
          )}
          {/* Con muchos casos propios, encontrar uno de un vistazo deja de ser posible. */}
          {escenarios.length > 6 && (
            <div className="relative max-w-md">
              <label htmlFor={idBusquedaCaso} className="sr-only">
                Buscar un caso
              </label>
              <Search
                className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                id={idBusquedaCaso}
                type="search"
                autoComplete="off"
                placeholder="Buscar por título, paciente o competencia"
                className="pl-9"
                value={busquedaCaso}
                onChange={evento => setBusquedaCaso(evento.target.value)}
              />
            </div>
          )}
          <div
            role="radiogroup"
            aria-labelledby="paso-escenario-titulo"
            aria-required
            aria-invalid={errors.escenarioId ? true : undefined}
            className="flex flex-col gap-8"
          >
            <div className={cn('flex flex-col gap-3', oficiales.length === 0 && 'hidden')}>
              <h3 className="text-sm font-semibold text-muted-foreground">
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
              <h3 className="text-sm font-semibold text-muted-foreground">Mis casos</h3>
              {totalPropios === 0 ? (
                <EstadoVacioMisCasos />
              ) : propios.length === 0 ? (
                <p className="rounded-xl border border-dashed border-input/50 px-5 py-4 text-sm text-muted-foreground">
                  Ninguno de tus casos coincide con «{busquedaCaso.trim()}».
                </p>
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
          titulo="Comportamiento del paciente (opcional)"
          estado={estadoPaso2}
          descripcion="Revisa su perfil. Si lo necesitas, ajusta cómo actuará en esta práctica."
        >
          {!escenario && (
            <div className="flex items-center gap-3 rounded-xl border border-dashed border-input/50 bg-muted/40 p-5 text-sm text-muted-foreground">
              <LockKeyhole className="size-4 shrink-0" aria-hidden />
              Elige un caso en el paso 1 para ver a su paciente y ajustar su comportamiento.
            </div>
          )}
          {escenario && (
            <div className="flex flex-col gap-4 motion-safe:animate-in motion-safe:duration-500 motion-safe:fade-in-0 motion-safe:slide-in-from-top-2">
              <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:items-stretch">
                {/* Izquierda: el perfil del paciente y, debajo, las reglas que siempre se aplican. */}
                <div className="flex flex-col gap-4">
                  <article className="overflow-hidden rounded-xl border bg-card">
                    <div className="flex items-center gap-4 border-b bg-terracota-suave/60 px-5 py-5">
                      <AvatarPaciente
                        src={avatarDeEscena(escenario.configuracion3d)}
                        nombre={escenario.npc.nombre}
                        className="size-16 text-xl ring-4 ring-card"
                      />
                      <div className="min-w-0 leading-tight">
                        <h3 className="truncate text-2xl font-bold tracking-[-0.015em] text-terracota">
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
                        <h4 className="text-sm font-semibold text-muted-foreground">Caso</h4>
                        <p className="text-sm font-medium">{escenario.titulo}</p>
                      </div>
                      <div className="flex flex-col gap-1">
                        <h4 className="text-sm font-semibold text-muted-foreground">
                          Perfil clínico
                        </h4>
                        <p className="text-sm leading-relaxed">{escenario.npc.perfilClinico}</p>
                      </div>
                      <div className="flex items-start gap-2 border-t pt-4 text-sm">
                        <Target className="mt-0.5 size-4 shrink-0 text-salvia" aria-hidden />
                        <p>
                          <span className="text-muted-foreground">
                            Competencia que practicará:{' '}
                          </span>
                          <span className="font-medium">{escenario.competenciaCentral}</span>
                        </p>
                      </div>
                    </div>
                  </article>
                  <ReglasFijas />
                </div>

                {!ajustando && !promptPersonalizado ? (
                  // Plegado por defecto: casi siempre basta el comportamiento original del caso.
                  <div className="flex flex-col items-start justify-center gap-3 rounded-xl border border-dashed border-input/50 bg-card p-6 lg:min-h-80">
                    <p className="flex items-center gap-2 text-base font-semibold">
                      <SlidersHorizontal className="size-4 text-salvia" aria-hidden />
                      {escenario.npc.nombre.split(' ')[0]} se comportará como describe el caso
                    </p>
                    <p className="max-w-md text-sm text-muted-foreground">
                      Si quieres, ajústalo solo para esta práctica sin escribir instrucciones: que
                      se abra más o menos, una actitud distinta, algo que guarde o una indicación
                      con tus palabras.
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setAjustando(true)}
                      disabled={generando}
                    >
                      <SlidersHorizontal aria-hidden />
                      Ajustar para esta práctica
                    </Button>
                  </div>
                ) : (
                  <AjustesPaciente
                    nombre={escenario.npc.nombre}
                    ajustes={ajustes}
                    onCambio={cambiarAjustes}
                    textoManual={textoManual}
                    onRestablecer={restablecerPrompt}
                    deshabilitado={generando}
                    editorTexto={
                      <>
                        <Label htmlFor="promptSistema" className="sr-only">
                          Comportamiento del paciente
                        </Label>
                        <Textarea
                          id="promptSistema"
                          rows={14}
                          className="max-h-[28rem] min-h-56 font-mono text-[13px] leading-relaxed"
                          aria-invalid={errors.promptSistema ? true : undefined}
                          aria-describedby={
                            errors.promptSistema ? 'promptSistema-error' : undefined
                          }
                          disabled={generando}
                          {...campoPrompt}
                          onChange={editarTexto}
                        />
                        <div className="flex items-start justify-between gap-4 text-xs text-muted-foreground">
                          {errors.promptSistema ? (
                            <p id="promptSistema-error" className="text-sm text-destructive">
                              {errors.promptSistema.message}
                            </p>
                          ) : (
                            <span />
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
                      </>
                    }
                  />
                )}
              </div>
            </div>
          )}
        </Paso>

        {/* Paso 3 — Estudiante y código de acceso */}
        <Paso
          numero={3}
          id="paso-estudiante-titulo"
          titulo="Estudiante y plazo"
          estado={estadoPaso3}
          ultimo
          descripcion="Elige a quién se la asignas y cuánto tiempo sirve el código. Entra con su correo institucional y practica desde su computador."
        >
          <div className="flex flex-col gap-5 rounded-xl border bg-card p-5">
            {errors.estudianteId && (
              <p id="estudiante-error" role="alert" className="text-sm text-destructive">
                {errors.estudianteId.message}
              </p>
            )}

            {estudiante ? (
              <div className="flex flex-wrap items-center gap-3 rounded-xl border bg-salvia-suave/50 p-3">
                <span
                  aria-hidden
                  className="flex size-10 shrink-0 items-center justify-center rounded-full bg-salvia-suave text-sm font-semibold text-salvia-oscuro"
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
                    <span>
                      ·{' '}
                      {estudiante.metricas.sesiones === 1
                        ? '1 práctica'
                        : `${estudiante.metricas.sesiones} prácticas`}
                    </span>
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
              <div className="flex flex-col items-start gap-3 rounded-xl border border-dashed border-input/50 bg-muted/40 p-4 text-sm sm:flex-row sm:items-center">
                <UserPlus className="size-5 shrink-0 text-salvia" aria-hidden />
                <p className="flex-1 text-muted-foreground">
                  Aún no tienes estudiantes. Regístralos con su correo institucional para asignarles
                  prácticas.
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
              className="flex flex-col gap-2 border-t pt-4"
            >
              <p id="vigencia-titulo" className="text-sm font-semibold">
                El código sirve durante
              </p>
              <div className="flex flex-wrap gap-2">
                {VIGENCIAS_DIAS.map(dias => (
                  <label
                    key={dias}
                    className={cn(
                      'flex h-9 cursor-pointer items-center rounded-full border px-4 text-sm transition-colors has-focus-visible:ring-2 has-focus-visible:ring-ring has-focus-visible:ring-offset-2',
                      vigenciaDias === dias
                        ? 'border-nogal bg-nogal font-semibold text-lino'
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
        <div className="sticky bottom-4 z-10 mt-8 flex flex-col gap-3 rounded-xl border bg-card/95 p-3 shadow-[0_12px_32px_-12px_rgb(58_36_24/0.35)] backdrop-blur sm:flex-row sm:items-center sm:p-4">
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
              'Elige un caso para empezar.'
            ) : !estudiante ? (
              <>Elige a quién se lo asignas.</>
            ) : (
              <>
                <CheckCircle2 className="size-4 shrink-0 text-success" aria-hidden />
                <span>
                  <span className="font-medium text-foreground">{escenario.titulo}</span> para{' '}
                  <span className="font-medium text-foreground">{estudiante.nombre}</span> · el
                  código vence el{' '}
                  {formatearDia(new Date(ahora + vigenciaDias * 86_400_000).toISOString())}
                </span>
              </>
            )}
          </p>
          <Button
            type="submit"
            variant="accion"
            size="lg"
            disabled={generando}
            aria-busy={generando}
          >
            {generando ? (
              <Loader2 className="animate-spin" aria-hidden />
            ) : (
              <KeyRound aria-hidden />
            )}
            {generando ? 'Generando…' : 'Generar código'}
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
    texto: 'Un constructor guiado con vista previa del comportamiento y prueba del paciente.',
  },
  {
    icono: Bookmark,
    titulo: 'Desde un escenario',
    texto: 'Elige uno arriba, ajusta su comportamiento y pulsa «Guardar como mi caso».',
  },
  {
    icono: Repeat2,
    titulo: 'Reutilízalos',
    texto: 'Quedan en esta lista, listos para asignarlos de nuevo.',
  },
];

/** Tarjeta punteada, al lado de los casos propios, para crear uno nuevo. */
function TarjetaNuevoCaso() {
  return (
    <Link
      href="/configuracion/casos/nuevo"
      className="group flex min-h-56 flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-input/50 bg-card/40 p-6 text-center transition-[border-color,background-color] hover:border-salvia hover:bg-salvia-suave/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-hidden"
    >
      <span className="flex size-12 items-center justify-center rounded-full border-2 border-dashed border-salvia text-salvia-oscuro transition-colors group-hover:bg-salvia-oscuro group-hover:text-lino">
        <Plus className="size-6" aria-hidden />
      </span>
      <span className="flex flex-col gap-1">
        <span className="text-lg font-bold">Crear caso nuevo</span>
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
    <div className="overflow-hidden rounded-xl border border-dashed border-input/50 bg-card">
      <div className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:p-8">
        <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-salvia-suave text-salvia-oscuro">
          <FilePlus2 className="size-7" aria-hidden />
        </span>
        <div className="flex flex-1 flex-col gap-1.5">
          <h4 className="text-xl font-bold">Aquí vivirán tus casos</h4>
          <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
            Crea un paciente a tu medida, o ajusta un escenario al asignarlo y pulsa «Guardar como
            mi caso».
          </p>
        </div>
        <Button asChild size="lg" variant="outline">
          <Link href="/configuracion/casos/nuevo">
            <Plus aria-hidden />
            Crear mi primer caso
          </Link>
        </Button>
      </div>
      <ul className="grid gap-4 border-t border-dashed border-input/50 bg-muted/40 p-6 text-sm sm:grid-cols-3 sm:px-8">
        {CONSEJOS_MIS_CASOS.map(({ icono: Icono, titulo, texto }) => (
          <li key={titulo} className="flex items-start gap-3">
            <Icono className="mt-0.5 size-4 shrink-0 text-salvia" aria-hidden />
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
            estado === 'completado' && 'bg-salvia-oscuro text-lino',
            estado === 'actual' && 'bg-nogal text-lino ring-4 ring-laton/35',
            estado === 'pendiente' && 'border-2 border-input/60 bg-background text-muted-foreground'
          )}
        >
          {estado === 'completado' ? <Check className="size-4" strokeWidth={3} /> : numero}
        </span>
        {!ultimo && (
          <span
            aria-hidden
            className={cn(
              'mt-2 w-0 flex-1 border-l-2 border-dashed transition-colors duration-500',
              estado === 'completado' ? 'border-salvia/60' : 'border-border'
            )}
          />
        )}
      </div>

      <div className={cn('flex min-w-0 flex-col gap-4', !ultimo && 'pb-12')}>
        <div className="flex flex-col gap-0.5 pt-0.5">
          <h2
            id={id}
            className={cn(
              'text-xl font-bold tracking-[-0.015em] transition-colors',
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
