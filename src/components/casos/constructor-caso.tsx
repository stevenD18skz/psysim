'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  CircleDashed,
  Lightbulb,
  Loader2,
  Pencil,
  Save,
  Wand2,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { useForm, useWatch } from 'react-hook-form';

import { useBorrador } from '@/hooks/use-borrador';
import { formatearFechaHora } from '@/lib/estudiantes/estudiantes';
import { toast } from 'sonner';

import { FichaPaciente } from '@/components/casos/ficha-paciente';
import { LoQueGuarda } from '@/components/casos/lo-que-guarda';
import { ProbarPaciente } from '@/components/casos/probar-paciente';
import { ReglasFijas } from '@/components/casos/reglas-fijas';
import { GrupoChips, SelectorOpciones, Sugerencias } from '@/components/casos/selectores';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { actualizarCaso, crearCaso } from '@/lib/casos/actions';
import { componerPrompt } from '@/lib/casos/componer-prompt';
import {
  camposFaltantes,
  COMPETENCIAS_FRECUENTES,
  EJEMPLOS_CASO,
  type EjemploCaso,
  FRASES_APERTURA,
} from '@/lib/casos/ejemplos';
import {
  ACTITUDES,
  CONSULTORIOS,
  NIVELES_RIESGO,
  SINTOMAS,
  SUGERENCIAS_SE_ABRE,
  SUGERENCIAS_SE_CIERRA,
} from '@/lib/casos/opciones';
import { valoresVacios } from '@/lib/casos/valores';
import { ETIQUETA_CATEGORIA, ETIQUETA_DIFICULTAD } from '@/lib/escenarios/etiquetas';
import { cn } from '@/lib/utils';
import {
  type CamposCaso,
  type CasoFormData,
  type CasoFormInput,
  casoFormSchema,
  LIMITES_CASO,
} from '@/schemas/caso.schema';
import { promptSchema } from '@/schemas/configuracion.schema';

interface ConstructorCasoProps {
  /** Si se indica, el formulario edita ese caso; si no, crea uno nuevo. */
  casoId?: string;
  valoresIniciales?: CasoFormInput;
}

const OPCIONES_CATEGORIA = (['clinico', 'cotidiano'] as const).map(valor => ({
  valor,
  etiqueta: ETIQUETA_CATEGORIA[valor],
}));
const OPCIONES_DIFICULTAD = (['basico', 'intermedio', 'avanzado'] as const).map(valor => ({
  valor,
  etiqueta: ETIQUETA_DIFICULTAD[valor],
}));

/**
 * Constructor guiado de casos. El docente completa campos cortos (con chips como atajo) y el
 * prompt del paciente se arma solo; si prefiere, puede pasar a redactarlo como texto. Las reglas
 * de seguridad comunes las añade siempre el servidor.
 */
export function ConstructorCaso({ casoId, valoresIniciales }: ConstructorCasoProps) {
  const router = useRouter();
  const [errorServidor, setErrorServidor] = useState<string | null>(null);
  const [confirmandoVolver, setConfirmandoVolver] = useState(false);
  const [guardando, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    setValue,
    getValues,
    reset,
    control,
    formState: { errors, isSubmitted, isDirty },
  } = useForm<CasoFormInput, unknown, CasoFormData>({
    resolver: zodResolver(casoFormSchema),
    mode: 'onTouched',
    defaultValues: valoresIniciales ?? valoresVacios(),
  });

  const valores = useWatch({ control });
  // Un caso se escribe en varios minutos: se guarda un borrador y se avisa antes de perderlo.
  const { borrador, descartar, limpiar } = useBorrador({
    clave: `psysim:borrador-caso:${casoId ?? 'nuevo'}`,
    valores,
    sucio: isDirty,
  });
  const restaurarBorrador = () => {
    if (!borrador) return;
    reset({ ...valoresVacios(), ...(borrador.valores as Partial<CasoFormInput>) });
    descartar();
    toast.success('Recuperamos tu borrador.');
  };
  const modoTexto = valores.modoTexto === true;

  // `setValue` con claves dinámicas no infiere el tipo de cada campo: el tipado fino está en el esquema.
  const actualizar = <K extends keyof CasoFormInput>(campo: K, valor: CasoFormInput[K]) =>
    setValue(campo, valor as never, { shouldDirty: true, shouldValidate: isSubmitted });

  const camposActuales: CamposCaso = {
    nombre: valores.nombre ?? '',
    edad: Number(valores.edad),
    ocupacion: valores.ocupacion ?? '',
    situacion: valores.situacion ?? '',
    sintomas: (valores.sintomas ?? []) as CasoFormInput['sintomas'],
    sintomasExtra: valores.sintomasExtra ?? '',
    actitudes: (valores.actitudes ?? []) as CasoFormInput['actitudes'],
    seAbreSi: valores.seAbreSi ?? '',
    seCierraSi: valores.seCierraSi ?? '',
    riesgo: valores.riesgo ?? 'ninguno',
    fraseApertura: valores.fraseApertura ?? '',
    notas: valores.notas ?? '',
    secretos: (valores.secretos ?? []).map(s => ({
      dato: s?.dato ?? '',
      condicion: s?.condicion ?? '',
    })),
  };
  const promptCompuesto = componerPrompt(camposActuales);
  const faltantes = camposFaltantes(valores as Partial<CasoFormInput>);
  // Los ejemplos solo se ofrecen al crear, mientras el paciente aún no tiene identidad.
  const ofrecerEjemplos =
    !casoId && !(valores.nombre ?? '').trim() && !(valores.situacion ?? '').trim();

  const usarEjemplo = (ejemplo: EjemploCaso) => {
    reset({ ...valoresVacios(), ...ejemplo.valores }, { keepDefaultValues: true });
    toast.success(`Cargamos el ejemplo «${ejemplo.etiqueta}». Cámbialo a tu medida.`);
  };

  /** Lleva al campo que falta (y lo enfoca), desde la lista de pendientes. */
  const irACampo = (campo: string) => {
    const elemento = document.getElementById(campo);
    elemento?.scrollIntoView?.({ block: 'center' });
    elemento?.focus({ preventScroll: true });
  };
  const promptActual = modoTexto ? (valores.promptManual ?? '') : promptCompuesto;
  // En modo guiado la prueba espera a lo mínimo para que el paciente tenga identidad y situación.
  const promptValido =
    promptSchema.safeParse(promptActual).success &&
    (modoTexto ||
      ((valores.nombre ?? '').trim() !== '' &&
        (valores.situacion ?? '').trim().length >= LIMITES_CASO.situacion.min));

  const agregarFrase = (campo: 'seAbreSi' | 'seCierraSi', frase: string) => {
    const actual = (getValues(campo) ?? '').trim().replace(/[.,;\s]+$/, '');
    actualizar(campo, actual ? `${actual}; ${frase}` : frase);
  };

  const pasarAModoTexto = () => {
    actualizar('promptManual', promptCompuesto);
    actualizar('modoTexto', true);
  };

  const volverAlConstructor = () => {
    actualizar('modoTexto', false);
    setConfirmandoVolver(false);
  };

  // Si el texto no se tocó respecto al compuesto, volver no pierde nada.
  const solicitarVolver = () => {
    if ((valores.promptManual ?? '').trim() === promptCompuesto.trim()) volverAlConstructor();
    else setConfirmandoVolver(true);
  };

  const onSubmit = (datos: CasoFormData) => {
    setErrorServidor(null);
    startTransition(async () => {
      const resultado = casoId
        ? await actualizarCaso({ id: casoId, caso: datos })
        : await crearCaso(datos);
      if (!resultado.ok) {
        setErrorServidor(resultado.error);
        return;
      }
      limpiar();
      toast.success(casoId ? 'Caso actualizado.' : `Caso «${datos.titulo}» guardado en Mis casos.`);
      router.push(`/configuracion?caso=${resultado.datos.id}`);
      router.refresh();
    });
  };

  return (
    <form
      noValidate
      onSubmit={handleSubmit(onSubmit)}
      aria-label={casoId ? 'Editar caso' : 'Crear caso'}
      className="grid items-start gap-8 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]"
    >
      <div className="flex flex-col gap-8">
        {borrador && (
          <div
            role="status"
            className="flex flex-col gap-3 rounded-2xl border border-laton/60 bg-ambar-suave p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <p className="text-sm">
              <span className="font-semibold">Tienes un borrador sin guardar</span> de{' '}
              {formatearFechaHora(borrador.guardadoEn)}. ¿Quieres retomarlo?
            </p>
            <div className="flex gap-2">
              <Button type="button" size="sm" variant="outline" onClick={descartar}>
                Descartar
              </Button>
              <Button type="button" size="sm" onClick={restaurarBorrador}>
                Recuperar borrador
              </Button>
            </div>
          </div>
        )}
        {ofrecerEjemplos && (
          <section
            aria-labelledby="ejemplos-titulo"
            className="flex flex-col gap-3 rounded-2xl border border-dashed border-salvia/50 bg-salvia-suave/35 p-5"
          >
            <div className="flex items-start gap-3">
              <Lightbulb className="mt-0.5 size-5 shrink-0 text-salvia-oscuro" aria-hidden />
              <div className="flex flex-col gap-0.5">
                <h2 id="ejemplos-titulo" className="text-base font-semibold">
                  ¿Primera vez? Empieza desde un ejemplo
                </h2>
                <p className="text-sm text-muted-foreground">
                  Llenamos todos los campos con un caso completo; luego cambias lo que quieras. No
                  necesitas saber escribir instrucciones para una IA.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 pl-8">
              {EJEMPLOS_CASO.map(ejemplo => (
                <Button
                  key={ejemplo.id}
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-auto flex-col items-start gap-0 bg-card py-1.5"
                  onClick={() => usarEjemplo(ejemplo)}
                  disabled={guardando}
                >
                  <span>{ejemplo.etiqueta}</span>
                  <span className="text-xs font-normal text-muted-foreground">
                    {ejemplo.detalle}
                  </span>
                </Button>
              ))}
            </div>
          </section>
        )}

        {/* 1 — El caso */}
        <Seccion
          numero={1}
          titulo="El caso"
          descripcion="Cómo se presenta en tu lista y qué se entrena."
        >
          <Campo id="titulo" etiqueta="Título del caso" error={errors.titulo?.message}>
            <Input
              id="titulo"
              placeholder="Ej.: Duelo por la pérdida de un hijo"
              maxLength={LIMITES_CASO.titulo.max}
              disabled={guardando}
              aria-invalid={errors.titulo ? true : undefined}
              {...register('titulo')}
            />
          </Campo>
          <div className="grid gap-4 sm:grid-cols-2">
            <Campo etiqueta="Categoría" error={errors.categoria?.message}>
              <SelectorOpciones
                etiqueta="Categoría"
                valor={valores.categoria}
                opciones={OPCIONES_CATEGORIA}
                onCambio={v => actualizar('categoria', v)}
                className="grid-cols-2"
                deshabilitado={guardando}
              />
            </Campo>
            <Campo etiqueta="Nivel de dificultad" error={errors.dificultad?.message}>
              <SelectorOpciones
                etiqueta="Nivel de dificultad"
                valor={valores.dificultad}
                opciones={OPCIONES_DIFICULTAD}
                onCambio={v => actualizar('dificultad', v)}
                className="grid-cols-3"
                deshabilitado={guardando}
              />
            </Campo>
          </div>
          <Campo
            id="competenciaCentral"
            etiqueta="Competencia que se entrena"
            error={errors.competenciaCentral?.message}
          >
            <Input
              id="competenciaCentral"
              placeholder="Ej.: Empatía y validación emocional"
              maxLength={LIMITES_CASO.competencia.max}
              disabled={guardando}
              aria-invalid={errors.competenciaCentral ? true : undefined}
              {...register('competenciaCentral')}
            />
            <Opciones
              etiqueta="Competencias frecuentes"
              opciones={COMPETENCIAS_FRECUENTES}
              actual={valores.competenciaCentral ?? ''}
              onElegir={c => actualizar('competenciaCentral', c)}
            />
          </Campo>
          <Campo
            etiqueta="Consultorio"
            ayuda="Cada consultorio incluye el aspecto del paciente."
            error={errors.consultorio?.message}
          >
            <SelectorOpciones
              etiqueta="Consultorio"
              valor={valores.consultorio}
              opciones={CONSULTORIOS.map(c => ({
                valor: c.ruta,
                etiqueta: c.nombre,
                detalle: c.detalle,
              }))}
              onCambio={v => actualizar('consultorio', v)}
              className="sm:grid-cols-2"
              deshabilitado={guardando}
            />
          </Campo>
        </Seccion>

        {/* 2 — El paciente */}
        <Seccion numero={2} titulo="El paciente" descripcion="Quién es y por qué llega a consulta.">
          <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
            <Campo id="nombre" etiqueta="Nombre" error={errors.nombre?.message}>
              <Input
                id="nombre"
                autoComplete="off"
                placeholder="Ej.: Marta Lucía"
                maxLength={LIMITES_CASO.nombre.max}
                disabled={guardando}
                aria-invalid={errors.nombre ? true : undefined}
                {...register('nombre')}
              />
            </Campo>
            <Campo id="edad" etiqueta="Edad" error={errors.edad?.message}>
              <Input
                id="edad"
                type="number"
                inputMode="numeric"
                min={LIMITES_CASO.edad.min}
                max={LIMITES_CASO.edad.max}
                disabled={guardando}
                aria-invalid={errors.edad ? true : undefined}
                {...register('edad', { valueAsNumber: true })}
              />
            </Campo>
          </div>
          <Campo id="ocupacion" etiqueta="Ocupación (opcional)" error={errors.ocupacion?.message}>
            <Input
              id="ocupacion"
              placeholder="Ej.: docente de primaria jubilada"
              maxLength={LIMITES_CASO.ocupacion.max}
              disabled={guardando}
              {...register('ocupacion')}
            />
          </Campo>
          <Campo
            id="situacion"
            etiqueta="Situación y motivo de consulta"
            ayuda="Qué le pasó y qué la trae hoy. También es la descripción del caso en tu lista."
            error={errors.situacion?.message}
            contador={`${(valores.situacion ?? '').length}/${LIMITES_CASO.situacion.max}`}
          >
            <Textarea
              id="situacion"
              rows={4}
              maxLength={LIMITES_CASO.situacion.max + 50}
              disabled={guardando}
              aria-invalid={errors.situacion ? true : undefined}
              {...register('situacion')}
            />
          </Campo>
        </Seccion>

        {/* 3 y 4 — Solo en modo guiado */}
        {modoTexto ? (
          <Alert>
            <Pencil aria-hidden />
            <AlertDescription>
              El comportamiento de este caso está escrito como texto, en el panel de la derecha: los
              síntomas, la actitud, el riesgo y la frase de apertura no se aplican hasta que vuelvas
              al constructor. ¿Prefieres no escribir? Asigna el caso y usa «Ajustar para esta
              práctica»: cambias su comportamiento con botones.
            </AlertDescription>
          </Alert>
        ) : (
          <>
            <Seccion
              numero={3}
              titulo="Cómo se presenta"
              descripcion="Elige lo que aplique; puedes añadir lo que falte con tus palabras."
            >
              <Campo etiqueta="Síntomas y malestar">
                <GrupoChips
                  etiqueta="Síntomas y malestar"
                  opciones={SINTOMAS}
                  seleccionadas={valores.sintomas ?? []}
                  onCambio={s => actualizar('sintomas', s as CasoFormInput['sintomas'])}
                  deshabilitado={guardando}
                />
                <Input
                  aria-label="Otros síntomas"
                  placeholder="Otros síntomas o detalles (opcional)"
                  maxLength={LIMITES_CASO.extra.max}
                  disabled={guardando}
                  {...register('sintomasExtra')}
                />
              </Campo>
              <Campo etiqueta="Actitud en la consulta">
                <GrupoChips
                  etiqueta="Actitud en la consulta"
                  opciones={ACTITUDES}
                  seleccionadas={valores.actitudes ?? []}
                  onCambio={s => actualizar('actitudes', s as CasoFormInput['actitudes'])}
                  deshabilitado={guardando}
                />
              </Campo>
              <div className="grid gap-4 sm:grid-cols-2">
                <Campo id="seAbreSi" etiqueta="Se abre cuando…" error={errors.seAbreSi?.message}>
                  <Textarea
                    id="seAbreSi"
                    rows={3}
                    maxLength={LIMITES_CASO.extra.max + 50}
                    disabled={guardando}
                    {...register('seAbreSi')}
                  />
                  <Sugerencias
                    etiqueta="Sugerencias para cuando se abre"
                    sugerencias={SUGERENCIAS_SE_ABRE}
                    texto={valores.seAbreSi ?? ''}
                    onAgregar={f => agregarFrase('seAbreSi', f)}
                  />
                </Campo>
                <Campo
                  id="seCierraSi"
                  etiqueta="Se cierra cuando…"
                  error={errors.seCierraSi?.message}
                >
                  <Textarea
                    id="seCierraSi"
                    rows={3}
                    maxLength={LIMITES_CASO.extra.max + 50}
                    disabled={guardando}
                    {...register('seCierraSi')}
                  />
                  <Sugerencias
                    etiqueta="Sugerencias para cuando se cierra"
                    sugerencias={SUGERENCIAS_SE_CIERRA}
                    texto={valores.seCierraSi ?? ''}
                    onAgregar={f => agregarFrase('seCierraSi', f)}
                  />
                </Campo>
              </div>
              <Campo
                etiqueta="Nivel de riesgo"
                ayuda="Define cómo representa el paciente los temas de riesgo. Nunca describirá métodos."
              >
                <SelectorOpciones
                  etiqueta="Nivel de riesgo"
                  valor={valores.riesgo}
                  opciones={NIVELES_RIESGO.map(r => ({
                    valor: r.id,
                    etiqueta: r.etiqueta,
                    detalle: r.descripcion,
                  }))}
                  onCambio={v => actualizar('riesgo', v)}
                  className="sm:grid-cols-2"
                  deshabilitado={guardando}
                />
              </Campo>
            </Seccion>

            <Seccion
              numero={4}
              titulo="Cómo empieza y qué guarda"
              descripcion="La primera impresión del estudiante y lo que tendrá que ganarse."
            >
              <Campo
                id="fraseApertura"
                etiqueta="Frase de apertura"
                ayuda="Lo primero que dirá el paciente."
                error={errors.fraseApertura?.message}
              >
                <Textarea
                  id="fraseApertura"
                  rows={2}
                  maxLength={LIMITES_CASO.fraseApertura.max + 50}
                  placeholder="Ej.: Buenas… la verdad no sé muy bien por dónde empezar."
                  disabled={guardando}
                  aria-invalid={errors.fraseApertura ? true : undefined}
                  {...register('fraseApertura')}
                />
                <Opciones
                  etiqueta="Frases de apertura de ejemplo"
                  opciones={FRASES_APERTURA}
                  actual={valores.fraseApertura ?? ''}
                  onElegir={f => actualizar('fraseApertura', f)}
                />
              </Campo>
              <Campo
                id="notas"
                etiqueta="Información adicional (opcional)"
                ayuda="Antecedentes, relaciones y contexto que puede mencionar si viene al caso."
                error={errors.notas?.message}
              >
                <Textarea
                  id="notas"
                  rows={3}
                  maxLength={LIMITES_CASO.notas.max + 50}
                  disabled={guardando}
                  {...register('notas')}
                />
              </Campo>
              <LoQueGuarda
                control={control}
                register={register}
                errores={errors.secretos}
                deshabilitado={guardando}
              />
            </Seccion>
          </>
        )}
      </div>

      {/* Panel derecho: vista previa, reglas, prueba y guardado */}
      <aside className="flex flex-col gap-4 lg:sticky lg:top-6">
        <div className="flex flex-col gap-3 rounded-2xl border bg-card p-4 shadow-xs">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-semibold">
              {modoTexto ? 'Comportamiento del paciente (texto)' : 'Así será tu paciente'}
            </h2>
            {modoTexto && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="ml-auto"
                onClick={solicitarVolver}
                disabled={guardando}
              >
                <Wand2 aria-hidden />
                Volver al constructor
              </Button>
            )}
          </div>

          {confirmandoVolver && (
            <Alert role="alert">
              <AlertCircle aria-hidden />
              <AlertDescription className="flex flex-col gap-2">
                Los cambios que hiciste al texto se descartarán y el comportamiento se volverá a
                armar con los campos.
                <span className="flex gap-2">
                  <Button type="button" size="sm" onClick={volverAlConstructor}>
                    Descartar y volver
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => setConfirmandoVolver(false)}
                  >
                    Seguir editando
                  </Button>
                </span>
              </AlertDescription>
            </Alert>
          )}

          {modoTexto ? (
            <>
              <Label htmlFor="promptManual" className="sr-only">
                Comportamiento del paciente
              </Label>
              <Textarea
                id="promptManual"
                rows={14}
                className="max-h-96 min-h-56 font-mono text-[13px] leading-relaxed"
                disabled={guardando}
                aria-invalid={errors.promptManual ? true : undefined}
                {...register('promptManual')}
              />
              {errors.promptManual && (
                <p role="alert" className="text-sm text-destructive">
                  {errors.promptManual.message}
                </p>
              )}
            </>
          ) : (
            <>
              <FichaPaciente campos={camposActuales} />
              {/* El texto técnico queda para quien quiera verlo o escribirlo a mano. */}
              <details className="group/texto rounded-lg border">
                <summary className="flex cursor-pointer list-none items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium outline-hidden hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
                  Ver el texto que recibe la IA
                  <ChevronDown
                    className="ml-auto size-4 text-muted-foreground transition-transform group-open/texto:rotate-180"
                    aria-hidden
                  />
                </summary>
                <div className="flex flex-col gap-2 border-t p-3">
                  <pre
                    tabIndex={0}
                    aria-label="Comportamiento generado"
                    className="max-h-80 overflow-auto rounded-lg bg-muted/50 p-3 font-mono text-[12.5px] leading-relaxed break-words whitespace-pre-wrap"
                  >
                    {promptCompuesto}
                  </pre>
                  <p className="text-xs text-muted-foreground">
                    Se arma solo con lo que eliges a la izquierda. Si prefieres redactarlo tú:
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-fit"
                    onClick={pasarAModoTexto}
                    disabled={guardando}
                  >
                    <Pencil aria-hidden />
                    Editar como texto (avanzado)
                  </Button>
                </div>
              </details>
            </>
          )}
          {modoTexto && (
            <p
              className={cn(
                'text-right text-xs text-muted-foreground tabular-nums',
                promptActual.length > 8000 && 'text-destructive'
              )}
            >
              {promptActual.length.toLocaleString('es-CO')}/8.000
            </p>
          )}
          <ReglasFijas />
        </div>

        <ProbarPaciente
          prompt={promptActual}
          nombre={valores.nombre ?? ''}
          promptValido={promptValido}
        />

        {errorServidor && (
          <Alert variant="destructive" role="alert">
            <AlertCircle aria-hidden />
            <AlertDescription>{errorServidor}</AlertDescription>
          </Alert>
        )}

        {faltantes.length > 0 ? (
          <div className="flex flex-col gap-2 rounded-xl border bg-card p-4 text-sm">
            <p className="font-semibold">
              Para guardar te falta{faltantes.length === 1 ? '' : 'n'} {faltantes.length}{' '}
              {faltantes.length === 1 ? 'dato' : 'datos'}:
            </p>
            <ul className="flex flex-col gap-1">
              {faltantes.map(({ campo, texto }) => (
                <li key={campo}>
                  <button
                    type="button"
                    onClick={() => irACampo(campo)}
                    className="flex min-h-7 items-center gap-2 rounded-md text-left text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-hidden"
                  >
                    <CircleDashed className="size-4 shrink-0" aria-hidden />
                    {texto}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="flex items-center gap-2 rounded-xl bg-salvia-suave/60 px-4 py-3 text-sm font-medium text-salvia-oscuro">
            <CheckCircle2 className="size-4 shrink-0" aria-hidden />
            Todo listo. Pruébalo arriba antes de guardar, si quieres.
          </p>
        )}

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button asChild variant="outline" size="lg">
            <Link href="/configuracion/casos">
              <ArrowLeft aria-hidden />
              Cancelar
            </Link>
          </Button>
          <Button type="submit" size="lg" disabled={guardando} aria-busy={guardando}>
            {guardando ? <Loader2 className="animate-spin" aria-hidden /> : <Save aria-hidden />}
            {guardando ? 'Guardando…' : casoId ? 'Guardar cambios' : 'Guardar caso'}
          </Button>
        </div>
      </aside>
    </form>
  );
}

/** Valores sugeridos para un campo de texto corto: un clic los pone en el campo. */
function Opciones({
  etiqueta,
  opciones,
  actual,
  onElegir,
}: {
  etiqueta: string;
  opciones: readonly string[];
  actual: string;
  onElegir: (opcion: string) => void;
}) {
  return (
    <div role="group" aria-label={etiqueta} className="flex flex-wrap gap-1.5">
      {opciones.map(opcion => {
        const elegida = actual.trim() === opcion;
        return (
          <button
            key={opcion}
            type="button"
            aria-pressed={elegida}
            onClick={() => onElegir(opcion)}
            className={cn(
              'min-h-7 rounded-full border px-2.5 py-1 text-xs transition-colors focus-visible:ring-3 focus-visible:ring-ring focus-visible:outline-hidden',
              elegida
                ? 'border-nogal bg-nogal text-lino'
                : 'border-dashed text-muted-foreground hover:border-nogal/50 hover:bg-muted hover:text-foreground'
            )}
          >
            {opcion}
          </button>
        );
      })}
    </div>
  );
}

function Seccion({
  numero,
  titulo,
  descripcion,
  children,
}: {
  numero: number;
  titulo: string;
  descripcion: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-nogal text-sm font-semibold text-lino"
        >
          {numero}
        </span>
        <div>
          <h2 className="text-xl font-semibold tracking-tight">{titulo}</h2>
          <p className="text-sm text-muted-foreground">{descripcion}</p>
        </div>
      </div>
      <div className="flex flex-col gap-4 rounded-2xl border bg-card p-5 shadow-xs">{children}</div>
    </section>
  );
}

function Campo({
  id,
  etiqueta,
  ayuda,
  error,
  contador,
  children,
}: {
  id?: string;
  etiqueta: string;
  ayuda?: string;
  error?: string;
  contador?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-2">
        {id ? (
          <Label htmlFor={id}>{etiqueta}</Label>
        ) : (
          <span className="text-sm font-medium">{etiqueta}</span>
        )}
        {contador && <span className="text-xs text-muted-foreground tabular-nums">{contador}</span>}
      </div>
      {ayuda && <p className="-mt-1 text-xs text-muted-foreground">{ayuda}</p>}
      {children}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
