import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

import { ACCIONES_NPC, esAccionNpc } from '../../src/lib/npc/acciones';
import { AnimadorPaciente } from '../../src/lib/npc/animador-paciente';
import { CATALOGO_NPC, buscarModeloNpc, urlModeloNpc } from '../../src/lib/npc/catalogo';
import { ControladorNpc } from '../../src/lib/npc/controlador-npc';
import { type EmocionNpc } from '../../src/lib/conversacion/emociones';
import { type GestoPaciente } from '../../src/lib/npc/comportamiento';
import { esGestoProcedural } from '../../src/lib/npc/repertorio-gestos';

const scene = new THREE.Scene();
scene.background = new THREE.Color('#eeeae4');
const camera = new THREE.PerspectiveCamera(32, 1, 0.05, 30);
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setSize(600, 650);
renderer.setPixelRatio(1);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.3;
document.body.append(renderer.domElement);
scene.add(new THREE.HemisphereLight('#fff8ee', '#777e8c', 2.5));
const sun = new THREE.DirectionalLight('#fff5e7', 3);
sun.position.set(3, 5, 4);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
scene.add(sun);
const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(20, 20),
  new THREE.MeshStandardMaterial({ color: '#ddd9d2', roughness: 1 })
);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);
const chair = new THREE.Group();
const chairMat = new THREE.MeshStandardMaterial({ color: '#92988c', roughness: 0.9 });
for (const [size, position] of [
  [
    [0.68, 0.1, 0.64],
    [0, 0.51, -0.05],
  ],
  [
    [0.68, 0.62, 0.08],
    [0, 0.88, -0.33],
  ],
  ...[-0.27, 0.27].flatMap(x =>
    [-0.28, 0.22].map(z => [
      [0.035, 0.48, 0.035],
      [x, 0.24, z],
    ])
  ),
] as [number[], number[]][]) {
  const part = new THREE.Mesh(
    new THREE.BoxGeometry(...(size as [number, number, number])),
    chairMat
  );
  part.position.fromArray(position);
  part.castShadow = true;
  chair.add(part);
}
scene.add(chair);
let actor: AnimadorPaciente | ControladorNpc | undefined;
let cleanup: (() => void) | undefined;
let playing = false;
const observer = new THREE.Vector3(0, 1.25, 3);
const loader = new GLTFLoader();
const selectors = Object.fromEntries(
  ['npc', 'mode', 'action', 'angle'].map(id => [
    id,
    document.getElementById(id) as HTMLSelectElement,
  ])
) as Record<'npc' | 'mode' | 'action' | 'angle', HTMLSelectElement>;
for (const m of CATALOGO_NPC) selectors.npc.add(new Option(m.nombre, m.id));
for (const a of ACCIONES_NPC) selectors.action.add(new Option(a, a));
async function show({
  id = 'leo',
  mode = 'clips',
  action = 'idle',
  angle = 'frente',
  time = 0.6,
  fraction = 0,
  live = false,
  emotion = 'neutral',
  talking = false,
  gesture = '',
  portrait = false,
} = {}) {
  playing = false;
  cleanup?.();
  if (actor) scene.remove(actor.modelo);
  const loaded = await loader.loadAsync(urlModeloNpc(buscarModeloNpc(id)));
  const glb = { escena: loaded.scene, animaciones: loaded.animations };
  actor =
    mode === 'paciente'
      ? new AnimadorPaciente(glb, {
          postura: 'sentado',
          alturaAsiento: 0.56,
          piernas: 'dobladas',
          azar: () => 0.5,
        })
      : new ControladorNpc(glb);
  scene.add(actor.modelo);
  cleanup = actor.montar();
  if (actor instanceof ControladorNpc) actor.play(action as (typeof ACCIONES_NPC)[number]);
  else {
    actor.permitirGestosEspontaneos(false);
    actor.actualizarConducta(
      talking ? 'respondiendo' : gesture === 'think' ? 'procesando' : 'esperando_input',
      emotion as EmocionNpc
    );
    if (talking)
      actor.hablar(
        [{ inicio: 0, duracion: 2, tono: 220, formante: 900, volumen: 0.8 }],
        'Hola, buenas tardes'
      );
    if (gesture && gesture !== 'think') {
      if (!esAccionNpc(gesture) && !esGestoProcedural(gesture))
        throw new Error(`Gesto desconocido: ${gesture}`);
      actor.hacerGesto(gesture as GestoPaciente);
    }
  }
  chair.visible = mode === 'paciente' && !portrait;
  const azimuth = angle === 'perfil' ? Math.PI / 2 : angle === 'espalda' ? Math.PI : 0;
  const targetY =
    portrait && actor instanceof AnimadorPaciente
      ? actor.alturaOjos - 0.035
      : mode === 'paciente'
        ? 0.83
        : 0.65;
  const distance = portrait ? 1.04 : 3.1;
  camera.position.set(
    Math.sin(azimuth) * distance,
    targetY + (portrait ? 0 : 0.25),
    Math.cos(azimuth) * distance
  );
  camera.lookAt(0, targetY, 0);
  const seconds = fraction
    ? (loaded.animations.find(c => c.name === action)?.duration ?? 1) * fraction
    : time;
  for (let i = 0; i < Math.round(seconds * 60); i++) advance(1 / 60);
  renderer.render(scene, camera);
  document.getElementById('label')!.textContent =
    `${buscarModeloNpc(id).nombre} · ${mode === 'paciente' ? gesture || emotion : action}${talking ? ' · habla' : ''} · ${angle}`;
  selectors.npc.value = id;
  selectors.mode.value = mode;
  selectors.action.value = action;
  selectors.angle.value = angle;
  playing = live;
}
function advance(dt: number) {
  if (actor instanceof AnimadorPaciente) actor.avanzar(dt, observer);
  else actor?.avanzar(dt);
}
for (const select of Object.values(selectors))
  select.onchange = () =>
    void show({
      id: selectors.npc.value,
      mode: selectors.mode.value,
      action: selectors.action.value,
      gesture:
        selectors.mode.value === 'paciente' &&
        ['think', 'wave', 'yes', 'no', 'bow'].includes(selectors.action.value)
          ? selectors.action.value
          : '',
      angle: selectors.angle.value,
      live: true,
    });
renderer.setAnimationLoop(() => {
  if (playing) {
    advance(1 / 60);
    renderer.render(scene, camera);
  }
});
const preview = { show, ready: false };
Object.assign(window, { npcPreview: preview });
void show().then(() => {
  preview.ready = true;
});
