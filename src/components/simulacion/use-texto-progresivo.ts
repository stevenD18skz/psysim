'use client';

import { useEffect, useEffectEvent, useState } from 'react';

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

/**
 * HU-15 · T02 — Presenta un texto de forma progresiva (efecto de escritura) mientras `activo`
 * es verdadero y llama a `alTerminar` al mostrarlo completo. Con "reducir movimiento" activado
 * en el sistema, muestra el texto de inmediato.
 */
export function useTextoProgresivo(texto: string, activo: boolean, alTerminar: () => void): string {
  const [progreso, setProgreso] = useState({ texto: '', visibles: 0 });
  const terminar = useEffectEvent(alTerminar);

  useEffect(() => {
    if (!activo) return;

    let cuadro = 0;
    if (prefiereMenosMovimiento()) {
      cuadro = requestAnimationFrame(() => {
        setProgreso({ texto, visibles: texto.length });
        terminar();
      });
      return () => cancelAnimationFrame(cuadro);
    }

    const velocidad = velocidadEscritura(texto);
    const inicio = performance.now();
    const avanzar = () => {
      const visibles = Math.min(
        texto.length,
        Math.floor(((performance.now() - inicio) / 1000) * velocidad)
      );
      setProgreso({ texto, visibles });
      if (visibles < texto.length) cuadro = requestAnimationFrame(avanzar);
      else terminar();
    };
    cuadro = requestAnimationFrame(avanzar);
    return () => cancelAnimationFrame(cuadro);
  }, [texto, activo]);

  if (!activo) return texto;
  return progreso.texto === texto ? texto.slice(0, progreso.visibles) : '';
}
