'use client';

import { useEffect, useEffectEvent, useRef, useState } from 'react';

/** Velocidad mínima de la escritura progresiva (caracteres por segundo). */
const CARACTERES_POR_SEGUNDO = 45;
/** Duración máxima: las respuestas largas se aceleran para no hacer esperar al estudiante. */
const DURACION_MAXIMA_S = 4;

/**
 * Segundos que tarda en mostrarse un texto con la escritura progresiva. La voz del paciente
 * (balbuceo) la usa para durar lo mismo que el texto en pantalla.
 */
export function duracionEscritura(texto: string): number {
  return texto.length / velocidadEscritura(texto);
}

function velocidadEscritura(texto: string): number {
  return Math.max(CARACTERES_POR_SEGUNDO, texto.length / DURACION_MAXIMA_S);
}

function prefiereMenosMovimiento(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true
  );
}

/** Cuántos caracteres iniciales comparten dos textos. */
function prefijoComun(a: string, b: string): number {
  const tope = Math.min(a.length, b.length);
  let i = 0;
  while (i < tope && a[i] === b[i]) i++;
  return i;
}

/**
 * HU-15 · T02 — Presenta un texto de forma progresiva (efecto de escritura) mientras `activo`
 * es verdadero y llama a `alTerminar` al mostrarlo completo. Con "reducir movimiento" activado
 * en el sistema, muestra el texto de inmediato.
 *
 * El texto puede crecer mientras se escribe (la respuesta del paciente llega por partes): la
 * escritura sigue desde donde iba. Con `completo` en falso espera más texto al alcanzar el final
 * y no da por terminada la respuesta. Si el texto se reemplaza por otro, conserva lo que tengan
 * en común al principio.
 */
export function useTextoProgresivo(
  texto: string,
  activo: boolean,
  alTerminar: () => void,
  completo = true
): string {
  const [visibles, setVisibles] = useState(0);
  const terminar = useEffectEvent(alTerminar);
  // El bucle de animación lee siempre lo último sin reiniciarse con cada fragmento que llega.
  const actual = useRef({ texto, completo });
  useEffect(() => {
    actual.current = { texto, completo };
  }, [texto, completo]);

  useEffect(() => {
    if (!activo) return;

    const inmediato = prefiereMenosMovimiento();
    let cuadro = 0;
    let mostrados = 0;
    let escrito = '';
    let anterior = performance.now();
    const avanzar = () => {
      const { texto: objetivo, completo: cerrado } = actual.current;
      const ahora = performance.now();
      if (!objetivo.startsWith(escrito)) mostrados = prefijoComun(objetivo, escrito);
      mostrados = inmediato
        ? objetivo.length
        : Math.min(
            objetivo.length,
            mostrados + ((ahora - anterior) / 1000) * velocidadEscritura(objetivo)
          );
      anterior = ahora;
      escrito = objetivo.slice(0, Math.floor(mostrados));
      setVisibles(escrito.length);
      if (cerrado && escrito.length >= objetivo.length) {
        terminar();
        return;
      }
      cuadro = requestAnimationFrame(avanzar);
    };
    cuadro = requestAnimationFrame(avanzar);
    return () => cancelAnimationFrame(cuadro);
  }, [activo]);

  return activo ? texto.slice(0, visibles) : texto;
}
