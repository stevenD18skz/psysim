'use client';

import { ChevronDown, Lock, Plus, RotateCcw, Sparkles, Trash2 } from 'lucide-react';
import { useId } from 'react';

import { GrupoChips, SelectorOpciones, Sugerencias } from '@/components/casos/selectores';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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

interface AjustesPacienteProps {
  nombre: string;
  ajustes: AjustesPractica;
  onCambio: (ajustes: AjustesPractica) => void;
  /** El docente editó el texto a mano: los ajustes guiados quedan en pausa. */
  textoManual: boolean;
  onRestablecer: () => void;
  deshabilitado: boolean;
  /** El texto completo (avanzado), para quien prefiera escribirlo. */
  editorTexto: React.ReactNode;
}

/**
 * Ajustar al paciente para una práctica sin escribir instrucciones: botones para lo más común
 * (que se abra más o menos, cuánto se le notan las emociones, una actitud distinta), datos que
 * guarde y una indicación con las propias palabras. Debajo, el resumen de lo que cambiará. El
 * texto completo queda plegado como opción avanzada.
 */
export function AjustesPaciente({
  nombre,
  ajustes,
  onCambio,
  textoManual,
  onRestablecer,
  deshabilitado,
  editorTexto,
}: AjustesPacienteProps) {
  const idIndicacion = useId();
  const nombreCorto = nombre.split(' ')[0];
  const resumen = resumenAjustes(ajustes);
  const bloqueado = deshabilitado || textoManual;
  const cambiar = (cambios: Partial<AjustesPractica>) => onCambio({ ...ajustes, ...cambios });

  return (
    <div className="flex flex-col gap-5 rounded-xl border bg-card p-5">
      <div className="flex flex-wrap items-start gap-2">
        <div className="flex flex-col gap-0.5">
          <h3 className="text-base font-semibold">Ajustar a {nombreCorto} para esta práctica</h3>
          <p className="text-sm text-muted-foreground">
            Solo vale para este código. El estudiante no ve estos ajustes.
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="ml-auto"
          onClick={onRestablecer}
          disabled={deshabilitado || (!textoManual && resumen.length === 0)}
        >
          <RotateCcw aria-hidden />
          Volver al original
        </Button>
      </div>

      {textoManual && (
        <p className="rounded-lg bg-ambar-suave px-3 py-2 text-sm text-ambar">
          Editaste el texto completo a mano, así que los ajustes rápidos están en pausa. Pulsa
          «Volver al original» para usarlos de nuevo.
        </p>
      )}

      <fieldset disabled={bloqueado} className="flex flex-col gap-5 disabled:opacity-60">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium">¿Qué tan fácil se abre?</span>
            <SelectorOpciones
              etiqueta="¿Qué tan fácil se abre?"
              valor={ajustes.apertura}
              opciones={OPCIONES_APERTURA}
              onCambio={apertura => cambiar({ apertura })}
              className="grid-cols-3"
              deshabilitado={bloqueado}
            />
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium">¿Cuánto se le notan las emociones?</span>
            <SelectorOpciones
              etiqueta="¿Cuánto se le notan las emociones?"
              valor={ajustes.intensidad}
              opciones={OPCIONES_INTENSIDAD}
              onCambio={intensidad => cambiar({ intensidad })}
              className="grid-cols-3"
              deshabilitado={bloqueado}
            />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium">Hoy, además, se muestra… (opcional)</span>
          <GrupoChips
            etiqueta="Actitud adicional en esta práctica"
            opciones={ACTITUDES}
            seleccionadas={ajustes.actitudes}
            onCambio={s => cambiar({ actitudes: s as IdActitud[] })}
            deshabilitado={bloqueado}
          />
        </div>

        <div className="flex flex-col gap-2">
          <span className="flex items-center gap-2 text-sm font-medium">
            <Lock className="size-4 text-muted-foreground" aria-hidden />
            Algo que guarda en esta práctica (opcional)
          </span>
          <p className="-mt-1 text-xs text-muted-foreground">
            No lo cuenta de entrada: solo si el estudiante se lo gana.
          </p>
          {ajustes.secretos.map((secreto, indice) => {
            const ejemplo = EJEMPLOS_SECRETOS[indice % EJEMPLOS_SECRETOS.length]!;
            const actualizar = (cambios: Partial<typeof secreto>) =>
              cambiar({
                secretos: ajustes.secretos.map((s, i) => (i === indice ? { ...s, ...cambios } : s)),
              });
            return (
              <div
                key={indice}
                className="grid gap-2 rounded-lg border bg-muted/30 p-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end"
              >
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
          <label htmlFor={idIndicacion} className="text-sm font-medium">
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

      <div
        aria-live="polite"
        className={cn(
          'flex flex-col gap-1.5 rounded-lg border-l-4 px-4 py-3 text-sm',
          resumen.length > 0 && !textoManual
            ? 'border-salvia bg-salvia-suave/50'
            : 'border-border bg-muted/40 text-muted-foreground'
        )}
      >
        <p className="flex items-center gap-2 font-semibold">
          <Sparkles className="size-4" aria-hidden />
          {textoManual
            ? 'Usará el texto que editaste.'
            : resumen.length === 0
              ? `${nombreCorto} se comportará como describe el caso.`
              : `Así cambiará ${nombreCorto} en esta práctica:`}
        </p>
        {!textoManual && resumen.length > 0 && (
          <ul className="flex flex-col gap-0.5 pl-6">
            {resumen.map(linea => (
              <li key={linea} className="list-disc">
                {linea}
              </li>
            ))}
          </ul>
        )}
      </div>

      <details className="group/avanzado rounded-lg border">
        <summary className="flex cursor-pointer list-none items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium outline-hidden hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
          Ver o editar el texto completo (avanzado)
          <ChevronDown
            className="ml-auto size-4 text-muted-foreground transition-transform group-open/avanzado:rotate-180"
            aria-hidden
          />
        </summary>
        <div className="flex flex-col gap-2 border-t p-4">
          <p className="text-xs text-muted-foreground">
            Es lo que recibe la IA: el caso y, al final, tus ajustes. Si lo editas a mano, los
            ajustes rápidos quedan en pausa.
          </p>
          {editorTexto}
        </div>
      </details>
    </div>
  );
}
