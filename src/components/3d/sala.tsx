'use client';

import { useEffect, useMemo } from 'react';
import { CanvasTexture, RepeatWrapping, SRGBColorSpace } from 'three';

import { type Escena } from '@/schemas/escena.schema';

/** Altura del friso (franja inferior de la pared con el color de acento). */
const ALTURA_FRISO = 0.95;
const ALTURA_ZOCALO = 0.1;
const GROSOR_MOLDURA = 0.025;

/**
 * Textura procedural de piso de madera (tablones con vetas suaves). Se dibuja una vez en un
 * canvas de 512 px y se repite, así no hay que descargar imágenes.
 */
function crearTexturaMadera(colorBase: string): CanvasTexture {
  const lado = 512;
  const canvas = document.createElement('canvas');
  canvas.width = lado;
  canvas.height = lado;
  const ctx = canvas.getContext('2d')!;

  const filas = 8;
  const altoTablon = lado / filas;
  let semilla = 7;
  const aleatorio = () => {
    semilla = (semilla * 16807) % 2147483647;
    return semilla / 2147483647;
  };

  ctx.fillStyle = colorBase;
  ctx.fillRect(0, 0, lado, lado);

  for (let fila = 0; fila < filas; fila++) {
    const y = fila * altoTablon;
    let x = -aleatorio() * lado * 0.5;
    while (x < lado) {
      const largo = lado * (0.35 + aleatorio() * 0.4);
      // Variación tonal por tablón.
      ctx.fillStyle = `rgba(${aleatorio() > 0.5 ? '255,240,220' : '60,35,20'},${0.04 + aleatorio() * 0.08})`;
      ctx.fillRect(x, y, largo, altoTablon);
      // Vetas finas.
      ctx.strokeStyle = 'rgba(50,30,15,0.08)';
      ctx.lineWidth = 1;
      for (let v = 0; v < 3; v++) {
        const vy = y + altoTablon * (0.2 + aleatorio() * 0.6);
        ctx.beginPath();
        ctx.moveTo(x, vy);
        ctx.bezierCurveTo(x + largo * 0.3, vy - 2, x + largo * 0.6, vy + 2, x + largo, vy);
        ctx.stroke();
      }
      // Juntas entre tablones.
      ctx.fillStyle = 'rgba(40,25,15,0.35)';
      ctx.fillRect(x, y, 2, altoTablon);
      x += largo;
    }
    ctx.fillStyle = 'rgba(40,25,15,0.4)';
    ctx.fillRect(0, y, lado, 2);
  }

  const textura = new CanvasTexture(canvas);
  textura.wrapS = RepeatWrapping;
  textura.wrapT = RepeatWrapping;
  textura.colorSpace = SRGBColorSpace;
  textura.anisotropy = 4;
  return textura;
}

interface ParedProps {
  ancho: number;
  alto: number;
  posicion: [number, number, number];
  rotacionY: number;
  colores: Escena['sala']['colores'];
}

/** Pared orientada hacia el interior de la sala, con friso, moldura y zócalo. */
function Pared({ ancho, alto, posicion, rotacionY, colores }: ParedProps) {
  return (
    <group position={posicion} rotation-y={rotacionY}>
      <mesh position-y={alto / 2} receiveShadow>
        <planeGeometry args={[ancho, alto]} />
        <meshStandardMaterial color={colores.paredes} roughness={0.95} />
      </mesh>
      <mesh position={[0, ALTURA_FRISO / 2, 0.004]} receiveShadow>
        <planeGeometry args={[ancho, ALTURA_FRISO]} />
        <meshStandardMaterial color={colores.acento} roughness={0.9} />
      </mesh>
      <mesh position={[0, ALTURA_FRISO, GROSOR_MOLDURA / 2]} castShadow>
        <boxGeometry args={[ancho, 0.035, GROSOR_MOLDURA]} />
        <meshStandardMaterial color={colores.zocalo} roughness={0.7} />
      </mesh>
      <mesh position={[0, ALTURA_ZOCALO / 2, 0.012]}>
        <boxGeometry args={[ancho, ALTURA_ZOCALO, 0.024]} />
        <meshStandardMaterial color={colores.zocalo} roughness={0.7} />
      </mesh>
    </group>
  );
}

/**
 * Cascarón procedural de la sala (suelo, paredes, techo y lámpara de techo), centrado en el
 * origen. Se usa cuando el escenario no define un GLB de entorno.
 */
export function Sala({ sala }: { sala: Escena['sala'] }) {
  const { ancho, largo, alto, colores } = sala;
  const texturaSuelo = useMemo(() => {
    const textura = crearTexturaMadera(colores.suelo);
    // Cada repetición de la textura cubre 2 × 2 m de suelo.
    textura.repeat.set(ancho / 2, largo / 2);
    return textura;
  }, [colores.suelo, ancho, largo]);

  useEffect(() => () => texturaSuelo.dispose(), [texturaSuelo]);

  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[ancho, largo]} />
        <meshStandardMaterial map={texturaSuelo} roughness={0.75} />
      </mesh>

      <mesh rotation-x={Math.PI / 2} position-y={alto}>
        <planeGeometry args={[ancho, largo]} />
        <meshStandardMaterial color={colores.techo} roughness={1} />
      </mesh>

      {/* Lámpara de techo: disco emisivo, sin luz propia (la aporta la iluminación ambiental). */}
      <mesh position={[0, alto - 0.03, -0.5]}>
        <cylinderGeometry args={[0.28, 0.32, 0.05, 32]} />
        <meshStandardMaterial color="#fff6e8" emissive="#ffe9c7" emissiveIntensity={0.9} />
      </mesh>

      <Pared
        ancho={ancho}
        alto={alto}
        posicion={[0, 0, -largo / 2]}
        rotacionY={0}
        colores={colores}
      />
      <Pared
        ancho={ancho}
        alto={alto}
        posicion={[0, 0, largo / 2]}
        rotacionY={Math.PI}
        colores={colores}
      />
      <Pared
        ancho={largo}
        alto={alto}
        posicion={[-ancho / 2, 0, 0]}
        rotacionY={Math.PI / 2}
        colores={colores}
      />
      <Pared
        ancho={largo}
        alto={alto}
        posicion={[ancho / 2, 0, 0]}
        rotacionY={-Math.PI / 2}
        colores={colores}
      />

      {/* Puerta de entrada (pared +Z), por donde "llega" el estudiante. */}
      <group position={[0.9, 0, largo / 2 - 0.01]} rotation-y={Math.PI}>
        <mesh position-y={1.05} castShadow>
          <boxGeometry args={[0.95, 2.1, 0.04]} />
          <meshStandardMaterial color={colores.zocalo} roughness={0.6} />
        </mesh>
        <mesh position={[0.35, 1.0, 0.04]}>
          <sphereGeometry args={[0.03, 12, 12]} />
          <meshStandardMaterial color="#c9a45c" metalness={0.7} roughness={0.3} />
        </mesh>
      </group>
    </group>
  );
}
