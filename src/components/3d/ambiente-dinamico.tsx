'use client';

import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  Fog,
  type Object3D,
  PointsMaterial,
} from 'three';

import { RAPIDEZ_AMBIENTE } from '@/components/3d/iluminacion';
import { useEfectosAmbiente } from '@/hooks/use-efectos-ambiente';
import { type Escena } from '@/schemas/escena.schema';

/** Partículas de cada capa: pocas y pequeñas, apenas cuestan en una iGPU. */
const CANTIDAD = 140;
const COLOR_NIEBLA = new Color('#7d8a9c');
/** Sin niebla, empieza más lejos que cualquier pared: la sala se ve como la diseñó su JSON. */
const NIEBLA_LEJANA = { cerca: 40, lejos: 60 };
/** Con la niebla al máximo, la sala se difumina desde unos metros (el paciente sigue visible). */
const NIEBLA_DENSA = { cerca: 0.8, lejos: 8 };

type Sala = Escena['sala'];

/** Posiciones aleatorias dentro de la sala (algo separadas de paredes, suelo y techo). */
function posicionesAleatorias({ ancho, largo, alto }: Sala): Float32Array {
  const posiciones = new Float32Array(CANTIDAD * 3);
  for (let i = 0; i < CANTIDAD; i++) {
    posiciones[i * 3] = (Math.random() - 0.5) * (ancho - 0.6);
    posiciones[i * 3 + 1] = 0.2 + Math.random() * (alto - 0.4);
    posiciones[i * 3 + 2] = (Math.random() - 0.5) * (largo - 0.6);
  }
  return posiciones;
}

interface CapaParticulas {
  /** El objeto `<points>` montado (solo se usa para mostrarlo u ocultarlo). */
  puntos: Object3D | null;
  material: PointsMaterial;
  geometria: BufferGeometry;
  /** Fase propia de cada partícula, para que no se muevan al unísono. */
  fases: Float32Array;
}

function crearCapa(
  sala: Sala,
  opciones: ConstructorParameters<typeof PointsMaterial>[0]
): CapaParticulas {
  const geometria = new BufferGeometry();
  geometria.setAttribute('position', new BufferAttribute(posicionesAleatorias(sala), 3));
  const fases = new Float32Array(CANTIDAD).map(() => Math.random() * Math.PI * 2);
  const material = new PointsMaterial({
    transparent: true,
    opacity: 0,
    depthWrite: false,
    sizeAttenuation: true,
    ...opciones,
  });
  return { puntos: null, material, geometria, fases };
}

/**
 * Ambiente dinámico (retroalimentación emocional): la sala refleja el clima de la conversación.
 * - Calma: polvo dorado flotando en la luz y una deriva suave, como una brisa.
 * - Tensión: niebla y partículas oscuras que se arremolinan cada vez más rápido.
 * - Pesadumbre: bruma fría y partículas que caen despacio.
 * La luz la ajusta `Iluminacion`; el velo de la pantalla y el sonido, la interfaz.
 */
export function AmbienteDinamico({ sala }: { sala: Sala }) {
  const efectos = useEfectosAmbiente();
  const actual = useRef({ calma: 0, tension: 0, pesadumbre: 0, niebla: 0 });
  const niebla = useMemo(() => new Fog(COLOR_NIEBLA, NIEBLA_LEJANA.cerca, NIEBLA_LEJANA.lejos), []);

  const [{ polvo, ceniza }] = useState(() => ({
    polvo: crearCapa(sala, { color: '#ffd9a0', size: 0.022, blending: AdditiveBlending }),
    ceniza: crearCapa(sala, { color: '#2b3442', size: 0.03 }),
  }));

  useEffect(
    () => () =>
      [polvo, ceniza].forEach(capa => {
        capa.geometria.dispose();
        capa.material.dispose();
      }),
    [polvo, ceniza]
  );

  useFrame(({ clock, scene }, delta) => {
    const dt = Math.min(delta, 0.1);
    const t = 1 - Math.exp(-RAPIDEZ_AMBIENTE * dt);
    const a = actual.current;
    a.calma += (efectos.calma - a.calma) * t;
    a.tension += (efectos.tension - a.tension) * t;
    a.pesadumbre += (efectos.pesadumbre - a.pesadumbre) * t;
    a.niebla += (efectos.niebla - a.niebla) * t;

    // Se ajusta la de la escena (la misma `niebla`) a través del estado de R3F.
    if (scene.fog instanceof Fog) {
      scene.fog.near = NIEBLA_LEJANA.cerca + (NIEBLA_DENSA.cerca - NIEBLA_LEJANA.cerca) * a.niebla;
      scene.fog.far = NIEBLA_LEJANA.lejos + (NIEBLA_DENSA.lejos - NIEBLA_LEJANA.lejos) * a.niebla;
    }

    const tiempo = clock.elapsedTime;
    moverPolvo(polvo, a.calma, tiempo, dt, sala);
    moverCeniza(ceniza, Math.max(a.tension, a.pesadumbre * 0.7), a.tension, tiempo, dt, sala);
  });

  return (
    <>
      <primitive attach="fog" object={niebla} />
      {[polvo, ceniza].map((capa, i) => (
        <points
          key={i}
          ref={puntos => {
            capa.puntos = puntos;
          }}
          geometry={capa.geometria}
          material={capa.material}
          frustumCulled={false}
          visible={false}
        />
      ))}
    </>
  );
}

/** Mantiene una partícula dentro de la sala: si sale por un lado, entra por el opuesto. */
function envolver(valor: number, mitad: number) {
  if (valor > mitad) return -mitad;
  if (valor < -mitad) return mitad;
  return valor;
}

function moverPolvo(capa: CapaParticulas, calma: number, tiempo: number, dt: number, sala: Sala) {
  capa.material.opacity = calma * 0.85;
  if (!capa.puntos) return;
  capa.puntos.visible = calma > 0.02;
  if (!capa.puntos.visible) return;

  const posiciones = capa.geometria.attributes.position as BufferAttribute;
  for (let i = 0; i < CANTIDAD; i++) {
    const fase = capa.fases[i]!;
    // Deriva lenta en una dirección (la "brisa") con un vaivén propio.
    posiciones.setX(
      i,
      envolver(
        posiciones.getX(i) + dt * (0.06 + 0.03 * Math.sin(tiempo * 0.4 + fase)),
        sala.ancho / 2 - 0.3
      )
    );
    posiciones.setY(i, posiciones.getY(i) + dt * 0.02 * Math.sin(tiempo * 0.7 + fase));
  }
  posiciones.needsUpdate = true;
}

function moverCeniza(
  capa: CapaParticulas,
  intensidad: number,
  tension: number,
  tiempo: number,
  dt: number,
  sala: Sala
) {
  capa.material.opacity = intensidad * 0.75;
  if (!capa.puntos) return;
  capa.puntos.visible = intensidad > 0.02;
  if (!capa.puntos.visible) return;

  const posiciones = capa.geometria.attributes.position as BufferAttribute;
  // La tensión hace girar las partículas alrededor del centro de la sala, cada vez más rápido;
  // la pesadumbre (sin tensión) solo las deja caer despacio.
  const giro = dt * (0.15 + 0.9 * tension);
  const coseno = Math.cos(giro);
  const seno = Math.sin(giro);
  for (let i = 0; i < CANTIDAD; i++) {
    const x = posiciones.getX(i);
    const z = posiciones.getZ(i);
    posiciones.setX(i, x * coseno - z * seno);
    posiciones.setZ(i, x * seno + z * coseno);
    let y =
      posiciones.getY(i) -
      dt * (0.05 + 0.1 * (1 - tension)) +
      dt * 0.08 * tension * Math.sin(tiempo * 2 + capa.fases[i]!);
    if (y < 0.1) y = sala.alto - 0.2;
    posiciones.setY(i, y);
  }
  posiciones.needsUpdate = true;
}
