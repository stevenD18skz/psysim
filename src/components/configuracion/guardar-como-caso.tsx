'use client';

import { Check, Loader2, Save, X } from 'lucide-react';
import { useId, useRef, useState, useTransition } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { guardarVariante } from '@/lib/casos/actions';
import { guardarVarianteSchema, LIMITES_CASO } from '@/schemas/caso.schema';

interface GuardarComoCasoProps {
  escenarioId: string | null;
  /** Título del caso de origen: se propone como punto de partida del nombre. */
  tituloSugerido: string;
  promptActual: string;
  deshabilitado?: boolean;
  onGuardado: () => void;
}

/**
 * Botón secundario "Guardar como mi caso". Copia el caso elegido, con el prompt ajustado, a
 * "Mis casos". Solo se habilita con un caso seleccionado; al activarlo pide un nombre en línea
 * (sin diálogos del navegador).
 */
export function GuardarComoCaso({
  escenarioId,
  tituloSugerido,
  promptActual,
  deshabilitado = false,
  onGuardado,
}: GuardarComoCasoProps) {
  const idCampo = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [editando, setEditando] = useState(false);
  const [titulo, setTitulo] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [guardando, startTransition] = useTransition();

  const cancelar = () => {
    setEditando(false);
    setTitulo('');
    setError(null);
  };

  const guardar = () => {
    const datos = guardarVarianteSchema.safeParse({ escenarioId, titulo, prompt: promptActual });
    if (!datos.success) {
      const errores = datos.error.flatten().fieldErrors;
      setError(
        errores.titulo?.[0] ?? errores.prompt?.[0] ?? 'Selecciona un caso antes de guardar.'
      );
      inputRef.current?.focus();
      return;
    }

    setError(null);
    startTransition(async () => {
      const resultado = await guardarVariante(datos.data);
      if (!resultado.ok) {
        setError(resultado.error);
        inputRef.current?.focus();
        return;
      }
      toast.success(`«${datos.data.titulo}» guardado en Mis casos.`);
      onGuardado();
      cancelar();
    });
  };

  if (!editando) {
    return (
      <Button
        type="button"
        variant="outline"
        size="lg"
        disabled={!escenarioId || deshabilitado}
        onClick={() => {
          setTitulo(tituloSugerido ? `${tituloSugerido} (mi versión)` : '');
          setEditando(true);
          // Enfoca el campo en cuanto aparece.
          requestAnimationFrame(() => inputRef.current?.select());
        }}
      >
        <Save aria-hidden />
        Guardar como mi caso
      </Button>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <label htmlFor={idCampo} className="sr-only">
          Nombre del caso
        </label>
        <Input
          ref={inputRef}
          id={idCampo}
          value={titulo}
          onChange={evento => setTitulo(evento.target.value)}
          onKeyDown={evento => {
            // Enter guarda sin enviar el formulario principal; Escape cancela.
            if (evento.key === 'Enter') {
              evento.preventDefault();
              guardar();
            } else if (evento.key === 'Escape') {
              cancelar();
            }
          }}
          placeholder="Nombre del caso"
          maxLength={LIMITES_CASO.titulo.max}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${idCampo}-error` : undefined}
          disabled={guardando}
          className="h-9 w-64"
        />
        <Button type="button" size="lg" onClick={guardar} disabled={guardando}>
          {guardando ? <Loader2 className="animate-spin" aria-hidden /> : <Check aria-hidden />}
          Guardar
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-lg"
          onClick={cancelar}
          disabled={guardando}
          aria-label="Cancelar el guardado"
        >
          <X aria-hidden />
        </Button>
      </div>
      {error && (
        <p id={`${idCampo}-error`} role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
