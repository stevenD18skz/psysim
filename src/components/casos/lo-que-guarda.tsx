'use client';

import { Lock, Plus, Trash2 } from 'lucide-react';
import {
  type Control,
  type FieldErrors,
  type UseFormRegister,
  useFieldArray,
} from 'react-hook-form';

import { AyudaContextual } from '@/components/comun/ayuda-contextual';
import { Button } from '@/components/ui/button';
import { Desplegable } from '@/components/comun/desplegable';
import { Input } from '@/components/ui/input';
import { EJEMPLOS_SECRETOS, MAXIMO_SECRETOS } from '@/lib/casos/opciones';
import { type CasoFormData, type CasoFormInput, LIMITES_CASO } from '@/schemas/caso.schema';

interface LoQueGuardaProps {
  control: Control<CasoFormInput, unknown, CasoFormData>;
  register: UseFormRegister<CasoFormInput>;
  errores: FieldErrors<CasoFormInput>['secretos'];
  deshabilitado: boolean;
}

/**
 * «Lo que guarda»: datos que el paciente no cuenta de entrada y la condición para revelarlos. Así
 * el estudiante tiene que ganarse la información con su forma de preguntar, en lugar de que el
 * paciente la suelte sin que se la pidan (queja frecuente en los pacientes simulados con IA).
 */
export function LoQueGuarda({ control, register, errores, deshabilitado }: LoQueGuardaProps) {
  const { fields, append, remove } = useFieldArray({ control, name: 'secretos' });
  const lleno = fields.length >= MAXIMO_SECRETOS;

  return (
    <fieldset className="flex flex-col gap-3" disabled={deshabilitado}>
      <legend className="flex flex-col gap-1">
        <span className="flex items-center gap-2 text-sm font-medium">
          <Lock className="size-4 text-muted-foreground" aria-hidden />
          Lo que guarda (opcional)
          <AyudaContextual
            etiqueta="Para qué sirve Lo que guarda"
            texto="Evita que el paciente cuente toda su historia en la primera respuesta. Cada dato queda oculto hasta que el estudiante cumple la condición que definas (por ejemplo, validar su emoción o preguntar con calma)."
          />
        </span>
        <span className="text-sm text-muted-foreground">
          Datos que no cuenta de entrada. Solo los revela si el estudiante se los gana.
        </span>
      </legend>

      {fields.length > 0 && (
        <ol className="flex flex-col gap-3">
          {fields.map((campo, indice) => {
            const error = errores?.[indice];
            const ejemplo = EJEMPLOS_SECRETOS[indice % EJEMPLOS_SECRETOS.length]!;
            return (
              <li
                key={campo.id}
                className="grid motion-safe:animate-[entrar-desplegado_280ms_var(--ease-salida)_both]"
              >
                <div className="min-h-0 overflow-clip [overflow-clip-margin:4px]">
                  <div className="grid gap-2 rounded-lg border bg-muted/30 p-3 sm:grid-cols-[minmax(0,1fr)_auto]">
                    <div className="flex flex-col gap-2">
                      <label className="flex flex-col gap-1 text-sm">
                        <span className="font-medium">Dato {indice + 1}</span>
                        <Input
                          placeholder={`Ej.: ${ejemplo.dato}`}
                          maxLength={LIMITES_CASO.secreto.max}
                          aria-invalid={error?.dato ? true : undefined}
                          {...register(`secretos.${indice}.dato`)}
                        />
                        {error?.dato?.message && (
                          <span className="text-sm text-destructive">{error.dato.message}</span>
                        )}
                      </label>
                      <label className="flex flex-col gap-1 text-sm">
                        <span className="font-medium">Lo cuenta solo si…</span>
                        <Input
                          placeholder={`Ej.: ${ejemplo.condicion}`}
                          maxLength={LIMITES_CASO.secreto.max}
                          aria-invalid={error?.condicion ? true : undefined}
                          {...register(`secretos.${indice}.condicion`)}
                        />
                        {error?.condicion?.message && (
                          <span className="text-sm text-destructive">
                            {error.condicion.message}
                          </span>
                        )}
                      </label>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className="justify-self-end sm:mt-6"
                      onClick={() => remove(indice)}
                      aria-label={`Quitar el dato ${indice + 1}`}
                    >
                      <Trash2 aria-hidden />
                    </Button>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      )}

      <div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-fit"
          onClick={() => append({ dato: '', condicion: '' })}
          disabled={lleno}
        >
          <Plus aria-hidden />
          {fields.length === 0 ? 'Añadir un dato que guarda' : 'Añadir otro dato'}
        </Button>
        <Desplegable abierto={lleno}>
          <p className="pt-2 text-sm text-muted-foreground">
            Hasta {MAXIMO_SECRETOS} datos: más hacen al paciente difícil de seguir.
          </p>
        </Desplegable>
      </div>
    </fieldset>
  );
}
