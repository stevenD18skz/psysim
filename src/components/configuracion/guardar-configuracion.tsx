'use client';

import { Check, Loader2, Save, X } from 'lucide-react';
import { useId, useRef, useState, useTransition } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { guardarConfiguracion } from '@/lib/escenarios/actions';
import { guardarConfiguracionSchema, LIMITES } from '@/schemas/configuracion.schema';
import { type ConfiguracionGuardada } from '@/types';

interface GuardarConfiguracionProps {
  escenarioId: string | null;
  promptActual: string;
  deshabilitado?: boolean;
  onGuardada: (configuracion: ConfiguracionGuardada) => void;
}

/**
 * HU-07 · T02 — Botón secundario "Guardar configuración". Solo se habilita con un escenario
 * seleccionado; al activarlo pide un nombre en línea (sin diálogos del navegador).
 */
export function GuardarConfiguracion({
  escenarioId,
  promptActual,
  deshabilitado = false,
  onGuardada,
}: GuardarConfiguracionProps) {
  const idCampo = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [editando, setEditando] = useState(false);
  const [nombre, setNombre] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [guardando, startTransition] = useTransition();

  const cancelar = () => {
    setEditando(false);
    setNombre('');
    setError(null);
  };

  const guardar = () => {
    const datos = guardarConfiguracionSchema.safeParse({
      escenarioId,
      nombre,
      promptPersonalizado: promptActual,
    });
    if (!datos.success) {
      const errores = datos.error.flatten().fieldErrors;
      setError(
        errores.nombre?.[0] ??
          errores.promptPersonalizado?.[0] ??
          'Selecciona un escenario antes de guardar.'
      );
      inputRef.current?.focus();
      return;
    }

    setError(null);
    startTransition(async () => {
      const resultado = await guardarConfiguracion(datos.data);
      if (!resultado.ok) {
        setError(resultado.error);
        inputRef.current?.focus();
        return;
      }
      onGuardada(resultado.datos);
      toast.success(`Configuración «${resultado.datos.nombre}» guardada.`);
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
          setEditando(true);
          // Enfoca el campo en cuanto aparece.
          requestAnimationFrame(() => inputRef.current?.focus());
        }}
      >
        <Save aria-hidden />
        Guardar configuración
      </Button>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <label htmlFor={idCampo} className="sr-only">
          Nombre de la configuración
        </label>
        <Input
          ref={inputRef}
          id={idCampo}
          value={nombre}
          onChange={evento => setNombre(evento.target.value)}
          onKeyDown={evento => {
            // Enter guarda sin enviar el formulario principal; Escape cancela.
            if (evento.key === 'Enter') {
              evento.preventDefault();
              guardar();
            } else if (evento.key === 'Escape') {
              cancelar();
            }
          }}
          placeholder="Nombre, p. ej. Duelo — grupo A"
          maxLength={LIMITES.nombreConfiguracion.max}
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
