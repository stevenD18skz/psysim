'use client';

import { useFrame } from '@react-three/fiber';
import { use, useEffect, useMemo, useState } from 'react';
import { Vector3 } from 'three';

import { medidasPacienteStore } from '@/components/3d/medidas-paciente';
import { duracionEscritura } from '@/components/simulacion/use-texto-progresivo';
import { planVoz, type Voz } from '@/lib/audio/voz';
import { emocionActual } from '@/lib/conversacion/emociones';
import { AnimadorPaciente } from '@/lib/npc/animador-paciente';
import { cargarGlb } from '@/lib/npc/cargar-glb';
import { type ModeloNpc, urlModeloNpc } from '@/lib/npc/catalogo';
import { gestoDeTransicion } from '@/lib/npc/comportamiento';
import { type Escena } from '@/schemas/escena.schema';
import { type AppState } from '@/store/app-store';
import { useAppStoreApi } from '@/store/app-store-provider';

type ConfigNpc = Escena['npc'];

function ultimaRespuesta({ conversacion }: AppState): string | undefined {
  return conversacion.mensajes.findLast(m => m.remitente === 'npc')?.contenido;
}

/**
 * Conecta el animador con el store de Zustand sin re-renderizar React: en cada cambio del estado
 * del NPC o de la conversación ajusta el bucle y la expresión, y en cada transición decide el
 * gesto (saludar al llegar, asentir o negar al responder, despedirse al terminar). Al empezar a
 * responder, la boca sigue el mismo plan de sílabas que suena (`useSonidoSimulacion`).
 */
function useConductaPaciente(animador: AnimadorPaciente, voz: Voz) {
  const store = useAppStoreApi();

  useEffect(() => {
    let previo = store.getState();
    animador.actualizarConducta(previo.npc.estado, emocionActual(previo.conversacion.mensajes));

    return store.subscribe(actual => {
      const desde = previo.npc.estado;
      const hacia = actual.npc.estado;
      const mensajes = actual.conversacion.mensajes;
      if (desde === hacia && mensajes === previo.conversacion.mensajes) {
        previo = actual;
        return;
      }

      // Primero el gesto: así el bucle nuevo espera a que termine en lugar de mezclarse con él.
      const gesto = gestoDeTransicion(desde, hacia, {
        primerEncuentro: mensajes.length === 0,
        respuesta: ultimaRespuesta(actual),
      });
      if (gesto) animador.hacerGesto(gesto);
      const emocion = emocionActual(mensajes);
      animador.actualizarConducta(hacia, emocion);
      if (hacia === 'respondiendo' && desde !== hacia) {
        const respuesta = ultimaRespuesta(actual) ?? '';
        animador.hablar(planVoz(respuesta, voz, emocion, duracionEscritura(respuesta)));
      }
      previo = actual;
    });
  }, [store, animador, voz]);
}

/**
 * Paciente virtual con un personaje del catálogo (GLB con esqueleto): se sienta en su silla (o
 * queda de pie), piensa mientras la IA responde, habla, saluda y expresa con el cuerpo y el rostro
 * la emoción de su última respuesta. Suspende mientras descarga el GLB (va dentro de `<Suspense>`).
 *
 * La mira apunta a una caja invisible con la forma de la postura base: es mucho más barato que
 * lanzar rayos contra las mallas con esqueleto.
 */
export function PacientePersonaje({ npc, personaje }: { npc: ConfigNpc; personaje: ModeloNpc }) {
  const glb = use(cargarGlb(urlModeloNpc(personaje)));
  const [animador] = useState(
    () =>
      new AnimadorPaciente(glb, {
        postura: npc.postura,
        alturaAsiento: npc.alturaAsiento,
        piernas: npc.piernas,
      })
  );
  const camara = useMemo(() => new Vector3(), []);

  useEffect(() => animador.montar(), [animador]);

  // La cámara de conversación encuadra los ojos reales del personaje.
  useEffect(() => {
    medidasPacienteStore.setState({
      alturaOjos: npc.posicion[1] + animador.alturaOjos * npc.escala,
    });
    return () => medidasPacienteStore.setState({ alturaOjos: null });
  }, [animador, npc.posicion, npc.escala]);

  useConductaPaciente(animador, personaje.voz);

  useFrame(({ camera }, delta) => {
    animador.avanzar(Math.min(delta, 0.1), camera.getWorldPosition(camara));
  });

  const { caja } = animador;
  const tamano = useMemo(() => caja.getSize(new Vector3()), [caja]);
  const centro = useMemo(() => caja.getCenter(new Vector3()), [caja]);

  return (
    <>
      <primitive object={animador.modelo} />
      <mesh position={centro}>
        <boxGeometry args={[tamano.x, tamano.y, tamano.z]} />
        <meshBasicMaterial visible={false} />
      </mesh>
    </>
  );
}
