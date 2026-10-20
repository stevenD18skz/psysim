'use client';

import { Mic, MicOff } from 'lucide-react';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/*
 * Dictado de la intervención con el reconocimiento de voz del navegador (Web Speech API). Es
 * opcional: hablar se parece más a la consulta real, pero el reconocimiento se equivoca y, en
 * Chrome y Edge, el audio lo procesan los servidores del proveedor del navegador. Por eso se pide
 * una aceptación explícita la primera vez y el texto dictado siempre queda en el campo para
 * revisarlo antes de enviarlo.
 */

const CLAVE_ACEPTADO = 'psysim:dictado-aceptado';

interface ResultadoReconocimiento {
  isFinal: boolean;
  0: { transcript: string };
}

interface EventoReconocimiento {
  resultIndex: number;
  results: ArrayLike<ResultadoReconocimiento>;
}

interface Reconocedor {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((evento: EventoReconocimiento) => void) | null;
  onend: (() => void) | null;
  onerror: ((evento: { error: string }) => void) | null;
}

type ConstructorReconocedor = new () => Reconocedor;

function constructorReconocedor(): ConstructorReconocedor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as {
    SpeechRecognition?: ConstructorReconocedor;
    webkitSpeechRecognition?: ConstructorReconocedor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

const sinSuscripcion = () => () => {};

function leerAceptado(): boolean {
  try {
    return localStorage.getItem(CLAVE_ACEPTADO) === '1';
  } catch {
    return false;
  }
}

interface BotonDictadoProps {
  /** Añade el texto reconocido (frases completas) al campo. */
  onTexto: (texto: string) => void;
  deshabilitado: boolean;
  /** Se pide la aceptación en línea (dentro del panel), no en un diálogo encima de la escena. */
  onPedirAceptacion: (aceptar: () => void) => void;
}

/** Botón de micrófono junto a «Enviar». No aparece si el navegador no reconoce voz. */
export function BotonDictado({ onTexto, deshabilitado, onPedirAceptacion }: BotonDictadoProps) {
  const disponible = useSyncExternalStore(
    sinSuscripcion,
    () => constructorReconocedor() !== null,
    () => false
  );
  const [escuchando, setEscuchando] = useState(false);
  const reconocedor = useRef<Reconocedor | null>(null);
  const alTexto = useRef(onTexto);

  useEffect(() => {
    alTexto.current = onTexto;
  }, [onTexto]);

  useEffect(() => () => reconocedor.current?.stop(), []);

  useEffect(() => {
    if (deshabilitado) reconocedor.current?.stop();
  }, [deshabilitado]);

  if (!disponible) return null;

  const empezar = () => {
    const Constructor = constructorReconocedor();
    if (!Constructor) return;
    const r = new Constructor();
    r.lang = 'es-CO';
    r.continuous = true;
    r.interimResults = false;
    r.onresult = evento => {
      for (let i = evento.resultIndex; i < evento.results.length; i++) {
        const resultado = evento.results[i]!;
        if (resultado.isFinal) alTexto.current(resultado[0].transcript.trim());
      }
    };
    r.onend = () => setEscuchando(false);
    r.onerror = () => setEscuchando(false);
    reconocedor.current = r;
    try {
      r.start();
      setEscuchando(true);
    } catch {
      setEscuchando(false);
    }
  };

  const alternar = () => {
    if (escuchando) {
      reconocedor.current?.stop();
      return;
    }
    if (leerAceptado()) {
      empezar();
      return;
    }
    onPedirAceptacion(() => {
      try {
        localStorage.setItem(CLAVE_ACEPTADO, '1');
      } catch {
        // Sin almacenamiento: se volverá a preguntar en la próxima visita.
      }
      empezar();
    });
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="icon-lg"
      className={cn('relative mb-5', escuchando && 'border-terracota text-terracota')}
      onClick={alternar}
      disabled={deshabilitado && !escuchando}
      aria-pressed={escuchando}
      aria-label={escuchando ? 'Dejar de dictar' : 'Dictar tu intervención'}
      title={escuchando ? 'Dejar de dictar' : 'Dictar tu intervención'}
    >
      {escuchando ? <MicOff aria-hidden /> : <Mic aria-hidden />}
      {escuchando && (
        <span
          aria-hidden
          className="absolute -top-0.5 -right-0.5 size-2.5 rounded-full bg-terracota motion-safe:animate-pulse"
        />
      )}
    </Button>
  );
}
