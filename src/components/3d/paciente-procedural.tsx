'use client';

import { RoundedBox } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import { type Group } from 'three';

import { type Escena } from '@/schemas/escena.schema';

type ConfigNpc = Escena['npc'];

/** Periodo de una respiración en reposo, en segundos. */
const PERIODO_RESPIRACION = 4.2;

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
 * Paciente virtual procedural de bajo poligonaje (versión provisional hasta tener el GLB).
 * Origen en el suelo y mirando hacia +Z. La respiración se anima en `useFrame` mutando la
 * escala del torso: no provoca re-renderizados de React.
 */
export function PacienteProcedural({ npc }: { npc: ConfigNpc }) {
  const torso = useRef<Group>(null);
  const sentado = npc.postura === 'sentado';
  const ropa = npc.colorRopa;
  const piel = npc.colorPiel;
  const cabello = npc.colorCabello;
  const pantalon = '#4a4643';

  useFrame(({ clock }) => {
    if (!torso.current) return;
    const fase = Math.sin((clock.elapsedTime * 2 * Math.PI) / PERIODO_RESPIRACION);
    torso.current.scale.set(1 + fase * 0.008, 1 + fase * 0.014, 1 + fase * 0.012);
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
          <group position-y={0.44}>
            <mesh castShadow>
              <sphereGeometry args={[0.115, 24, 20]} />
              <meshStandardMaterial color={piel} roughness={0.65} />
            </mesh>
            <mesh position={[0, 0.035, -0.02]} scale={[1.06, 0.95, 1.05]} castShadow>
              <sphereGeometry args={[0.12, 24, 20, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
              <meshStandardMaterial color={cabello} roughness={0.9} />
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
