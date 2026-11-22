'use client';

import {
  CheckCircle2,
  ChevronUp,
  CopyPlus,
  FileCode2,
  Lock,
  Plus,
  RotateCcw,
  SlidersHorizontal,
  Trash2,
} from 'lucide-react';
import Link from 'next/link';
import { useId } from 'react';

import { BotonCopiar } from '@/components/asignaciones/boton-copiar';
import { ControlCitado } from '@/components/comun/control-citado';
import { GrupoChips, SelectorOpciones, Sugerencias } from '@/components/casos/selectores';
import { AyudaContextual } from '@/components/comun/ayuda-contextual';
import { Desplegable } from '@/components/comun/desplegable';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  type AjustesPractica,
  EJEMPLOS_INDICACION,
  MAXIMO_INDICACION,
  MAXIMO_SECRETOS_AJUSTE,
  OPCIONES_APERTURA,
  OPCIONES_INTENSIDAD,
  resumenAjustes,
} from '@/lib/casos/ajustes';
import { ACTITUDES, EJEMPLOS_SECRETOS, type IdActitud } from '@/lib/casos/opciones';
import { cn } from '@/lib/utils';
import { LIMITES } from '@/schemas/configuracion.schema';

interface AjustesPacienteProps {
  escenarioId?: string;
  nombre: string;
  ajustes: AjustesPractica;
  onCambio: (ajustes: AjustesPractica) => void;
  /** El docente editó el texto a mano: los ajustes guiados quedan en pausa. */
  textoManual: boolean;
  onRestablecer: () => void;
  onCerrar?: () => void;
  deshabilitado: boolean;
  /** Texto completo actual que recibirá el paciente (se inspecciona y edita en modal). */
  promptActual: string;
  /** Mensaje de validación si el texto completo incumple el largo permitido. */
  promptError?: string;
  onEditarPrompt: (valor: string) => void;
}

/**
 * Ajustar al paciente para una práctica sin escribir instrucciones: botones para lo más común
 * (que se abra más o menos, cuánto se le notan las emociones, una actitud distinta), datos que
 * guarde y una indicación con las propias palabras. Debajo, el resumen de lo que cambiará. El
 * texto completo se abre en un diálogo dedicado para revisarlo o editarlo sin distracciones.
 */
export function AjustesPaciente({
  escenarioId,
  nombre,
  ajustes,
  onCambio,
  textoManual,
  onRestablecer,
  onCerrar,
  deshabilitado,
  promptActual,
  promptError,
  onEditarPrompt,
}: AjustesPacienteProps) {
  const idIndicacion = useId();
  const nombreCorto = nombre.split(' ')[0];
  const resumen = resumenAjustes(ajustes);
  const bloqueado = deshabilitado || textoManual;
  const cambiar = (cambios: Partial<AjustesPractica>) => onCambio({ ...ajustes, ...cambios });
  const sinCambios = !textoManual && resumen.length === 0;
  const palabras = promptActual.trim() ? promptActual.trim().split(/\s+/).length : 0;
  const superaLimite = promptActual.length > LIMITES.prompt.max;
  const estadoTexto = textoManual
    ? 'Editado a mano'
    : resumen.length > 0
      ? `Con ${resumen.length} ${resumen.length === 1 ? 'ajuste rápido' : 'ajustes rápidos'}`
      : 'Texto original del caso';

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl border bg-card motion-safe:animate-in motion-safe:duration-300 motion-safe:ease-salida motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-1">
      <div className="flex flex-wrap items-start justify-between gap-2 border-b bg-muted/35 px-5 py-4">
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-1.5">
            <h3 className="text-base font-bold tracking-[-0.01em]">
              Ajustar a {nombreCorto} para esta práctica
            </h3>
            <AyudaContextual
              etiqueta="Cómo funcionan los ajustes para esta práctica"
              texto="Estos cambios se aplican únicamente al código que generes ahora. Para reutilizarlos más adelante, guárdalos con el botón Guardar como mi caso, en la barra de abajo."
            />
          </div>
          <p className="text-sm text-muted-foreground">
            Solo vale para este código. El estudiante no ve estos ajustes.
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onRestablecer}
            disabled={deshabilitado || sinCambios}
          >
            <RotateCcw aria-hidden />
            Volver al original
          </Button>
          {onCerrar && sinCambios && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onCerrar}
              disabled={deshabilitado}
            >
              <ChevronUp aria-hidden />
              Plegar
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-5 p-5">
        <div>
          <Desplegable abierto={textoManual}>
            <div className="pb-5">
              <p className="rounded-lg bg-ambar-suave px-3.5 py-2.5 text-sm text-ambar">
                Editaste el texto completo a mano, así que los ajustes rápidos están en pausa. Pulsa{' '}
                <ControlCitado icono={<RotateCcw aria-hidden />}>Volver al original</ControlCitado>{' '}
                para usarlos de nuevo.
              </p>
            </div>
          </Desplegable>

          <fieldset disabled={bloqueado} className="flex flex-col gap-5 disabled:opacity-60">
            <div className="grid gap-4 rounded-xl border bg-muted/20 p-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <span className="text-sm font-semibold">¿Qué tan fácil se abre?</span>
                <SelectorOpciones
                  etiqueta="¿Qué tan fácil se abre?"
                  valor={ajustes.apertura}
                  opciones={OPCIONES_APERTURA}
                  onCambio={apertura => cambiar({ apertura })}
                  className="grid-cols-1"
                  deshabilitado={bloqueado}
                />
              </div>
              <div className="flex flex-col gap-2">
                <span className="text-sm font-semibold">¿Cuánto se le notan las emociones?</span>
                <SelectorOpciones
                  etiqueta="¿Cuánto se le notan las emociones?"
                  valor={ajustes.intensidad}
                  opciones={OPCIONES_INTENSIDAD}
                  onCambio={intensidad => cambiar({ intensidad })}
                  className="grid-cols-1"
                  deshabilitado={bloqueado}
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-sm font-semibold">Hoy, además, se muestra… (opcional)</span>
              <GrupoChips
                etiqueta="Actitud adicional en esta práctica"
                opciones={ACTITUDES}
                seleccionadas={ajustes.actitudes}
                onCambio={s => cambiar({ actitudes: s as IdActitud[] })}
                deshabilitado={bloqueado}
              />
            </div>

            <div className="flex flex-col gap-2.5 rounded-xl border bg-muted/20 p-4">
              <div className="flex flex-col gap-0.5">
                <span className="flex items-center gap-2 text-sm font-semibold">
                  <Lock className="size-4 text-salvia" aria-hidden />
                  Algo que guarda en esta práctica (opcional)
                </span>
                <p className="text-xs text-muted-foreground">
                  No lo cuenta de entrada: solo si el estudiante se lo gana durante la conversación.
                </p>
              </div>
              {ajustes.secretos.map((secreto, indice) => {
                const ejemplo = EJEMPLOS_SECRETOS[indice % EJEMPLOS_SECRETOS.length]!;
                const actualizar = (cambios: Partial<typeof secreto>) =>
                  cambiar({
                    secretos: ajustes.secretos.map((s, i) =>
                      i === indice ? { ...s, ...cambios } : s
                    ),
                  });
                return (
                  <div
                    key={indice}
                    className="grid motion-safe:animate-[entrar-desplegado_280ms_var(--ease-salida)_both]"
                  >
                    <div className="min-h-0 overflow-clip [overflow-clip-margin:4px]">
                      <div className="grid gap-2 rounded-lg border bg-card p-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end">
                        <label className="flex flex-col gap-1 text-sm">
                          <span className="font-medium">Qué guarda</span>
                          <Input
                            value={secreto.dato}
                            placeholder={`Ej.: ${ejemplo.dato}`}
                            maxLength={220}
                            onChange={e => actualizar({ dato: e.target.value })}
                          />
                        </label>
                        <label className="flex flex-col gap-1 text-sm">
                          <span className="font-medium">Lo cuenta solo si…</span>
                          <Input
                            value={secreto.condicion}
                            placeholder={`Ej.: ${ejemplo.condicion}`}
                            maxLength={220}
                            onChange={e => actualizar({ condicion: e.target.value })}
                          />
                        </label>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Quitar el dato ${indice + 1}`}
                          onClick={() =>
                            cambiar({ secretos: ajustes.secretos.filter((_, i) => i !== indice) })
                          }
                        >
                          <Trash2 aria-hidden />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
              {ajustes.secretos.length < MAXIMO_SECRETOS_AJUSTE && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-fit"
                  onClick={() =>
                    cambiar({ secretos: [...ajustes.secretos, { dato: '', condicion: '' }] })
                  }
                >
                  <Plus aria-hidden />
                  Añadir algo que guarda
                </Button>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor={idIndicacion} className="text-sm font-semibold">
                Una indicación con tus palabras (opcional)
              </label>
              <Textarea
                id={idIndicacion}
                rows={2}
                maxLength={MAXIMO_INDICACION}
                value={ajustes.indicacion}
                placeholder="Escribe como se lo contarías a un actor: qué le pasó hoy o cómo llega."
                onChange={e => cambiar({ indicacion: e.target.value })}
              />
              <Sugerencias
                etiqueta="Ejemplos de indicaciones"
                sugerencias={EJEMPLOS_INDICACION}
                texto={ajustes.indicacion}
                onAgregar={ejemplo =>
                  cambiar({
                    indicacion: ajustes.indicacion.trim()
                      ? `${ajustes.indicacion.trim()} ${ejemplo}`
                      : ejemplo,
                  })
                }
              />
            </div>
          </fieldset>
        </div>

        <div
          aria-live="polite"
          className={cn(
            'flex flex-col rounded-xl border px-4 py-3.5 text-sm transition-colors duration-300 ease-salida',
            resumen.length > 0 && textoManual === false
              ? 'border-salvia/40 bg-salvia-suave/50'
              : 'border-border bg-muted/40 text-muted-foreground'
          )}
        >
          <p className="flex items-center gap-2 font-semibold text-foreground">
            {resumen.length > 0 && textoManual === false ? (
              <CheckCircle2 className="size-4 text-salvia-oscuro" aria-hidden />
            ) : (
              <SlidersHorizontal className="size-4 text-salvia" aria-hidden />
            )}
            {textoManual
              ? 'Usará el texto que editaste.'
              : resumen.length === 0
                ? `${nombreCorto} se comportará como describe el caso.`
                : `Así cambiará ${nombreCorto} en esta práctica:`}
          </p>
          <Desplegable abierto={textoManual === false && resumen.length > 0}>
            <ul className="flex flex-col gap-0.5 pt-1.5 pl-6 text-foreground">
              {resumen.map(linea => (
                <li key={linea} className="list-disc">
                  {linea}
                </li>
              ))}
            </ul>
          </Desplegable>
        </div>

        <div
          className={cn(
            'flex flex-col gap-2.5 rounded-xl border bg-muted/20 p-4',
            promptError && 'border-destructive/60 bg-destructive/5'
          )}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 flex-col gap-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold text-foreground">
                  Texto completo que recibe la IA
                </span>
                <span
                  className={cn(
                    'rounded-full px-2.5 py-0.5 text-[0.75rem] font-semibold',
                    textoManual
                      ? 'bg-ambar-suave text-ambar'
                      : resumen.length > 0
                        ? 'bg-salvia-suave text-salvia-oscuro'
                        : 'bg-muted text-muted-foreground'
                  )}
                >
                  {estadoTexto}
                </span>
              </div>
              <p className="text-xs text-muted-foreground tabular-nums">
                {palabras.toLocaleString('es-CO')} {palabras === 1 ? 'palabra' : 'palabras'} ·{' '}
                <span className={cn(superaLimite && 'font-semibold text-destructive')}>
                  {promptActual.length.toLocaleString('es-CO')}/
                  {LIMITES.prompt.max.toLocaleString('es-CO')} caracteres
                </span>
              </p>
            </div>

            <Dialog>
              <DialogTrigger asChild>
                <Button type="button" variant="outline" size="sm" disabled={deshabilitado}>
                  <FileCode2 className="text-salvia" aria-hidden />
                  Ver o editar el texto completo (avanzado)
                </Button>
              </DialogTrigger>

              <DialogContent className="flex max-h-[88vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl">
                <DialogHeader className="gap-1.5 border-b bg-muted/35 px-5 py-4 pr-12 text-left sm:px-6 sm:py-5">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <DialogTitle className="flex items-center gap-2 text-lg font-bold tracking-[-0.015em]">
                      <FileCode2 className="size-5 shrink-0 text-salvia-oscuro" aria-hidden />
                      Texto completo de {nombreCorto}
                    </DialogTitle>
                    <span
                      className={cn(
                        'rounded-full px-2.5 py-0.5 text-[0.75rem] font-semibold',
                        textoManual
                          ? 'bg-ambar-suave text-ambar'
                          : resumen.length > 0
                            ? 'bg-salvia-suave text-salvia-oscuro'
                            : 'bg-muted text-muted-foreground'
                      )}
                    >
                      {estadoTexto}
                    </span>
                  </div>
                  <DialogDescription>
                    Es el texto que recibe la IA: la historia del caso y, al final, tus ajustes. Si
                    lo editas a mano, los ajustes rápidos quedan en pausa hasta que vuelvas al
                    original.
                  </DialogDescription>
                </DialogHeader>

                <div className="flex flex-1 flex-col gap-3.5 overflow-y-auto px-5 py-5 sm:px-6">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
                      <Label htmlFor="promptSistema" className="text-sm font-semibold">
                        Comportamiento del paciente
                      </Label>
                      <span
                        className={cn(
                          'text-xs text-muted-foreground tabular-nums',
                          superaLimite && 'font-semibold text-destructive'
                        )}
                      >
                        {palabras.toLocaleString('es-CO')} {palabras === 1 ? 'palabra' : 'palabras'}{' '}
                        · {promptActual.length.toLocaleString('es-CO')}/
                        {LIMITES.prompt.max.toLocaleString('es-CO')}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      <BotonCopiar
                        texto={promptActual}
                        etiqueta="Copiar texto"
                        size="sm"
                        variant="outline"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={onRestablecer}
                        disabled={deshabilitado || sinCambios}
                      >
                        <RotateCcw aria-hidden />
                        Volver al original
                      </Button>
                    </div>
                  </div>

                  <Desplegable abierto={textoManual}>
                    <p className="rounded-lg bg-ambar-suave px-3.5 py-2 text-xs text-ambar">
                      Edición manual activa: los ajustes rápidos del panel están en pausa. Usa{' '}
                      <ControlCitado icono={<RotateCcw aria-hidden />}>
                        Volver al original
                      </ControlCitado>{' '}
                      si quieres reactivarlos.
                    </p>
                  </Desplegable>

                  <Textarea
                    id="promptSistema"
                    rows={15}
                    value={promptActual}
                    onChange={evento => onEditarPrompt(evento.target.value)}
                    disabled={deshabilitado}
                    aria-invalid={promptError ? true : undefined}
                    aria-describedby={promptError ? 'promptSistema-error' : 'promptSistema-nota'}
                    className="min-h-72 flex-1 bg-card font-mono text-[13px] leading-relaxed"
                  />

                  {promptError && (
                    <p id="promptSistema-error" role="alert" className="text-sm text-destructive">
                      {promptError}
                    </p>
                  )}

                  <p id="promptSistema-nota" className="text-xs text-muted-foreground">
                    Las 15 reglas fijas de PsySim se añaden aparte en el servidor; no hace falta
                    repetirlas aquí.
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 border-t bg-muted/25 px-5 py-3.5 sm:px-6">
                  <p className="text-xs text-muted-foreground">
                    Los cambios quedan aplicados solo para esta práctica.
                  </p>
                  <DialogClose asChild>
                    <Button type="button" size="sm">
                      Listo
                    </Button>
                  </DialogClose>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {promptError && (
            <p role="alert" className="text-sm text-destructive">
              {promptError}
            </p>
          )}
        </div>
      </div>

      {escenarioId && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-t bg-muted/25 px-5 py-3 text-xs text-muted-foreground">
          <span>¿Quieres editar toda la historia o cambiar su nivel en el constructor guiado?</span>
          <Link
            href={`/configuracion/casos/nuevo?desde=${escenarioId}`}
            className="inline-flex items-center gap-1 font-semibold text-foreground underline-offset-4 hover:underline"
          >
            <CopyPlus className="size-3.5 text-salvia" aria-hidden />
            Crear caso a partir de este
          </Link>
        </div>
      )}
    </div>
  );
}
