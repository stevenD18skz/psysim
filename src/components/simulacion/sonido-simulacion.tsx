'use client';

import { Volume2, VolumeX } from 'lucide-react';
import { useEffect, useState, useSyncExternalStore } from 'react';

import { duracionEscritura } from '@/components/simulacion/use-texto-progresivo';
import { Button } from '@/components/ui/button';
import { useEfectosAmbiente } from '@/hooks/use-efectos-ambiente';
import { MotorAudio } from '@/lib/audio/motor-audio';
import { planVoz, type Voz } from '@/lib/audio/voz';
import { emocionActual } from '@/lib/conversacion/emociones';
import { useAppStoreApi } from '@/store/app-store-provider';

/**
 * Sonido de la simulación: ambiente según el clima emocional, efectos de la interfaz y la voz
 * inventada del paciente mientras su respuesta aparece en pantalla.
 *
 * El navegador solo deja sonar audio tras un gesto: arranca cuando la simulación comenzó y el
 * usuario ya interactuó con la página (el clic en "Iniciar simulación" basta).
 */
export function useSonidoSimulacion({ comenzada, voz }: { comenzada: boolean; voz: Voz }) {
  const store = useAppStoreApi();
  const efectos = useEfectosAmbiente();
  const [motor] = useState(() => new MotorAudio());

  useEffect(() => () => motor.liberar(), [motor]);

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

  useEffect(
    () =>
      store.subscribe((actual, previo) => {
        if (actual.sesion.activa?.comenzada && !previo.sesion.activa?.comenzada) {
          // Llega justo tras el clic en "Iniciar simulación": se activa el audio y luego suena.
          void motor.activar().then(() => motor.efecto('inicio'));
        }
        const desde = previo.npc.estado;
        const hacia = actual.npc.estado;
        if (desde === hacia) return;

        if (hacia === 'procesando') motor.efecto('enviar');
        if (hacia === 'respondiendo') {
          const mensajes = actual.conversacion.mensajes;
          const respuesta = mensajes.findLast(m => m.remitente === 'npc')?.contenido ?? '';
          motor.hablar(
            planVoz(respuesta, voz, emocionActual(mensajes), duracionEscritura(respuesta))
          );
        }
        if (hacia === 'sesion_finalizada') {
          motor.callar();
          motor.efecto('fin');
        }
      }),
    [store, motor, voz]
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
      aria-pressed={silenciado}
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
