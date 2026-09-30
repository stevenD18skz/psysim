'use client';

import { PointerLockControls } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { type PerspectiveCamera, Vector3 } from 'three';

import { useRegistroColisiones } from '@/components/3d/registro-colisiones';
import { eje, useTeclado } from '@/components/3d/use-teclado';
import { type CajaXZ, resolverMovimiento } from '@/lib/escena/colisiones';
import { type Escena } from '@/schemas/escena.schema';

/** Id del botón que captura el ratón (PointerLockControls solo se activa desde él). */
export const ID_BOTON_EXPLORAR = 'explorar-escena';

/** Sensibilidad del ratón: más baja que la de un videojuego para no marear. */
const SENSIBILIDAD_RATON = 0.55;
/** Qué tan rápido se alcanza la velocidad objetivo (aceleración suave, sin tirones). */
const SUAVIZADO = 10;
/**
 * Integración por subpasos: cada fotograma se divide en pasos de como máximo `SUBPASO` s, así
 * la velocidad y las colisiones son correctas aunque el equipo renderice a pocos FPS. El tiempo
 * total por fotograma se limita a `DELTA_MAXIMO` para no "teletransportar" al estudiante al
 * volver de otra pestaña.
 */
const SUBPASO = 0.05;
const DELTA_MAXIMO = 0.25;

const ARRIBA = new Vector3(0, 1, 0);

interface ControlesPrimeraPersonaProps {
  camara: Escena['camara'];
  navegacion: Escena['navegacion'];
  /** Si es `false` (p. ej. durante la conversación) el estudiante no puede moverse. */
  habilitado?: boolean;
  onBloqueoCambia?: (bloqueado: boolean) => void;
}

/**
 * HU-10 · T01/T02 — Navegación en primera persona.
 *
 * - Ratón: orienta la vista (Pointer Lock; se captura con el botón "Explorar" y se libera
 *   con Esc). El ángulo vertical se limita para no mirar directamente al techo o al suelo.
 * - WASD o flechas: desplazamiento en el plano del suelo, con aceleración suave.
 * - La altura de los ojos es fija y el movimiento respeta los límites del JSON y la caja de
 *   colisión de cada mueble (ver lib/escena/colisiones.ts).
 */
export function ControlesPrimeraPersona({
  camara,
  navegacion,
  habilitado = true,
  onBloqueoCambia,
}: ControlesPrimeraPersonaProps) {
  // La cámara se obtiene del estado de R3F dentro de efectos y del bucle de render (no como
  // valor de render), porque se muta en cada fotograma.
  const obtenerEstado = useThree(state => state.get);
  const { obstaculos } = useRegistroColisiones();
  const teclas = useTeclado(habilitado);
  const velocidad = useRef(new Vector3());

  // Vectores reutilizados en cada fotograma para no generar basura.
  const temporales = useMemo(
    () => ({ adelante: new Vector3(), derecha: new Vector3(), deseada: new Vector3() }),
    []
  );

  const limites = useMemo<CajaXZ>(
    () => ({
      minX: navegacion.limites.min[0],
      maxX: navegacion.limites.max[0],
      minZ: navegacion.limites.min[2],
      maxZ: navegacion.limites.max[2],
    }),
    [navegacion.limites]
  );

  // Posición y orientación inicial definidas en el JSON de la escena.
  useLayoutEffect(() => {
    const camera = obtenerEstado().camera as PerspectiveCamera;
    camera.position.set(...camara.posicion);
    camera.fov = camara.fov;
    camera.near = 0.05;
    camera.far = 60;
    camera.updateProjectionMatrix();
    camera.lookAt(...camara.mirarA);
  }, [obtenerEstado, camara]);

  // Al empezar a conversar se libera el ratón para poder escribir y usar el panel.
  useEffect(() => {
    if (habilitado) return;
    velocidad.current.set(0, 0, 0);
    if (document.pointerLockElement) document.exitPointerLock();
  }, [habilitado]);

  useFrame(({ camera }, delta) => {
    if (!habilitado) return;
    const total = Math.min(delta, DELTA_MAXIMO);

    // Tras conversar (ojos a la altura de una persona sentada) se recupera la altura de pie.
    const alturaOjos = camara.posicion[1];
    if (Math.abs(camera.position.y - alturaOjos) > 0.001) {
      camera.position.y += (alturaOjos - camera.position.y) * (1 - Math.exp(-6 * total));
    }
    const pasos = Math.max(1, Math.ceil(total / SUBPASO));
    const dt = total / pasos;
    const { adelante, derecha, deseada } = temporales;

    const avance = eje(teclas.current, 'adelante', 'atras');
    const lateral = eje(teclas.current, 'derecha', 'izquierda');

    camera.getWorldDirection(adelante).setY(0).normalize();
    derecha.crossVectors(adelante, ARRIBA).normalize();
    deseada.set(0, 0, 0).addScaledVector(adelante, avance).addScaledVector(derecha, lateral);
    if (deseada.lengthSq() > 0) deseada.normalize().multiplyScalar(navegacion.velocidad);

    const listaObstaculos = [...obstaculos.values()];
    for (let paso = 0; paso < pasos; paso++) {
      velocidad.current.lerp(deseada, 1 - Math.exp(-SUAVIZADO * dt));
      if (velocidad.current.lengthSq() < 1e-6) return;

      const nueva = resolverMovimiento(
        { x: camera.position.x, z: camera.position.z },
        { x: velocidad.current.x * dt, z: velocidad.current.z * dt },
        listaObstaculos,
        limites,
        navegacion.radioJugador
      );
      camera.position.x = nueva.x;
      camera.position.z = nueva.z;
    }
  });

  return (
    <PointerLockControls
      selector={`#${ID_BOTON_EXPLORAR}`}
      pointerSpeed={SENSIBILIDAD_RATON}
      minPolarAngle={Math.PI * 0.22}
      maxPolarAngle={Math.PI * 0.78}
      enabled={habilitado}
      onLock={() => onBloqueoCambia?.(true)}
      onUnlock={() => onBloqueoCambia?.(false)}
    />
  );
}
