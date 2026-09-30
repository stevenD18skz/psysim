'use client';

import { RoundedBox } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import { type Group, type Mesh, Vector3 } from 'three';

import { poseProcedural } from '@/lib/escena/animaciones';
import { type Escena } from '@/schemas/escena.schema';
import { useAppStore } from '@/store/app-store-provider';

type ConfigNpc = Escena['npc'];

/**
 * Constante de las transiciones entre poses: ~0,3 s para completar el cambio (equivalente al
 * `crossFadeTo(0.3)` de las animaciones del GLB, HU-15 · T02).
 */
const SUAVIDAD = 10;

function Extremidad({
  posicion,
  rotacion = [0, 0, 0],
  radio,
  largo,
  color,
}: {
  posicion: [number, number, number];
  rotacion?: [number, number, number];
  radio: number;
  largo: number;
  color: string;
}) {
  return (
    <mesh position={posicion} rotation={rotacion} castShadow>
      <capsuleGeometry args={[radio, largo, 6, 12]} />
      <meshStandardMaterial color={color} roughness={0.85} />
    </mesh>
  );
}

/**
 * Paciente virtual procedural de bajo poligonaje (versión provisional hasta tener el GLB
 * riggeado). Origen en el suelo y mirando hacia +Z.
 *
 * HU-14 · T03 / HU-15: se suscribe al estado del NPC en Zustand y en `useFrame` ajusta la
 * respiración, la cabeza (sigue al estudiante con la mirada, baja al reflexionar, asiente al
 * hablar) y la boca. Todo muta objetos de Three.js: no provoca re-renderizados de React.
 */
export function PacienteProcedural({ npc }: { npc: ConfigNpc }) {
  const estado = useAppStore(state => state.npc.estado);
  const torso = useRef<Group>(null);
  const cabeza = useRef<Group>(null);
  const boca = useRef<Mesh>(null);
  const fase = useRef(0);
  const camaraLocal = useMemo(() => new Vector3(), []);

  const sentado = npc.postura === 'sentado';
  const ropa = npc.colorRopa;
  const piel = npc.colorPiel;
  const cabello = npc.colorCabello;
  const pantalon = '#4a4643';

  useFrame(({ clock, camera }, delta) => {
    if (!torso.current || !cabeza.current || !boca.current) return;
    const dt = Math.min(delta, 0.1);

    // Dirección hacia la cámara en el espacio del cuello (para seguir al estudiante).
    const padre = cabeza.current.parent!;
    padre.worldToLocal(camaraLocal.copy(camera.position));
    const dx = camaraLocal.x - cabeza.current.position.x;
    const dy = camaraLocal.y - cabeza.current.position.y;
    const dz = camaraLocal.z - cabeza.current.position.z;
    const mirada = {
      giro: dz > 0 ? Math.atan2(dx, dz) : 0,
      cabeceo: -Math.atan2(dy, Math.hypot(dx, dz)),
    };

    const pose = poseProcedural(estado, clock.elapsedTime, mirada);
    const t = 1 - Math.exp(-SUAVIDAD * dt);

    // Respiración: la fase avanza según el periodo actual, sin saltos al cambiar de estado.
    fase.current += (dt * 2 * Math.PI) / pose.periodoRespiracion;
    const respiracion = Math.sin(fase.current);
    torso.current.scale.set(
      1 + respiracion * 0.008,
      1 + respiracion * 0.014,
      1 + respiracion * 0.012
    );

    const rotacion = cabeza.current.rotation;
    rotacion.x += (pose.cabeceo - rotacion.x) * t;
    rotacion.y += (pose.giro - rotacion.y) * t;
    rotacion.z += (pose.ladeo - rotacion.z) * t;
    boca.current.scale.y += (0.25 + pose.boca - boca.current.scale.y) * Math.min(1, t * 2);
  });

  // Alturas de referencia según la postura.
  const caderaY = sentado ? 0.56 : 0.95;
  const torsoY = caderaY + 0.33;

  return (
    <group>
      {/* Piernas */}
      {sentado ? (
        <>
          <RoundedBox
            args={[0.38, 0.15, 0.46]}
            radius={0.06}
            position={[0, caderaY, 0.1]}
            castShadow
          >
            <meshStandardMaterial color={pantalon} roughness={0.9} />
          </RoundedBox>
          {[-0.1, 0.1].map(x => (
            <group key={x}>
              <Extremidad posicion={[x, 0.3, 0.34]} radio={0.06} largo={0.36} color={pantalon} />
              <RoundedBox
                args={[0.1, 0.07, 0.22]}
                radius={0.03}
                position={[x, 0.035, 0.4]}
                castShadow
              >
                <meshStandardMaterial color="#3a2f2a" roughness={0.7} />
              </RoundedBox>
            </group>
          ))}
        </>
      ) : (
        <>
          {[-0.1, 0.1].map(x => (
            <group key={x}>
              <Extremidad posicion={[x, 0.5, 0]} radio={0.07} largo={0.78} color={pantalon} />
              <RoundedBox
                args={[0.1, 0.07, 0.24]}
                radius={0.03}
                position={[x, 0.035, 0.04]}
                castShadow
              >
                <meshStandardMaterial color="#3a2f2a" roughness={0.7} />
              </RoundedBox>
            </group>
          ))}
        </>
      )}

      {/* Torso, brazos y cabeza: se animan juntos con la respiración */}
      <group ref={torso} position={[0, torsoY - 0.2, sentado ? -0.06 : 0]}>
        <group position-y={0.2} rotation-x={sentado ? -0.08 : 0}>
          <Extremidad posicion={[0, 0, 0]} radio={0.18} largo={0.3} color={ropa} />
          {/* Cuello y cabeza */}
          <mesh position-y={0.3} castShadow>
            <cylinderGeometry args={[0.05, 0.055, 0.1, 12]} />
            <meshStandardMaterial color={piel} roughness={0.7} />
          </mesh>
          <group ref={cabeza} position-y={0.44}>
            <mesh castShadow>
              <sphereGeometry args={[0.115, 24, 20]} />
              <meshStandardMaterial color={piel} roughness={0.65} />
            </mesh>
            <mesh position={[0, 0.035, -0.02]} scale={[1.06, 0.95, 1.05]} castShadow>
              <sphereGeometry args={[0.12, 24, 20, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
              <meshStandardMaterial color={cabello} roughness={0.9} />
            </mesh>
            {/* Boca: se abre y cierra mientras el paciente responde */}
            <mesh ref={boca} position={[0, -0.05, 0.103]} scale={[1, 0.25, 0.5]}>
              <sphereGeometry args={[0.02, 12, 8]} />
              <meshStandardMaterial color="#6b3a33" roughness={0.6} />
            </mesh>
            {/* Ojos: dan dirección a la mirada */}
            {[-0.04, 0.04].map(x => (
              <mesh key={x} position={[x, 0.01, 0.105]}>
                <sphereGeometry args={[0.012, 8, 8]} />
                <meshStandardMaterial color="#2b2522" roughness={0.4} />
              </mesh>
            ))}
          </group>
          {/* Brazos */}
          {[-1, 1].map(lado =>
            sentado ? (
              <group key={lado}>
                <Extremidad
                  posicion={[lado * 0.23, -0.02, 0.02]}
                  rotacion={[0.25, 0, lado * 0.12]}
                  radio={0.055}
                  largo={0.24}
                  color={ropa}
                />
                <Extremidad
                  posicion={[lado * 0.17, -0.2, 0.16]}
                  rotacion={[Math.PI / 2 - 0.25, 0, lado * -0.5]}
                  radio={0.05}
                  largo={0.2}
                  color={ropa}
                />
                <mesh position={[lado * 0.1, -0.24, 0.28]} castShadow>
                  <sphereGeometry args={[0.045, 12, 10]} />
                  <meshStandardMaterial color={piel} roughness={0.7} />
                </mesh>
              </group>
            ) : (
              <group key={lado}>
                <Extremidad
                  posicion={[lado * 0.24, -0.08, 0]}
                  rotacion={[0, 0, lado * 0.08]}
                  radio={0.055}
                  largo={0.46}
                  color={ropa}
                />
                <mesh position={[lado * 0.26, -0.4, 0.01]} castShadow>
                  <sphereGeometry args={[0.048, 12, 10]} />
                  <meshStandardMaterial color={piel} roughness={0.7} />
                </mesh>
              </group>
            )
          )}
        </group>
      </group>
    </group>
  );
}
