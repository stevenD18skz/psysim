'use client';

import { OrbitControls } from '@react-three/drei';
import { Canvas, useFrame } from '@react-three/fiber';
import { use, useEffect, useId, useMemo, useState } from 'react';
import { PCFShadowMap, Vector3 } from 'three';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { duracionEscritura } from '@/components/simulacion/use-texto-progresivo';
import { planVoz } from '@/lib/audio/voz';
import {
  type EmocionNpc,
  EMOCIONES_NPC,
  type IntensidadEmocion,
} from '@/lib/conversacion/emociones';
import { ESTADOS_NPC, type EstadoNpc } from '@/lib/conversacion/estados-npc';
import { AnimadorPaciente } from '@/lib/npc/animador-paciente';
import { cargarGlb } from '@/lib/npc/cargar-glb';
import { type ModeloNpc, urlModeloNpc } from '@/lib/npc/catalogo';
import { type GestoPaciente, gestoDeRespuesta } from '@/lib/npc/comportamiento';
import { GESTOS_PROCEDURALES, METADATOS_GESTOS } from '@/lib/npc/repertorio-gestos';
import { cn } from '@/lib/utils';

/** Altura del asiento de la silla del laboratorio (m), la de las escenas de la simulación. */
const ALTURA_ASIENTO = 0.56;
/** Los ojos del estudiante sentado frente al paciente. */
const CAMARA_ESTUDIANTE: [number, number, number] = [0, 1.25, 1.7];
const MIRAR_A: [number, number, number] = [0, 0.95, 0];

const CLIPS: { id: GestoPaciente; etiqueta: string }[] = [
  { id: 'yes', etiqueta: 'Asentir (clip)' },
  { id: 'no', etiqueta: 'Negar (clip)' },
  { id: 'wave', etiqueta: 'Saludar (clip)' },
];

/** Silla sencilla: asiento, respaldo y patas, con la altura de asiento de las escenas. */
function Silla() {
  const madera = '#8a6a4f';
  const patas: [number, number][] = [
    [-0.22, -0.2],
    [0.22, -0.2],
    [-0.22, 0.2],
    [0.22, 0.2],
  ];
  return (
    <group position={[0, 0, -0.02]}>
      <mesh position={[0, ALTURA_ASIENTO - 0.03, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.5, 0.06, 0.46]} />
        <meshStandardMaterial color={madera} />
      </mesh>
      <mesh position={[0, ALTURA_ASIENTO + 0.32, -0.22]} castShadow>
        <boxGeometry args={[0.5, 0.6, 0.05]} />
        <meshStandardMaterial color={madera} />
      </mesh>
      {patas.map(([x, z]) => (
        <mesh key={`${x}${z}`} position={[x, (ALTURA_ASIENTO - 0.06) / 2, z]} castShadow>
          <boxGeometry args={[0.04, ALTURA_ASIENTO - 0.06, 0.04]} />
          <meshStandardMaterial color={madera} />
        </mesh>
      ))}
    </group>
  );
}

function BuclePaciente({ animador }: { animador: AnimadorPaciente }) {
  const camara = useMemo(() => new Vector3(), []);
  useFrame(({ camera }, delta) => {
    animador.avanzar(Math.min(delta, 0.1), camera.getWorldPosition(camara));
  });
  return null;
}

export interface PacienteVisorProps {
  modelo: ModeloNpc;
  className?: string;
}

/**
 * Paciente sentado del laboratorio: el mismo `AnimadorPaciente` de la simulación, en una silla,
 * con controles para forzar su estado, emoción e intensidad, disparar cada gesto y probar los
 * gestos al hablar con una frase. Sirve para revisar el lenguaje no verbal sin conversar con la
 * IA. Suspende mientras descarga el GLB.
 */
export default function PacienteVisor({ modelo, className }: PacienteVisorProps) {
  const glb = use(cargarGlb(urlModeloNpc(modelo)));
  const [reducido, setReducido] = useState(false);
  const [espontaneos, setEspontaneos] = useState(false);
  const [estado, setEstado] = useState<EstadoNpc>('esperando_input');
  const [emocion, setEmocion] = useState<EmocionNpc>('neutral');
  const [intensidad, setIntensidad] = useState<IntensidadEmocion>(2);
  const [frase, setFrase] = useState('Pues… no sé. Me duele mucho todo esto, ¿sabe?');
  const idEstado = useId();
  const idEmocion = useId();
  const idFrase = useId();

  // Movimiento reducido se fija al crear el animador: cambiarlo monta uno nuevo.
  const animador = useMemo(
    () =>
      new AnimadorPaciente(glb, {
        postura: 'sentado',
        alturaAsiento: ALTURA_ASIENTO,
        movimientoReducido: reducido,
      }),
    [glb, reducido]
  );
  useEffect(() => animador.montar(), [animador]);
  useEffect(() => animador.permitirGestosEspontaneos(espontaneos), [animador, espontaneos]);
  useEffect(() => {
    animador.actualizarConducta(estado, emocion, intensidad);
  }, [animador, estado, emocion, intensidad]);

  // Respuesta de prueba: habla la frase con su gesto inicial y vuelve a escuchar al terminar.
  const decir = () => {
    const gesto = gestoDeRespuesta(frase);
    if (gesto) animador.hacerGesto(gesto);
    setEstado('respondiendo');
    animador.actualizarConducta('respondiendo', emocion, intensidad);
    animador.hablar(planVoz(frase, modelo.voz, emocion, duracionEscritura(frase)), frase);
  };
  useEffect(() => {
    if (estado !== 'respondiendo') return;
    const espera = setTimeout(
      () => setEstado('esperando_input'),
      duracionEscritura(frase) * 1000 + 600
    );
    return () => clearTimeout(espera);
  }, [estado, frase]);

  const selector = 'h-8 rounded-lg border border-input bg-transparent px-2 text-sm';

  return (
    <div
      className={cn(
        'grid min-h-0 grid-rows-[62vh_auto] lg:grid-cols-[minmax(0,1fr)_340px] lg:grid-rows-1',
        className
      )}
    >
      <div className="relative min-h-0 overflow-hidden">
        <Canvas
          flat
          shadows={{ type: PCFShadowMap }}
          dpr={[1, 2]}
          camera={{ fov: 40, near: 0.01, far: 100, position: CAMARA_ESTUDIANTE }}
          gl={{ antialias: true, preserveDrawingBuffer: true }}
          aria-label="Vista 3D del paciente sentado"
          role="img"
        >
          <color attach="background" args={['#f3efe8']} />
          <hemisphereLight args={[0xffffff, 0xd8d2c4, 1]} />
          <directionalLight
            position={[2.5, 5, 4]}
            intensity={2.2}
            castShadow
            shadow-mapSize={[2048, 2048]}
            shadow-bias={-0.0002}
          />
          <directionalLight position={[-4, 3, -3]} intensity={0.5} color={0xfff4e6} />
          <mesh rotation-x={-Math.PI / 2} receiveShadow>
            <planeGeometry args={[40, 40]} />
            <shadowMaterial opacity={0.18} />
          </mesh>
          <Silla />
          <primitive object={animador.modelo} />
          <OrbitControls makeDefault target={MIRAR_A} enableDamping dampingFactor={0.08} />
          <BuclePaciente animador={animador} />
        </Canvas>
        <p className="pointer-events-none absolute bottom-3 left-4 text-xs text-muted-foreground">
          La cámara empieza donde se sienta el estudiante · arrastra para orbitar
        </p>
      </div>

      <div className="flex flex-col gap-5 overflow-y-auto border-t bg-card p-4 lg:border-t-0 lg:border-l">
        <section className="flex flex-col gap-3">
          <h3 className="border-b pb-1 text-sm font-semibold">Conducta</h3>
          <div className="grid grid-cols-[5.5rem_minmax(0,1fr)] items-center gap-2 text-sm">
            <label htmlFor={idEstado} className="text-muted-foreground">
              Estado
            </label>
            <select
              id={idEstado}
              value={estado}
              onChange={e => setEstado(e.target.value as EstadoNpc)}
              className={selector}
            >
              {ESTADOS_NPC.map(id => (
                <option key={id}>{id}</option>
              ))}
            </select>
            <label htmlFor={idEmocion} className="text-muted-foreground">
              Emoción
            </label>
            <select
              id={idEmocion}
              value={emocion}
              onChange={e => setEmocion(e.target.value as EmocionNpc)}
              className={selector}
            >
              {EMOCIONES_NPC.map(id => (
                <option key={id}>{id}</option>
              ))}
            </select>
            <span className="text-muted-foreground">Intensidad</span>
            <div role="radiogroup" aria-label="Intensidad" className="flex gap-1.5">
              {([1, 2, 3] as const).map(n => (
                <Button
                  key={n}
                  size="sm"
                  role="radio"
                  aria-checked={intensidad === n}
                  variant={intensidad === n ? 'default' : 'outline'}
                  onClick={() => setIntensidad(n)}
                >
                  {n}
                </Button>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-1.5 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={espontaneos}
                onChange={e => setEspontaneos(e.target.checked)}
              />
              Gestos espontáneos
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={reducido}
                onChange={e => setReducido(e.target.checked)}
              />
              Movimiento reducido
            </label>
          </div>
        </section>

        <section className="flex flex-col gap-3">
          <h3 className="border-b pb-1 text-sm font-semibold">Gestos</h3>
          <div className="flex flex-wrap gap-1.5">
            {GESTOS_PROCEDURALES.map(id => (
              <Button key={id} size="sm" variant="outline" onClick={() => animador.hacerGesto(id)}>
                {METADATOS_GESTOS[id].etiqueta}
              </Button>
            ))}
            {CLIPS.map(({ id, etiqueta }) => (
              <Button key={id} size="sm" variant="ghost" onClick={() => animador.hacerGesto(id)}>
                {etiqueta}
              </Button>
            ))}
          </div>
        </section>

        <section className="flex flex-col gap-3">
          <h3 className="border-b pb-1 text-sm font-semibold">Al hablar</h3>
          <form
            className="flex flex-col gap-2"
            onSubmit={e => {
              e.preventDefault();
              decir();
            }}
          >
            <label htmlFor={idFrase} className="text-xs text-muted-foreground">
              Frase del paciente (ademanes y frases clave)
            </label>
            <Input
              id={idFrase}
              value={frase}
              onChange={e => setFrase(e.target.value)}
              maxLength={200}
            />
            <Button size="sm" type="submit" className="self-start">
              Decir la frase
            </Button>
          </form>
        </section>
      </div>
    </div>
  );
}
