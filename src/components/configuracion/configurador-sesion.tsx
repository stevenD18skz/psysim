'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  AlertCircle,
  BookOpen,
  Check,
  CheckCircle2,
  FileText,
  KeyRound,
  Loader2,
  LockKeyhole,
  Mail,
  Plus,
  Search,
  Target,
  UserPlus,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useId, useRef, useState, useTransition } from 'react';
import { useForm, useWatch } from 'react-hook-form';

import { EstadoVacioMisCasos } from '@/components/casos/estado-vacio-mis-casos';
import { IndicadorNivel, InsigniaCategoria } from '@/components/casos/insignias-caso';
import { AvatarPaciente } from '@/components/pacientes/avatar-paciente';
import { ReglasFijas } from '@/components/casos/reglas-fijas';
import { AyudaContextual } from '@/components/comun/ayuda-contextual';
import { BotonSeccion } from '@/components/comun/boton-seccion';
import { PaginacionLocal } from '@/components/comun/paginacion';
import { PistaSegmentada } from '@/components/comun/pista-segmentada';
import { AccionesCasoPropio } from '@/components/configuracion/acciones-caso-propio';
import { AjustesPaciente } from '@/components/configuracion/ajustes-paciente';
import { CodigoGenerado, type CodigoParaEnviar } from '@/components/asignaciones/codigo-generado';
import { BuscadorEstudiante } from '@/components/configuracion/buscador-estudiante';
import { GuardarComoCaso } from '@/components/configuracion/guardar-como-caso';
import { RecorridoAsignarPractica } from '@/components/configuracion/recorrido-asignar';
import { ResumenPacientePaso } from '@/components/configuracion/resumen-paciente-paso';
import { DialogoEstudiante } from '@/components/estudiantes/dialogo-estudiante';
import { TarjetaEscenario } from '@/components/configuracion/tarjeta-escenario';
import { AvatarCuenta } from '@/components/layout/avatar-cuenta';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { generarAsignacion } from '@/lib/asignaciones/actions';
import { textoDias } from '@/lib/asignaciones/codigo';
import { AJUSTES_VACIOS, type AjustesPractica, promptConAjustes } from '@/lib/casos/ajustes';
import { coincideBusqueda, paginar } from '@/lib/listas';
import { formatearDia } from '@/lib/estudiantes/estudiantes';
import { avatarDeEscena } from '@/lib/pacientes/avatar';
import {
  DURACION_CONSULTA_POR_DEFECTO,
  DURACIONES_CONSULTA_MIN,
} from '@/lib/sesiones/tiempo-consulta';
import { cn } from '@/lib/utils';
import {
  type GenerarAsignacionData,
  type GenerarAsignacionInput,
  generarAsignacionSchema,
  promptSchema,
  VIGENCIA_POR_DEFECTO,
  VIGENCIAS_DIAS,
} from '@/schemas/configuracion.schema';
import { type EscenarioCatalogo, type EstudianteRegistrado } from '@/types';
import { sinPerderElPanel } from '@/components/comun/sin-perder-el-panel';

const CASOS_PASO_POR_PAGINA = 12;

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
  const totalOficiales = escenarios.filter(e => !e.propio).length;
  const totalPropios = escenarios.filter(e => e.propio).length;
  const casoInicial = escenarios.find(e => e.id === casoInicialId) ?? null;
  const conCuenta = estudiantes.filter(e => e.cuentaVinculada);
  const pendientesDeIngreso = estudiantes.length - conCuenta.length;
  const [seccionCasos, setSeccionCasos] = useState<'propios' | 'predefinidos'>(() =>
    casoInicial
      ? casoInicial.propio
        ? 'propios'
        : 'predefinidos'
      : totalPropios > 0
        ? 'propios'
        : 'predefinidos'
  );
  const [paginaCasos, setPaginaCasos] = useState(() => {
    if (!casoInicial) return 1;
    const lista = casoInicial.propio ? propios : oficiales;
    const indice = lista.findIndex(e => e.id === casoInicial.id);
    return indice >= 0 ? Math.floor(indice / CASOS_PASO_POR_PAGINA) + 1 : 1;
  });

  const paginaOficiales = paginar(oficiales, paginaCasos, CASOS_PASO_POR_PAGINA);
  const paginaPropios = paginar(propios, paginaCasos, CASOS_PASO_POR_PAGINA);

  const [errorServidor, setErrorServidor] = useState<string | null>(null);
  const [codigoGenerado, setCodigoGenerado] = useState<CodigoParaEnviar | null>(null);
  const botonGenerar = useRef<HTMLButtonElement>(null);
  const devolverFocoGenerar = useRef(false);
  /** El comportamiento del paciente va plegado hasta que el docente decide ajustarlo. */
  const [ajustando, setAjustando] = useState(ajustarInicial && casoInicial !== null);
  /** Ajustes guiados del paciente para esta práctica (sin escribir instrucciones). */
  const [ajustes, setAjustes] = useState<AjustesPractica>(AJUSTES_VACIOS);
  /** El docente editó el texto completo a mano: los ajustes guiados quedan en pausa. */
  const [textoManual, setTextoManual] = useState(false);
  /** Momento de referencia para mostrar cuándo vencerá el código (se fija al abrir la página). */
  const [ahora] = useState(() => Date.now());
  const [generando, startTransition] = useTransition();
  const solicitud = useRef<{ id: string; configuracion: string } | null>(null);

  useEffect(() => {
    // El diálogo puede cerrarse antes de que termine el refresh que habilita el botón.
    if (!devolverFocoGenerar.current || codigoGenerado || generando) return;
    devolverFocoGenerar.current = false;
    botonGenerar.current?.focus({ preventScroll: true });
  }, [codigoGenerado, generando]);

  const cerrarCodigo = () => {
    devolverFocoGenerar.current = true;
    setCodigoGenerado(null);
  };

  const {
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
      duracionMinutos: DURACION_CONSULTA_POR_DEFECTO,
    },
  });

  const [escenarioId, promptSistema, estudianteId, vigenciaDias, duracionMinutos] = useWatch({
    control,
    name: ['escenarioId', 'promptSistema', 'estudianteId', 'vigenciaDias', 'duracionMinutos'],
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
  const quitarEstudiante = () => {
    solicitud.current = null;
    setValue('estudianteId', '', { shouldDirty: true });
  };

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
  const editarTexto = (valor: string) => {
    setValue('promptSistema', valor, {
      shouldDirty: true,
      shouldValidate: isSubmitted || Boolean(errors.promptSistema),
    });
    if (escenario) {
      setTextoManual(valor !== promptConAjustes(escenario.npc.promptSistema, ajustes));
    }
  };

  const onSubmit = (datos: GenerarAsignacionData) => {
    const seleccionado = escenarios.find(e => e.id === datos.escenarioId);
    const destinatario = conCuenta.find(e => e.id === datos.estudianteId);
    if (!seleccionado || !destinatario) return;

    const configuracion = JSON.stringify(datos);
    if (solicitud.current?.configuracion !== configuracion) {
      solicitud.current = { id: crypto.randomUUID(), configuracion };
    }
    const solicitudId = solicitud.current.id;
    setErrorServidor(null);
    startTransition(
      sinPerderElPanel(async () => {
        const resultado = await generarAsignacion({ ...datos, solicitudId });
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
      })
    );
  };

  return (
    <div className="flex flex-col gap-6">
      <RecorridoAsignarPractica />
      <form
        noValidate
        onSubmit={evento => void handleSubmit(onSubmit)(evento)}
        className="flex flex-col"
        aria-label="Configuración de la práctica"
      >
        {/* Paso 1 — Escenario */}
        <Paso
          numero={1}
          id="paso-escenario-titulo"
          tourId="config-caso"
          titulo="Caso"
          estado={estadoPaso1}
          ayuda="Alterna entre los casos que diseñaste y los predefinidos de PsySim. Solo se elige un caso por código; púlsalo de nuevo si quieres deseleccionarlo."
          descripcion="Elige entre tus casos propios o los casos predefinidos. Pulsa de nuevo el caso elegido para quitar la selección."
        >
          {errors.escenarioId && (
            <p id="escenario-error" role="alert" className="text-sm text-destructive">
              {errors.escenarioId.message}
            </p>
          )}

          {/* Barra de sección: «Mis casos» primero y «Casos predefinidos» después */}
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
            <PistaSegmentada
              role="group"
              aria-label="Secciones de casos"
              className="inline-flex w-fit items-center gap-1 rounded-xl border bg-muted/55 p-1"
              claseIndicador="rounded-lg bg-card shadow-xs"
            >
              <BotonSeccion
                activa={seccionCasos === 'propios'}
                onClick={() => {
                  setSeccionCasos('propios');
                  setPaginaCasos(1);
                }}
                cantidad={busquedaCaso.trim() ? propios.length : totalPropios}
              >
                Mis casos
              </BotonSeccion>
              <BotonSeccion
                activa={seccionCasos === 'predefinidos'}
                onClick={() => {
                  setSeccionCasos('predefinidos');
                  setPaginaCasos(1);
                }}
                cantidad={busquedaCaso.trim() ? oficiales.length : totalOficiales}
              >
                Casos predefinidos
              </BotonSeccion>
            </PistaSegmentada>

            <div className="flex flex-wrap items-center gap-2.5">
              {escenario && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-salvia/40 bg-salvia-suave/55 py-1 pr-1.5 pl-3 text-xs font-medium text-salvia-oscuro">
                  <CheckCircle2 className="size-3.5 shrink-0" aria-hidden />
                  <span className="max-w-52 truncate">Elegido: {escenario.titulo}</span>
                  <button
                    type="button"
                    onClick={onDeseleccionar}
                    disabled={generando}
                    aria-label="Quitar caso seleccionado"
                    className="flex size-5 items-center justify-center rounded-full text-salvia-oscuro/80 transition-colors hover:bg-salvia-oscuro/15 hover:text-salvia-oscuro focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring focus-visible:outline-solid disabled:pointer-events-none disabled:opacity-50"
                  >
                    <X className="size-3" aria-hidden />
                  </button>
                </span>
              )}
              {escenarios.length > 6 && (
                <div className="relative w-full sm:w-72">
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
                    onChange={evento => {
                      setBusquedaCaso(evento.target.value);
                      setPaginaCasos(1);
                    }}
                  />
                </div>
              )}
            </div>
          </div>

          <div
            role="radiogroup"
            aria-labelledby="paso-escenario-titulo"
            aria-required
            aria-invalid={errors.escenarioId ? true : undefined}
            // Al cambiar de sección, la lista entra desde el lado hacia el que se movió la pista.
            key={seccionCasos}
            className={cn(
              'flex flex-col gap-4 motion-safe:animate-in motion-safe:duration-300 motion-safe:ease-salida motion-safe:fade-in-0',
              seccionCasos === 'propios'
                ? 'motion-safe:slide-in-from-left-4'
                : 'motion-safe:slide-in-from-right-4'
            )}
          >
            {seccionCasos === 'predefinidos' ? (
              oficiales.length === 0 ? (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed border-input/50 px-5 py-4 text-sm text-muted-foreground">
                  <p>
                    Ningún caso predefinido coincide con{' '}
                    <span className="font-medium text-foreground">{busquedaCaso.trim()}</span>.
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    {propios.length > 0 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSeccionCasos('propios');
                          setPaginaCasos(1);
                        }}
                      >
                        Ver {propios.length} en Mis casos
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setBusquedaCaso('');
                        setPaginaCasos(1);
                      }}
                    >
                      Limpiar búsqueda
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {paginaOficiales.visibles.map(e => (
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
                  <PaginacionLocal
                    pagina={paginaOficiales}
                    onCambiar={setPaginaCasos}
                    sustantivo={['caso', 'casos']}
                    soloSiHayVarias
                  />
                </>
              )
            ) : totalPropios === 0 ? (
              <EstadoVacioMisCasos />
            ) : propios.length === 0 ? (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed border-input/50 px-5 py-4 text-sm text-muted-foreground">
                <p>
                  Ninguno de tus casos coincide con{' '}
                  <span className="font-medium text-foreground">{busquedaCaso.trim()}</span>.
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  {oficiales.length > 0 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSeccionCasos('predefinidos');
                        setPaginaCasos(1);
                      }}
                    >
                      Ver {oficiales.length} en Casos predefinidos
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setBusquedaCaso('');
                      setPaginaCasos(1);
                    }}
                  >
                    Limpiar búsqueda
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {paginaPropios.visibles.map(e => (
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
                <PaginacionLocal
                  pagina={paginaPropios}
                  onCambiar={setPaginaCasos}
                  sustantivo={['caso', 'casos']}
                  soloSiHayVarias
                />
              </>
            )}
          </div>
        </Paso>

        {/* Paso 2 — Paciente virtual (se desbloquea al elegir un caso) */}
        <Paso
          numero={2}
          id="paso-paciente-titulo"
          seccionId="paso-paciente"
          tourId="config-paciente"
          titulo="Comportamiento del paciente (opcional)"
          estado={estadoPaso2}
          ayuda="El caso ya viene listo para usar. Si quieres adaptarlo para este estudiante o crear un caso propio con otra dificultad a partir de él, usa el bloque de la derecha."
          descripcion="Revisa su perfil. Si lo necesitas, ajusta cómo actuará en esta práctica."
        >
          {!escenario && (
            <div className="flex items-center gap-3 rounded-xl border border-dashed border-input/50 bg-muted/40 p-5 text-sm text-muted-foreground">
              <LockKeyhole className="size-4 shrink-0" aria-hidden />
              Elige un caso en el paso 1 para ver a su paciente y ajustar su comportamiento.
            </div>
          )}
          {escenario && (
            <div className="flex flex-col gap-4 motion-safe:animate-in motion-safe:duration-300 motion-safe:ease-salida motion-safe:fade-in-0 motion-safe:slide-in-from-top-2">
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
                      <div className="flex flex-wrap items-center gap-2">
                        <InsigniaCategoria categoria={escenario.categoria} />
                        <IndicadorNivel dificultad={escenario.dificultad} conFondo />
                      </div>
                      <div className="flex flex-col gap-1">
                        <h4 className="flex items-center gap-1.5 text-xs font-semibold tracking-[0.06em] text-muted-foreground uppercase ancho-condensado">
                          <BookOpen className="size-3.5 text-salvia" aria-hidden />
                          Caso seleccionado
                        </h4>
                        <p className="text-base leading-snug font-bold tracking-[-0.01em]">
                          {escenario.titulo}
                        </p>
                      </div>
                      <div className="flex flex-col gap-1">
                        <h4 className="flex items-center gap-1.5 text-xs font-semibold tracking-[0.06em] text-muted-foreground uppercase ancho-condensado">
                          <FileText className="size-3.5 text-salvia" aria-hidden />
                          Perfil clínico
                        </h4>
                        <p className="text-sm leading-relaxed text-foreground/90">
                          {escenario.npc.perfilClinico}
                        </p>
                      </div>
                      <div className="flex flex-col gap-1 border-t pt-4">
                        <h4 className="flex items-center gap-1.5 text-xs font-semibold tracking-[0.06em] text-muted-foreground uppercase ancho-condensado">
                          <Target className="size-3.5 text-salvia" aria-hidden />
                          Competencia que practicará
                        </h4>
                        <p className="text-sm font-semibold">{escenario.competenciaCentral}</p>
                      </div>
                    </div>
                  </article>
                  <ReglasFijas className="lg:flex-1" expandido={ajustando || promptPersonalizado} />
                </div>

                {!ajustando && !promptPersonalizado ? (
                  <ResumenPacientePaso
                    escenario={escenario}
                    deshabilitado={generando}
                    onAbrirAjustes={() => setAjustando(true)}
                    onAplicarAtajo={nuevos => {
                      setAjustando(true);
                      cambiarAjustes(nuevos);
                    }}
                  />
                ) : (
                  <AjustesPaciente
                    escenarioId={escenario.id}
                    nombre={escenario.npc.nombre}
                    ajustes={ajustes}
                    onCambio={cambiarAjustes}
                    textoManual={textoManual}
                    onRestablecer={restablecerPrompt}
                    onCerrar={() => setAjustando(false)}
                    deshabilitado={generando}
                    promptActual={promptSistema}
                    promptError={errors.promptSistema?.message}
                    onEditarPrompt={editarTexto}
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
          tourId="config-estudiante"
          titulo="Estudiante y plazo"
          estado={estadoPaso3}
          ultimo
          ayuda="El código es personal y sirve para una sola práctica. Solo pueden recibirlo estudiantes que ya hayan iniciado sesión con su correo institucional."
          descripcion="Elige a quién se la asignas y cuánto tiempo sirve el código. Entra con su correo institucional y practica desde su computador."
        >
          <div className="flex flex-col gap-5 rounded-xl border bg-card p-5">
            {errors.estudianteId && (
              <p id="estudiante-error" role="alert" className="text-sm text-destructive">
                {errors.estudianteId.message}
              </p>
            )}

            {estudiante ? (
              <div className="flex flex-wrap items-center gap-3 rounded-xl border border-salvia/40 bg-salvia-suave/45 px-4 py-3 motion-safe:animate-in motion-safe:duration-300 motion-safe:ease-salida motion-safe:fade-in-0 motion-safe:slide-in-from-top-1">
                <AvatarCuenta
                  avatarId={estudiante.avatarId}
                  nombre={estudiante.nombre}
                  className="size-10 bg-salvia-oscuro text-sm text-lino"
                />
                <div className="min-w-0 flex-1 leading-tight">
                  <p className="truncate font-semibold" data-testid="estudiante-elegido">
                    {estudiante.nombre}
                  </p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
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
              <div className="flex flex-col gap-2 motion-safe:animate-in motion-safe:duration-300 motion-safe:ease-salida motion-safe:fade-in-0 motion-safe:slide-in-from-top-1">
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
                {pendientesDeIngreso > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {pendientesDeIngreso}{' '}
                    {pendientesDeIngreso === 1
                      ? 'estudiante registrado aún no entra con Google y no aparece en la lista.'
                      : 'estudiantes registrados aún no entran con Google y no aparecen en la lista.'}
                  </p>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-start gap-3 rounded-xl border border-dashed border-input/50 bg-muted/40 p-4 text-sm sm:flex-row sm:items-center">
                <UserPlus className="size-5 shrink-0 text-salvia" aria-hidden />
                <p className="flex-1 text-muted-foreground">
                  Aún no tienes estudiantes. Regístralos con su correo institucional para asignarles
                  prácticas.
                  {estudiantes.length > 0 && (
                    <span className="mt-1 block text-xs">
                      Tienes {estudiantes.length}{' '}
                      {estudiantes.length === 1 ? 'registrado' : 'registrados'} esperando su primer
                      ingreso con Google.
                    </span>
                  )}
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

            <div className="grid gap-5 border-t pt-5 md:grid-cols-2 md:gap-6">
              <OpcionesEnPildora
                id="duracion-titulo"
                titulo="La consulta dura"
                nombre="duracionMinutos"
                opciones={DURACIONES_CONSULTA_MIN}
                valor={duracionMinutos ?? DURACION_CONSULTA_POR_DEFECTO}
                etiqueta={minutos => `${minutos} min`}
                onCambiar={minutos => setValue('duracionMinutos', minutos, { shouldDirty: true })}
                deshabilitado={generando}
                ayuda="Corre desde la primera intervención. El estudiante lo sabe desde las instrucciones, recibe un aviso 3 minutos antes y tiene 5 minutos más para cerrar la entrevista."
              />

              <OpcionesEnPildora
                id="vigencia-titulo"
                titulo="El código sirve durante"
                nombre="vigenciaDias"
                opciones={VIGENCIAS_DIAS}
                valor={vigenciaDias}
                etiqueta={textoDias}
                onCambiar={dias => setValue('vigenciaDias', dias, { shouldDirty: true })}
                deshabilitado={generando}
                ayuda="Si el estudiante no lo usa a tiempo, vence. Puedes anularlo antes desde su ficha."
              />
            </div>
          </div>
        </Paso>

        {errorServidor && (
          <Alert
            variant="destructive"
            role="alert"
            className="mt-6 motion-safe:animate-in motion-safe:duration-300 motion-safe:ease-salida motion-safe:fade-in-0 motion-safe:slide-in-from-top-1"
          >
            <AlertCircle aria-hidden />
            <AlertDescription>{errorServidor}</AlertDescription>
          </Alert>
        )}

        {/* Acciones */}
        <div
          data-tour="config-generar"
          className="sticky bottom-4 z-10 mt-8 flex flex-col gap-3 rounded-xl border bg-card/95 p-3 shadow-[0_12px_32px_-12px_rgb(58_36_24/0.35)] backdrop-blur sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:p-4"
        >
          <GuardarComoCaso
            escenarioId={escenario?.id ?? null}
            tituloSugerido={escenario?.titulo ?? ''}
            promptActual={promptSistema}
            deshabilitado={generando}
            onGuardado={onGuardadaComoCaso}
          />
          <p
            aria-live="polite"
            className="flex min-w-0 flex-1 items-center gap-2 text-sm text-muted-foreground sm:justify-end"
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
                  <span className="font-medium text-foreground">{estudiante.nombre}</span> ·
                  consulta de {duracionMinutos ?? DURACION_CONSULTA_POR_DEFECTO} min · el código
                  vence el {formatearDia(new Date(ahora + vigenciaDias * 86_400_000).toISOString())}
                </span>
              </>
            )}
          </p>
          <Button
            ref={botonGenerar}
            type="submit"
            variant="accion"
            size="lg"
            className="shrink-0"
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
      <CodigoGenerado datos={codigoGenerado} onCerrar={cerrarCodigo} />
    </div>
  );
}

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

type EstadoPaso = 'completado' | 'actual' | 'pendiente';

interface PasoProps {
  numero: number;
  id: string;
  titulo: string;
  descripcion: string;
  estado: EstadoPaso;
  ayuda?: string;
  /** El último paso no dibuja la línea hacia el siguiente. */
  ultimo?: boolean;
  /** `id` de la sección, para poder desplazarse hasta ella. */
  seccionId?: string;
  /** Identificador de foco para el recorrido guiado (`data-tour`). */
  tourId?: string;
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
  ayuda,
  ultimo = false,
  seccionId,
  tourId,
  children,
}: PasoProps) {
  return (
    <section
      id={seccionId}
      data-tour={tourId}
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
          <div className="flex items-center gap-2">
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
            {ayuda && <AyudaContextual etiqueta={`Ayuda sobre ${titulo}`} texto={ayuda} />}
          </div>
          <p className="text-sm text-muted-foreground">{descripcion}</p>
        </div>
        {children}
      </div>
    </section>
  );
}

/**
 * Elección de una opción entre pocas (duración de la consulta, vigencia del código) como píldoras:
 * todas a la vista y con un clic, sin desplegar nada.
 */
function OpcionesEnPildora<T extends number>({
  id,
  titulo,
  nombre,
  opciones,
  valor,
  etiqueta,
  onCambiar,
  deshabilitado,
  ayuda,
}: {
  id: string;
  titulo: string;
  nombre: string;
  opciones: readonly T[];
  valor: T;
  etiqueta: (opcion: T) => string;
  onCambiar: (opcion: T) => void;
  deshabilitado: boolean;
  ayuda: string;
}) {
  return (
    <div role="radiogroup" aria-labelledby={id} className="flex flex-col gap-2">
      <p id={id} className="text-sm font-semibold">
        {titulo}
      </p>
      <div className="flex flex-wrap gap-2">
        {opciones.map(opcion => (
          <label
            key={opcion}
            className={cn(
              'flex min-h-11 cursor-pointer items-center rounded-full border px-4 text-sm transition-colors has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ring has-focus-visible:outline-solid sm:min-h-9',
              valor === opcion
                ? 'border-nogal bg-nogal font-semibold text-lino'
                : 'bg-background hover:bg-muted'
            )}
          >
            <input
              type="radio"
              className="sr-only"
              name={nombre}
              checked={valor === opcion}
              onChange={() => onCambiar(opcion)}
              disabled={deshabilitado}
            />
            {etiqueta(opcion)}
          </label>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">{ayuda}</p>
    </div>
  );
}
