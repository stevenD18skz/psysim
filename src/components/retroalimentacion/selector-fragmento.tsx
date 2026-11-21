'use client';

import { MessageSquarePlus } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { aPuntosDeCodigo, recortarSeleccion, seSolapa } from '@/lib/retroalimentacion/fragmentos';
import { type Anotacion } from '@/types';

/** El valor de un textarea representa CRLF con un solo carácter. */
function indiceOriginal(texto: string, indice: number) {
  for (const salto of texto.matchAll(/\r\n/g)) {
    if (salto.index >= indice) break;
    indice++;
  }
  return indice;
}

export function SelectorFragmento({
  texto,
  anotaciones,
  abierto,
  onAbrir,
  onCerrar,
  onElegir,
}: {
  texto: string;
  anotaciones: readonly Anotacion[];
  abierto: boolean;
  onAbrir: () => void;
  onCerrar: () => void;
  onElegir: (inicio: number, fin: number, origen: HTMLButtonElement) => void;
}) {
  const id = useId();
  const boton = useRef<HTMLButtonElement>(null);
  const campo = useRef<HTMLTextAreaElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const elemento = campo.current;
    if (!abierto || !elemento) return;
    // Chromium desactiva las flechas en un textarea readonly. Conservamos el cursor nativo
    // para seleccionar con teclado y bloqueamos las operaciones que modificarían el texto.
    const bloquearEdicion = (evento: Event) => evento.preventDefault();
    elemento.addEventListener('beforeinput', bloquearEdicion);
    return () => elemento.removeEventListener('beforeinput', bloquearEdicion);
  }, [abierto]);

  function cerrar() {
    onCerrar();
    boton.current?.focus();
  }

  function elegir() {
    if (!campo.current || !boton.current) return;
    const { selectionStart, selectionEnd } = campo.current;
    const recorte = recortarSeleccion(
      texto,
      aPuntosDeCodigo(texto, indiceOriginal(texto, selectionStart)),
      aPuntosDeCodigo(texto, indiceOriginal(texto, selectionEnd))
    );
    if (!recorte || seSolapa(anotaciones, recorte.inicio, recorte.fin)) {
      setError(
        recorte
          ? 'La selección se cruza con otro comentario. Elige otra parte de la intervención.'
          : 'Selecciona al menos un carácter de la intervención.'
      );
      campo.current.focus();
      return;
    }
    onElegir(recorte.inicio, recorte.fin, boton.current);
  }

  return (
    <>
      <Button
        ref={boton}
        type="button"
        size="sm"
        variant="ghost"
        aria-expanded={abierto}
        aria-controls={abierto ? `${id}-selector` : undefined}
        onClick={() => {
          if (abierto) cerrar();
          else {
            setError(null);
            onAbrir();
          }
        }}
      >
        <MessageSquarePlus aria-hidden />
        Elegir frase para comentar
      </Button>
      {abierto && (
        <div
          id={`${id}-selector`}
          className="flex w-full flex-col gap-2 rounded-lg border bg-muted p-3"
          onKeyDown={evento => {
            if (evento.key === 'Escape') cerrar();
          }}
        >
          <label htmlFor={id} className="text-sm font-medium">
            Texto de la intervención
          </label>
          <p id={`${id}-ayuda`} className="text-xs text-muted-foreground">
            Usa Mayús + flechas o el ratón para seleccionar una frase. Luego pulsa «Comentar frase».
          </p>
          <Textarea
            ref={campo}
            id={id}
            aria-describedby={`${id}-ayuda`}
            aria-readonly
            autoComplete="off"
            inputMode="none"
            spellCheck={false}
            value={texto}
            onChange={() => {}}
            autoFocus
          />
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <div className="flex flex-wrap justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={cerrar}>
              Cancelar selección
            </Button>
            <Button type="button" size="sm" onClick={elegir}>
              Comentar frase
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
