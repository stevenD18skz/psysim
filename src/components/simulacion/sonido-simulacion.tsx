'use client';

import { Check, Volume2, VolumeX } from 'lucide-react';
import { useEffect, useState, useSyncExternalStore } from 'react';

import { duracionEscritura } from '@/components/simulacion/use-texto-progresivo';
import { Button } from '@/components/ui/button';
import { useEfectosAmbiente } from '@/hooks/use-efectos-ambiente';
import { MotorAudio } from '@/lib/audio/motor-audio';
import { planVoz, type Voz } from '@/lib/audio/voz';
import {
  callarVozSistema,
  guardarModoVoz,
  hablarConVozSistema,
  leerModoVoz,
  type ModoVoz,
  suscribirModoVoz,
  vozSistemaDisponible,
} from '@/lib/audio/voz-sistema';
import { emocionActual } from '@/lib/conversacion/emociones';
import { RETRASO_RELLENO_MS } from '@/lib/conversacion/relleno';
import { cn } from '@/lib/utils';
import { useAppStoreApi } from '@/store/app-store-provider';

const sinSuscripcion = () => () => {};

/**
 * Sonido de la simulación: ambiente según el clima emocional, la sala, efectos de la interfaz y la
 * voz del paciente mientras su respuesta aparece en pantalla (la inventada, con audio espacial, o
 * la del sistema, según la preferencia del estudiante). Mientras la IA tarda, el paciente
 * murmura un «mmm…» (relleno conversacional).
 *
 * El navegador solo deja sonar audio tras un gesto: arranca cuando la simulación comenzó y el
 * usuario ya interactuó con la página (el clic en "Iniciar simulación" basta).
 */
export function useSonidoSimulacion({ comenzada, voz }: { comenzada: boolean; voz: Voz }) {
  const store = useAppStoreApi();
  const efectos = useEfectosAmbiente();
  const [motor] = useState(() => new MotorAudio());

  useEffect(
    () => () => {
      motor.liberar();
      callarVozSistema();
    },
    [motor]
  );

  useEffect(() => {
    if (!comenzada) return;
    const activar = () => void motor.activar();
    if (navigator.userActivation?.hasBeenActive) activar();
    // Al retomar una sesión (recarga) aún no hubo gesto: se espera al primero.
    window.addEventListener('pointerdown', activar, { once: true });
    window.addEventListener('keydown', activar, { once: true });
    return () => {
      window.removeEventListener('pointerdown', activar);
      window.removeEventListener('keydown', activar);
    };
  }, [comenzada, motor]);

  useEffect(() => motor.fijarAmbiente(efectos), [motor, efectos]);

  useEffect(() => {
    let relleno: ReturnType<typeof setTimeout> | undefined;
    const cancelarSuscripcion = store.subscribe((actual, previo) => {
      if (actual.sesion.activa?.comenzada && !previo.sesion.activa?.comenzada) {
        // Llega justo tras el clic en "Iniciar simulación": se activa el audio y luego suena.
        void motor.activar().then(() => motor.efecto('inicio'));
      }
      const desde = previo.npc.estado;
      const hacia = actual.npc.estado;
      if (desde === hacia) return;
      clearTimeout(relleno);

      const mensajes = actual.conversacion.mensajes;
      const emocion = emocionActual(mensajes);
      const silenciado = motor.estaSilenciado();
      const modo = leerModoVoz();

      if (hacia === 'procesando') {
        motor.efecto('enviar');
        if (modo === 'inventada') {
          relleno = setTimeout(() => {
            if (store.getState().npc.estado !== 'procesando') return;
            motor.hablar(planVoz('Mmm…', voz, emocion, 0.7));
          }, RETRASO_RELLENO_MS);
        }
      }
      if (hacia === 'respondiendo') {
        const respuesta = mensajes.findLast(m => m.remitente === 'npc')?.contenido ?? '';
        motor.callar();
        if (modo === 'sistema') {
          if (!silenciado) hablarConVozSistema(respuesta, voz, emocion);
        } else {
          motor.hablar(planVoz(respuesta, voz, emocion, duracionEscritura(respuesta)));
        }
      }
      if (hacia === 'sesion_finalizada') {
        motor.callar();
        callarVozSistema();
        motor.efecto('fin');
      }
    });
    return () => {
      clearTimeout(relleno);
      cancelarSuscripcion();
    };
  }, [store, motor, voz]);

  // Silenciar también calla la voz del sistema (que no pasa por el motor).
  useEffect(
    () =>
      motor.suscribir(() => {
        if (motor.estaSilenciado()) callarVozSistema();
      }),
    [motor]
  );

  return motor;
}

/** Botón para silenciar o activar el sonido (la preferencia se recuerda en este navegador). */
export function BotonSonido({ motor }: { motor: MotorAudio }) {
  const silenciado = useSyncExternalStore(motor.suscribir, motor.estaSilenciado, () => false);
  const Icono = silenciado ? VolumeX : Volume2;

  return (
    <Button
      type="button"
      variant="outline"
      size="icon-sm"
      className="pointer-events-auto bg-card/90 backdrop-blur"
      aria-label={silenciado ? 'Activar el sonido' : 'Silenciar el sonido'}
      title={silenciado ? 'Activar el sonido' : 'Silenciar el sonido'}
      onClick={() => {
        void motor.activar();
        motor.silenciar(!silenciado);
      }}
    >
      <Icono aria-hidden />
    </Button>
  );
}

const OPCIONES_VOZ: readonly { modo: ModoVoz; titulo: string; detalle: string }[] = [
  {
    modo: 'inventada',
    titulo: 'Voz inventada',
    detalle: 'Balbucea con la entonación de la frase y sale de donde está el paciente.',
  },
  {
    modo: 'sistema',
    titulo: 'Voz del sistema',
    detalle:
      'Dice las palabras en español con la voz de tu computador. Suena distinto en cada equipo.',
  },
];

/**
 * Elegir cómo suena el paciente (se recuerda en este navegador). Vive dentro de los ajustes del
 * consultorio; no se muestra si el navegador no trae voz en español.
 */
export function SelectorVoz() {
  const modo = useSyncExternalStore(suscribirModoVoz, leerModoVoz, () => 'inventada' as const);
  const disponible = useSyncExternalStore(sinSuscripcion, vozSistemaDisponible, () => false);
  if (!disponible) return null;

  return (
    <section aria-labelledby="ajuste-voz" className="flex flex-col gap-1">
      <h3 id="ajuste-voz" className="px-2 pb-1 text-sm font-semibold">
        Voz del paciente
      </h3>
      <div role="radiogroup" aria-labelledby="ajuste-voz" className="flex flex-col gap-1">
        {OPCIONES_VOZ.map(opcion => {
          const activa = opcion.modo === modo;
          return (
            <button
              key={opcion.modo}
              type="button"
              role="radio"
              aria-checked={activa}
              onClick={() => {
                guardarModoVoz(opcion.modo);
                if (opcion.modo === 'inventada') callarVozSistema();
              }}
              className={cn(
                'flex items-start gap-3 rounded-lg p-2 text-left transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-hidden',
                activa && 'bg-salvia-suave'
              )}
            >
              <span
                aria-hidden
                className={cn(
                  'mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border',
                  activa && 'border-salvia-oscuro bg-salvia-oscuro text-white'
                )}
              >
                {activa && <Check className="size-3" />}
              </span>
              <span className="flex flex-col gap-0.5">
                <span className="text-sm font-medium">{opcion.titulo}</span>
                <span className="text-xs text-muted-foreground">{opcion.detalle}</span>
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
