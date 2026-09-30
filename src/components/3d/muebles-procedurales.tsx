'use client';

import { RoundedBox } from '@react-three/drei';
import { type ReactNode, useMemo } from 'react';
import { Color, DoubleSide } from 'three';

import { type TipoMueble } from '@/schemas/escena.schema';

/*
 * Mobiliario procedural de bajo poligonaje. Sirve como versión por defecto de cada tipo de
 * mueble mientras no exista su GLB, y como respaldo si el GLB no carga. Convención: origen
 * en el suelo, centrado, con el frente del mueble mirando hacia +Z. Medidas en metros.
 */

const MADERA_OSCURA = '#5c4030';

/** Aclara u oscurece un color hexadecimal (factor > 1 aclara). */
function tono(hex: string, factor: number): string {
  const color = new Color(hex);
  return `#${color.multiplyScalar(factor).getHexString()}`;
}

/** Generador pseudoaleatorio determinista a partir de un texto (mismo id → mismo resultado). */
function crearAleatorio(texto: string) {
  let semilla = [...texto].reduce((acc, c) => (acc * 31 + c.charCodeAt(0)) % 2147483647, 17);
  return () => {
    semilla = (semilla * 16807) % 2147483647;
    return semilla / 2147483647;
  };
}

function Tela({ color, children }: { color: string; children?: ReactNode }) {
  return (
    <meshStandardMaterial color={color} roughness={0.92}>
      {children}
    </meshStandardMaterial>
  );
}

function Madera({ color = MADERA_OSCURA }: { color?: string }) {
  return <meshStandardMaterial color={color} roughness={0.6} />;
}

function Pata({ posicion, alto }: { posicion: [number, number, number]; alto: number }) {
  return (
    <mesh position={[posicion[0], alto / 2, posicion[2]]} castShadow>
      <cylinderGeometry args={[0.025, 0.018, alto, 8]} />
      <Madera />
    </mesh>
  );
}

function Sofa({ color = '#7f9a86' }: { color?: string }) {
  const cojin = tono(color, 1.12);
  return (
    <group>
      <RoundedBox
        args={[2, 0.36, 0.85]}
        radius={0.05}
        position={[0, 0.26, 0]}
        castShadow
        receiveShadow
      >
        <Tela color={color} />
      </RoundedBox>
      {[-0.46, 0.46].map(x => (
        <RoundedBox
          key={x}
          args={[0.9, 0.14, 0.66]}
          radius={0.05}
          position={[x, 0.5, 0.06]}
          castShadow
        >
          <Tela color={cojin} />
        </RoundedBox>
      ))}
      <RoundedBox args={[2, 0.52, 0.2]} radius={0.06} position={[0, 0.66, -0.32]} castShadow>
        <Tela color={color} />
      </RoundedBox>
      {[-0.92, 0.92].map(x => (
        <RoundedBox
          key={x}
          args={[0.17, 0.52, 0.85]}
          radius={0.06}
          position={[x, 0.36, 0]}
          castShadow
        >
          <Tela color={color} />
        </RoundedBox>
      ))}
      {/* Cojines decorativos */}
      <RoundedBox
        args={[0.38, 0.34, 0.12]}
        radius={0.05}
        position={[-0.6, 0.72, -0.16]}
        rotation={[-0.25, 0.2, 0.08]}
        castShadow
      >
        <Tela color="#e2b98f" />
      </RoundedBox>
      <RoundedBox
        args={[0.36, 0.32, 0.12]}
        radius={0.05}
        position={[0.62, 0.71, -0.16]}
        rotation={[-0.25, -0.15, -0.06]}
        castShadow
      >
        <Tela color="#c7775a" />
      </RoundedBox>
      {[
        [-0.9, 0.34],
        [0.9, 0.34],
        [-0.9, -0.34],
        [0.9, -0.34],
      ].map(([x, z]) => (
        <Pata key={`${x}${z}`} posicion={[x!, 0, z!]} alto={0.08} />
      ))}
    </group>
  );
}

function Sillon({ color = '#b5835a' }: { color?: string }) {
  return (
    <group>
      <RoundedBox
        args={[0.9, 0.34, 0.84]}
        radius={0.05}
        position={[0, 0.27, 0]}
        castShadow
        receiveShadow
      >
        <Tela color={color} />
      </RoundedBox>
      <RoundedBox args={[0.6, 0.13, 0.64]} radius={0.05} position={[0, 0.5, 0.07]} castShadow>
        <Tela color={tono(color, 1.1)} />
      </RoundedBox>
      <RoundedBox
        args={[0.9, 0.58, 0.18]}
        radius={0.06}
        position={[0, 0.7, -0.33]}
        rotation-x={-0.1}
        castShadow
      >
        <Tela color={color} />
      </RoundedBox>
      {[-0.37, 0.37].map(x => (
        <RoundedBox
          key={x}
          args={[0.16, 0.5, 0.84]}
          radius={0.06}
          position={[x, 0.37, 0]}
          castShadow
        >
          <Tela color={color} />
        </RoundedBox>
      ))}
      {[
        [-0.38, 0.33],
        [0.38, 0.33],
        [-0.38, -0.33],
        [0.38, -0.33],
      ].map(([x, z]) => (
        <Pata key={`${x}${z}`} posicion={[x!, 0, z!]} alto={0.1} />
      ))}
    </group>
  );
}

function Silla({ color = '#7f9a86' }: { color?: string }) {
  return (
    <group>
      <RoundedBox
        args={[0.48, 0.07, 0.46]}
        radius={0.02}
        position={[0, 0.46, 0]}
        castShadow
        receiveShadow
      >
        <Tela color={color} />
      </RoundedBox>
      <RoundedBox
        args={[0.46, 0.38, 0.05]}
        radius={0.02}
        position={[0, 0.74, -0.21]}
        rotation-x={-0.08}
        castShadow
      >
        <Tela color={color} />
      </RoundedBox>
      {[
        [-0.2, 0.19],
        [0.2, 0.19],
        [-0.2, -0.19],
        [0.2, -0.19],
      ].map(([x, z]) => (
        <Pata key={`${x}${z}`} posicion={[x!, 0, z!]} alto={0.43} />
      ))}
    </group>
  );
}

function MesaCentro({ color = '#8a6446' }: { color?: string }) {
  return (
    <group>
      <RoundedBox
        args={[1, 0.05, 0.55]}
        radius={0.02}
        position={[0, 0.4, 0]}
        castShadow
        receiveShadow
      >
        <Madera color={color} />
      </RoundedBox>
      <mesh position={[0, 0.14, 0]} receiveShadow>
        <boxGeometry args={[0.9, 0.02, 0.45]} />
        <Madera color={tono(color, 0.9)} />
      </mesh>
      {[
        [-0.44, 0.22],
        [0.44, 0.22],
        [-0.44, -0.22],
        [0.44, -0.22],
      ].map(([x, z]) => (
        <Pata key={`${x}${z}`} posicion={[x!, 0, z!]} alto={0.38} />
      ))}
      {/* Caja de pañuelos y taza: detalles propios de un consultorio. */}
      <RoundedBox args={[0.22, 0.1, 0.12]} radius={0.015} position={[-0.25, 0.48, 0.05]} castShadow>
        <meshStandardMaterial color="#f1e6d6" roughness={0.8} />
      </RoundedBox>
      <mesh position={[-0.25, 0.54, 0.05]}>
        <boxGeometry args={[0.06, 0.03, 0.04]} />
        <meshStandardMaterial color="#ffffff" roughness={1} />
      </mesh>
      <mesh position={[0.28, 0.47, -0.05]} castShadow>
        <cylinderGeometry args={[0.04, 0.035, 0.09, 16]} />
        <meshStandardMaterial color="#c7775a" roughness={0.4} />
      </mesh>
    </group>
  );
}

function MesaAuxiliar({ color = '#8a6446' }: { color?: string }) {
  return (
    <group>
      <mesh position={[0, 0.54, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.23, 0.23, 0.04, 28]} />
        <Madera color={color} />
      </mesh>
      <mesh position={[0, 0.27, 0]} castShadow>
        <cylinderGeometry args={[0.03, 0.03, 0.52, 10]} />
        <Madera />
      </mesh>
      <mesh position={[0, 0.02, 0]} receiveShadow>
        <cylinderGeometry args={[0.16, 0.18, 0.04, 20]} />
        <Madera />
      </mesh>
      {/* Vaso de agua */}
      <mesh position={[0.07, 0.61, 0.04]}>
        <cylinderGeometry args={[0.035, 0.03, 0.1, 16]} />
        <meshStandardMaterial color="#dff0f5" transparent opacity={0.55} roughness={0.1} />
      </mesh>
    </group>
  );
}

function Escritorio({ color = '#9b7355' }: { color?: string }) {
  return (
    <group>
      <RoundedBox
        args={[1.3, 0.05, 0.65]}
        radius={0.015}
        position={[0, 0.74, 0]}
        castShadow
        receiveShadow
      >
        <Madera color={color} />
      </RoundedBox>
      {[-0.61, 0.61].map(x => (
        <mesh key={x} position={[x, 0.36, 0]} castShadow>
          <boxGeometry args={[0.04, 0.72, 0.6]} />
          <Madera color={tono(color, 0.9)} />
        </mesh>
      ))}
      <mesh position={[0.35, 0.5, 0.01]} castShadow>
        <boxGeometry args={[0.5, 0.42, 0.58]} />
        <Madera color={tono(color, 0.95)} />
      </mesh>
      {/* Portátil abierto */}
      <group position={[-0.2, 0.77, 0.05]}>
        <mesh castShadow>
          <boxGeometry args={[0.36, 0.015, 0.25]} />
          <meshStandardMaterial color="#9ea3a8" metalness={0.5} roughness={0.35} />
        </mesh>
        <mesh position={[0, 0.12, -0.12]} rotation-x={-0.25} castShadow>
          <boxGeometry args={[0.36, 0.24, 0.012]} />
          <meshStandardMaterial color="#2c3036" emissive="#9fb6c9" emissiveIntensity={0.15} />
        </mesh>
      </group>
      {/* Libros apilados */}
      {['#c7775a', '#7f9a86', '#e2b98f'].map((c, i) => (
        <mesh key={c} position={[0.42, 0.785 + i * 0.035, -0.12]} rotation-y={i * 0.2} castShadow>
          <boxGeometry args={[0.24, 0.035, 0.17]} />
          <meshStandardMaterial color={c} roughness={0.8} />
        </mesh>
      ))}
    </group>
  );
}

function Estanteria({ color = '#8a6446', semilla }: { color?: string; semilla: string }) {
  const libros = useMemo(() => {
    const aleatorio = crearAleatorio(semilla);
    const paleta = ['#c7775a', '#7f9a86', '#e2b98f', '#5f6f8c', '#b5835a', '#9c8d80', '#d9a066'];
    const resultado: {
      x: number;
      y: number;
      ancho: number;
      alto: number;
      color: string;
      inclinacion: number;
    }[] = [];
    [0.08, 0.46, 0.84, 1.22].forEach((y, estante) => {
      let x = -0.4;
      while (x < 0.36) {
        const ancho = 0.03 + aleatorio() * 0.035;
        const alto = 0.22 + aleatorio() * 0.1;
        // Dejar algún hueco en cada estante.
        if (aleatorio() < 0.12 && estante > 0) {
          x += 0.12;
          continue;
        }
        resultado.push({
          x: x + ancho / 2,
          y: y + alto / 2 + 0.02,
          ancho,
          alto,
          color: paleta[Math.floor(aleatorio() * paleta.length)]!,
          inclinacion: aleatorio() < 0.08 ? 0.18 : 0,
        });
        x += ancho + 0.004;
      }
    });
    return resultado;
  }, [semilla]);

  return (
    <group>
      {[-0.44, 0.44].map(x => (
        <mesh key={x} position={[x, 0.95, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.03, 1.9, 0.32]} />
          <Madera color={color} />
        </mesh>
      ))}
      {[0.04, 0.44, 0.82, 1.2, 1.58, 1.89].map(y => (
        <mesh key={y} position={[0, y, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.88, 0.03, 0.32]} />
          <Madera color={color} />
        </mesh>
      ))}
      <mesh position={[0, 0.95, -0.155]} receiveShadow>
        <boxGeometry args={[0.88, 1.9, 0.01]} />
        <Madera color={tono(color, 0.8)} />
      </mesh>
      {libros.map((libro, i) => (
        <mesh key={i} position={[libro.x, libro.y, 0.02]} rotation-z={libro.inclinacion} castShadow>
          <boxGeometry args={[libro.ancho, libro.alto, 0.2]} />
          <meshStandardMaterial color={libro.color} roughness={0.85} />
        </mesh>
      ))}
      {/* Maceta pequeña en el último estante */}
      <group position={[0.2, 1.6, 0]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.07, 0.055, 0.12, 14]} />
          <meshStandardMaterial color="#d9c2a3" roughness={0.9} />
        </mesh>
        <mesh position-y={0.13} castShadow>
          <icosahedronGeometry args={[0.1, 0]} />
          <meshStandardMaterial color="#6f8f5f" roughness={0.9} flatShading />
        </mesh>
      </group>
    </group>
  );
}

function Planta({ semilla }: { semilla: string }) {
  const hojas = useMemo(() => {
    const aleatorio = crearAleatorio(semilla);
    return Array.from({ length: 7 }, () => ({
      posicion: [
        (aleatorio() - 0.5) * 0.35,
        0.55 + aleatorio() * 0.5,
        (aleatorio() - 0.5) * 0.35,
      ] as [number, number, number],
      radio: 0.14 + aleatorio() * 0.1,
      color: aleatorio() > 0.5 ? '#6f8f5f' : '#5e7f53',
    }));
  }, [semilla]);

  return (
    <group>
      <mesh position-y={0.18} castShadow receiveShadow>
        <cylinderGeometry args={[0.2, 0.15, 0.36, 18]} />
        <meshStandardMaterial color="#c9a17e" roughness={0.9} />
      </mesh>
      <mesh position-y={0.38}>
        <cylinderGeometry args={[0.19, 0.19, 0.02, 18]} />
        <meshStandardMaterial color="#4a3a2c" roughness={1} />
      </mesh>
      <mesh position-y={0.55}>
        <cylinderGeometry args={[0.015, 0.02, 0.4, 6]} />
        <meshStandardMaterial color="#5a4632" />
      </mesh>
      {hojas.map((hoja, i) => (
        <mesh key={i} position={hoja.posicion} castShadow>
          <icosahedronGeometry args={[hoja.radio, 0]} />
          <meshStandardMaterial color={hoja.color} roughness={0.85} flatShading />
        </mesh>
      ))}
    </group>
  );
}

function LamparaPie({ color = '#f3d9b1' }: { color?: string }) {
  return (
    <group>
      <mesh position-y={0.015} castShadow receiveShadow>
        <cylinderGeometry args={[0.16, 0.18, 0.03, 24]} />
        <meshStandardMaterial color="#3d3530" metalness={0.4} roughness={0.5} />
      </mesh>
      <mesh position-y={0.72} castShadow>
        <cylinderGeometry args={[0.012, 0.012, 1.42, 8]} />
        <meshStandardMaterial color="#3d3530" metalness={0.4} roughness={0.5} />
      </mesh>
      <mesh position-y={1.45}>
        <cylinderGeometry args={[0.15, 0.22, 0.28, 24, 1, true]} />
        <meshStandardMaterial
          color={color}
          emissive="#ffc27a"
          emissiveIntensity={0.7}
          side={DoubleSide}
          roughness={0.9}
        />
      </mesh>
    </group>
  );
}

function Alfombra({ color = '#c47f5e' }: { color?: string }) {
  return (
    <group>
      <RoundedBox args={[2.2, 0.012, 1.6]} radius={0.005} position-y={0.006} receiveShadow>
        <Tela color={color} />
      </RoundedBox>
      <mesh position-y={0.0125} rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[1.8, 1.2]} />
        <Tela color={tono(color, 1.18)} />
      </mesh>
      <mesh position-y={0.013} rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[1.5, 0.9]} />
        <Tela color={color} />
      </mesh>
    </group>
  );
}

function Cuadro({ color = '#d9a066' }: { color?: string }) {
  return (
    <group>
      <mesh castShadow>
        <boxGeometry args={[0.9, 0.65, 0.04]} />
        <meshStandardMaterial color="#e9dfd1" roughness={0.7} />
      </mesh>
      <mesh position-z={0.021}>
        <planeGeometry args={[0.78, 0.53]} />
        <meshStandardMaterial color="#f4ece0" roughness={1} />
      </mesh>
      {/* Composición abstracta: colinas y sol. */}
      <mesh position={[-0.12, -0.08, 0.022]}>
        <circleGeometry args={[0.26, 32, 0, Math.PI]} />
        <meshStandardMaterial color={color} roughness={1} />
      </mesh>
      <mesh position={[0.16, -0.12, 0.023]}>
        <circleGeometry args={[0.2, 32, 0, Math.PI]} />
        <meshStandardMaterial color={tono(color, 0.75)} roughness={1} />
      </mesh>
      <mesh position={[0.2, 0.12, 0.022]}>
        <circleGeometry args={[0.07, 24]} />
        <meshStandardMaterial color="#c7775a" roughness={1} />
      </mesh>
    </group>
  );
}

function Ventana() {
  return (
    <group>
      {/* Cristal "iluminado" por el exterior */}
      <mesh position-z={0.005}>
        <planeGeometry args={[1.2, 1.1]} />
        <meshStandardMaterial color="#e8f1f4" emissive="#fdf3dc" emissiveIntensity={0.85} />
      </mesh>
      {/* Marco y parteluces */}
      {[
        { p: [0, 0.57, 0.03], s: [1.3, 0.06, 0.06] },
        { p: [0, -0.57, 0.03], s: [1.3, 0.06, 0.06] },
        { p: [-0.62, 0, 0.03], s: [0.06, 1.2, 0.06] },
        { p: [0.62, 0, 0.03], s: [0.06, 1.2, 0.06] },
        { p: [0, 0, 0.03], s: [0.035, 1.1, 0.04] },
        { p: [0, 0.1, 0.03], s: [1.2, 0.035, 0.04] },
      ].map(({ p, s }, i) => (
        <mesh key={i} position={p as [number, number, number]} castShadow>
          <boxGeometry args={s as [number, number, number]} />
          <meshStandardMaterial color="#f5efe6" roughness={0.6} />
        </mesh>
      ))}
      {/* Alféizar */}
      <mesh position={[0, -0.62, 0.08]} castShadow receiveShadow>
        <boxGeometry args={[1.45, 0.04, 0.18]} />
        <meshStandardMaterial color="#f5efe6" roughness={0.6} />
      </mesh>
      {/* Cortinas */}
      {[-0.82, 0.82].map(x => (
        <RoundedBox
          key={x}
          args={[0.32, 1.6, 0.06]}
          radius={0.03}
          position={[x, -0.05, 0.1]}
          castShadow
        >
          <Tela color="#e7c9a9" />
        </RoundedBox>
      ))}
      <mesh position={[0, 0.8, 0.12]} rotation-z={Math.PI / 2}>
        <cylinderGeometry args={[0.015, 0.015, 2.1, 8]} />
        <meshStandardMaterial color="#6e4f3c" />
      </mesh>
    </group>
  );
}

function Reloj() {
  return (
    <group>
      <mesh rotation-x={Math.PI / 2}>
        <cylinderGeometry args={[0.17, 0.17, 0.04, 32]} />
        <meshStandardMaterial color="#5c4030" roughness={0.5} />
      </mesh>
      <mesh position-z={0.021}>
        <circleGeometry args={[0.145, 32]} />
        <meshStandardMaterial color="#fbf7f0" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.04, 0.025]}>
        <boxGeometry args={[0.012, 0.09, 0.004]} />
        <meshStandardMaterial color="#2b2522" />
      </mesh>
      <mesh position={[0.045, 0, 0.026]} rotation-z={Math.PI / 2}>
        <boxGeometry args={[0.01, 0.1, 0.004]} />
        <meshStandardMaterial color="#2b2522" />
      </mesh>
    </group>
  );
}

interface MuebleProceduralProps {
  tipo: TipoMueble;
  color?: string;
  /** Semilla para las variaciones deterministas (libros, hojas). */
  semilla: string;
}

/** Devuelve la versión procedural del tipo de mueble indicado. */
export function MuebleProcedural({ tipo, color, semilla }: MuebleProceduralProps) {
  switch (tipo) {
    case 'sofa':
      return <Sofa color={color} />;
    case 'sillon':
      return <Sillon color={color} />;
    case 'silla':
      return <Silla color={color} />;
    case 'mesa-centro':
      return <MesaCentro color={color} />;
    case 'mesa-auxiliar':
      return <MesaAuxiliar color={color} />;
    case 'escritorio':
      return <Escritorio color={color} />;
    case 'estanteria':
      return <Estanteria color={color} semilla={semilla} />;
    case 'planta':
      return <Planta semilla={semilla} />;
    case 'lampara-pie':
      return <LamparaPie color={color} />;
    case 'alfombra':
      return <Alfombra color={color} />;
    case 'cuadro':
      return <Cuadro color={color} />;
    case 'ventana':
      return <Ventana />;
    case 'reloj':
      return <Reloj />;
    case 'decoracion':
      // Solo existe como GLB: si no carga, simplemente no se muestra.
      return null;
  }
}
