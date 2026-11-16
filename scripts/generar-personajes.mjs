/** Variantes locales reproducibles: conserva rigs/clips originales y reconstruye ropa y pelo. */
import { mkdirSync, statSync } from 'node:fs';
import { NodeIO } from '@gltf-transform/core';
import { prune } from '@gltf-transform/functions';
import {
  BoxGeometry,
  Color,
  Euler,
  LatheGeometry,
  Matrix3,
  Matrix4,
  SphereGeometry,
  Vector2,
  Vector3,
} from 'three';

const io = new NodeIO();
const pantsBase = await io.read('public/models/personajes/npc_leo.glb');
const folder = 'public/models/personajes';
const variants = [
  {
    id: 'julian',
    base: 'leo',
    skin: '#b98260',
    hair: '#30251f',
    top: '#416b96',
    pants: '#303b4a',
    shoes: '#e2e0d7',
    shape: 'jacket',
    hairstyle: 'waves',
    width: 1.02,
  },
  {
    id: 'hernan',
    base: 'leo',
    skin: '#a97453',
    hair: '#41362f',
    top: '#80404d',
    pants: '#b9a58a',
    shoes: '#40362f',
    shape: 'polo',
    hairstyle: 'receding',
    width: 1.16,
  },
  {
    id: 'yolanda',
    base: 'lucia',
    skin: '#a16a49',
    hair: '#252322',
    top: '#69744e',
    pants: '#353d38',
    shoes: '#51483d',
    shape: 'blouse',
    hairstyle: 'braid',
    width: 1.04,
  },
  {
    id: 'sara',
    base: 'lucia',
    skin: '#be8c6b',
    hair: '#46312a',
    top: '#9b84b3',
    pants: '#3d5677',
    shoes: '#e2dce7',
    shape: 'hoodie',
    hairstyle: 'ponytail',
    width: 0.98,
  },
  {
    id: 'daniela',
    base: 'lucia',
    skin: '#a66c4c',
    hair: '#282322',
    top: '#c47764',
    pants: '#495a45',
    shoes: '#e4dcca',
    shape: 'jacket',
    hairstyle: 'curls',
    width: 1.03,
  },
  {
    id: 'paola',
    base: 'lucia',
    skin: '#bd8968',
    hair: '#563a2c',
    top: '#3d737d',
    pants: '#666b70',
    shoes: '#3b3736',
    shape: 'blouse',
    hairstyle: 'bob',
    width: 1.07,
  },
];

mkdirSync(folder, { recursive: true });
for (const spec of variants) {
  const doc = await io.read(`${folder}/npc_${spec.base}.glb`);
  const root = doc.getRoot();
  const mesh = root.listMeshes()[0];
  const skin = root.listSkins()[0];
  const joints = skin.listJoints();
  const joint = name => {
    const index = joints.findIndex(n => n.getName() === name);
    if (index < 0) throw new Error(`Falta ${name}`);
    return index;
  };
  const buffer = root.listBuffers()[0];
  const groups = new Map();
  const materials = new Map();
  for (const mat of root.listMaterials()) {
    const suffix = mat.getName().slice(spec.base.length + 1);
    mat.setName(`${spec.id}_${suffix}`);
    materials.set(suffix, mat);
  }
  const paint = (suffix, hex) => {
    let mat = materials.get(suffix);
    if (!mat) {
      mat = doc.createMaterial(`${spec.id}_${suffix}`).setRoughnessFactor(0.9);
      materials.set(suffix, mat);
    }
    mat.setBaseColorFactor([...new Color(hex).toArray(), 1]);
    return mat;
  };
  for (const suffix of ['skin', 'hand']) paint(suffix, spec.skin);
  paint(
    'blush',
    new Color(spec.skin).lerp(new Color('#ba7667'), 0.3).getHexString().replace(/^/, '#')
  );
  for (const suffix of ['top', 'sleeve', 'cuff', 'top2']) paint(suffix, spec.top);
  for (const suffix of ['bottom', 'legs', 'socks']) paint(suffix, spec.pants);
  paint('hair', spec.hair);
  paint('shoes', spec.shoes);
  paint('sole', '#4b4945');
  paint('shirt', '#eee7d6');
  paint('detail', spec.shape === 'hoodie' ? '#dfd1e7' : '#d2c6ad');
  if (spec.id === 'hernan') {
    paint('facialhair', '#4c3e34');
    paint('grey', '#a19a8d');
  }
  function group(suffix) {
    if (!groups.has(suffix)) groups.set(suffix, { p: [], n: [], j: [], w: [], indices: [] });
    return groups.get(suffix);
  }
  // Compacta por material: conserva pesos y normales de las superficies que se reutilizan.
  // Se elimina el cabello original, morral, falda y adornos; no quedan vértices ocultos residuales.
  const keep = new Set([
    'skin',
    'blush',
    'ink',
    'sleeve',
    'cuff',
    'hand',
    'socks',
    'shoes',
    'sole',
  ]);
  if (spec.base === 'leo') keep.add('bottom');
  const surfaces = mesh
    .listPrimitives()
    .map(primitive => ({
      primitive,
      suffix: primitive
        .getMaterial()
        .getName()
        .slice(spec.id.length + 1),
      sourceJoints: joints,
    }))
    .filter(surface => spec.base !== 'lucia' || surface.suffix !== 'bottom');
  if (spec.base === 'lucia') {
    keep.add('bottom');
    for (const primitive of pantsBase.getRoot().listMeshes()[0].listPrimitives()) {
      if (primitive.getMaterial().getName() === 'leo_bottom')
        surfaces.push({
          primitive,
          suffix: 'bottom',
          sourceJoints: pantsBase.getRoot().listSkins()[0].listJoints(),
        });
    }
  }
  for (const { primitive, suffix, sourceJoints } of surfaces) {
    if (!keep.has(suffix)) continue;
    const g = group(suffix),
      remap = new Map();
    for (const v of primitive.getIndices().getArray()) {
      if (!remap.has(v)) {
        remap.set(v, g.p.length / 3);
        const pos = primitive.getAttribute('POSITION').getElement(v, []);
        // Mejillas y mandíbula: variación discreta sin mover ojos ni boca.
        if (suffix === 'skin' && pos[1] > 1.01 && pos[1] < 1.13 && Math.abs(pos[0]) > 0.12)
          pos[0] *= spec.id === 'hernan' ? 1.06 : spec.id === 'paola' ? 0.96 : 1;
        g.p.push(...pos);
        g.n.push(...primitive.getAttribute('NORMAL').getElement(v, []));
        g.j.push(
          ...primitive
            .getAttribute('JOINTS_0')
            .getElement(v, [])
            .map(index => joint(sourceJoints[index].getName()))
        );
        g.w.push(...primitive.getAttribute('WEIGHTS_0').getElement(v, []));
      }
      g.indices.push(remap.get(v));
    }
  }
  function add(suffix, geometry, center, size, bone = 'head', rotation = [0, 0, 0]) {
    const g = group(suffix),
      offset = g.p.length / 3;
    const matrix = new Matrix4().makeRotationFromEuler(new Euler(...rotation));
    matrix.scale(new Vector3(...size));
    matrix.setPosition(...center);
    const normal = new Matrix3().getNormalMatrix(matrix),
      p = new Vector3(),
      n = new Vector3();
    const bi = joint(bone);
    for (let i = 0; i < geometry.attributes.position.count; i++) {
      p.fromBufferAttribute(geometry.attributes.position, i).applyMatrix4(matrix);
      n.fromBufferAttribute(geometry.attributes.normal, i).applyNormalMatrix(normal);
      g.p.push(...p.toArray());
      g.n.push(...n.toArray());
      // Torso con pesos graduales: acompaña tanto columna como pecho.
      if (bone === 'chest' && suffix !== 'hair') {
        const chestWeight = Math.max(0, Math.min(1, (p.y - 0.73) / 0.15));
        const hipWeight = Math.max(0, Math.min(1, (0.68 - p.y) / 0.09));
        g.j.push(joint('hips'), joint('spine'), bi, 0);
        g.w.push(hipWeight, 1 - chestWeight - hipWeight, chestWeight, 0);
      } else {
        g.j.push(bi, 0, 0, 0);
        g.w.push(1, 0, 0, 0);
      }
    }
    for (const index of geometry.index.array) g.indices.push(index + offset);
    geometry.dispose();
  }
  const ellipsoid = (mat, c, s, bone = 'head', segments = 12) =>
    add(mat, new SphereGeometry(1, segments, 8), c, s, bone);
  const box = (mat, c, s, bone = 'chest', rotation) =>
    add(mat, new BoxGeometry(1, 1, 1), c, s, bone, rotation);

  // Torso nuevo: forma redondeada en vez de copiar el buzo o vestido originales.
  const width = 0.175 * spec.width;
  ellipsoid('skin', [0, 0.965, 0], [0.05, 0.065, 0.055], 'neck');
  const outline = [
    [0, 0.565],
    [width * 0.96, 0.565],
    [width, 0.64],
    [width * 0.96, 0.76],
    [width, 0.86],
    [width * 0.85, 0.93],
    [0.065, 0.97],
    [0, 0.97],
  ];
  // La IK mide el relieve por vértices: anillos próximos evitan huecos en su cuadrícula.
  const profile = [];
  for (let i = 0; i < outline.length - 1; i++) {
    const [r0, y0] = outline[i],
      [r1, y1] = outline[i + 1];
    const steps = Math.max(1, Math.ceil((y1 - y0) / 0.02));
    for (let s = 0; s < steps; s++)
      profile.push(new Vector2(r0 + ((r1 - r0) * s) / steps, y0 + ((y1 - y0) * s) / steps));
  }
  profile.push(new Vector2(...outline.at(-1)));
  add('top', new LatheGeometry(profile, 16), [0, 0, 0], [1, 1, 0.78], 'chest');
  if (spec.shape === 'jacket') {
    box('shirt', [0, 0.795, 0.144], [0.13, 0.265, 0.014]);
    for (const side of [-1, 1]) {
      box('top', [side * 0.084, 0.8, 0.15], [0.035, 0.27, 0.017], 'chest', [0, 0, side * -0.1]);
      box('top2', [side * 0.119, 0.704, 0.139], [0.063, 0.06, 0.018]);
    }
  } else if (spec.shape === 'polo') {
    for (const side of [-1, 1])
      box('detail', [side * 0.036, 0.925, 0.115], [0.066, 0.034, 0.014], 'chest', [
        0,
        0,
        side * 0.35,
      ]);
    box('top2', [0, 0.865, 0.144], [0.021, 0.075, 0.014]);
    for (const y of [0.85, 0.88])
      ellipsoid('detail', [0, y, 0.158], [0.008, 0.008, 0.006], 'chest', 6);
  } else if (spec.shape === 'hoodie') {
    ellipsoid('top', [0, 0.92, -0.095], [0.13, 0.115, 0.09], 'chest');
    box('top2', [0, 0.71, 0.14], [0.19, 0.07, 0.022]);
    for (const side of [-1, 1]) box('detail', [side * 0.035, 0.855, 0.149], [0.006, 0.115, 0.007]);
  } else {
    for (const side of [-1, 1])
      box('top2', [side * 0.038, 0.927, 0.108], [0.066, 0.025, 0.018], 'chest', [0, 0, side * 0.4]);
    box('top2', [0, 0.8, 0.145], [0.012, 0.21, 0.012]);
    for (const y of [0.74, 0.81, 0.88])
      ellipsoid('detail', [0, y, 0.154], [0.007, 0.007, 0.005], 'chest', 6);
  }
  // Casquete abierto por delante: deja visibles ojos y cejas procedurales.
  add(
    'hair',
    new SphereGeometry(1, 16, 8, 0, Math.PI * 2, 0, spec.hairstyle === 'receding' ? 1.1 : 1.24),
    [0, 1.16, -0.008],
    spec.hairstyle === 'receding' ? [0.212, 0.24, 0.2] : [0.224, 0.255, 0.211]
  );
  for (const side of [-1, 1]) ellipsoid('hair', [side * 0.192, 1.245, -0.07], [0.034, 0.083, 0.13]);
  if (spec.hairstyle === 'waves' || spec.hairstyle === 'curls') {
    const curls = spec.hairstyle === 'curls';
    for (let row = 0; row < (curls ? 3 : 2); row++) {
      const theta = 0.35 + row * 0.36;
      for (let i = 0; i < 10; i++) {
        const phi = ((i + row * 0.4) * Math.PI) / 5;
        ellipsoid(
          'hair',
          [
            0.205 * Math.sin(theta) * Math.cos(phi),
            1.16 + 0.245 * Math.cos(theta),
            -0.008 + 0.195 * Math.sin(theta) * Math.sin(phi),
          ],
          curls ? [0.055, 0.049, 0.049] : [0.065, 0.035, 0.05],
          'head',
          8
        );
      }
    }
  }
  if (spec.hairstyle === 'receding') {
    for (const side of [-1, 1]) {
      ellipsoid('grey', [side * 0.204, 1.244, -0.068], [0.019, 0.045, 0.07]);
      ellipsoid('facialhair', [side * 0.024, 1.112, 0.199], [0.03, 0.012, 0.013]);
    }
  }
  if (spec.hairstyle === 'braid') {
    ellipsoid('hair', [0, 1.213, -0.18], [0.17, 0.14, 0.075]);
    for (let i = 0; i < 7; i++)
      ellipsoid(
        'hair',
        [(i % 2 ? 1 : -1) * 0.012, 1.17 - i * 0.04, -0.232],
        [0.04 - i * 0.002, 0.032, 0.036]
      );
    ellipsoid('detail', [0, 0.92, -0.232], [0.022, 0.012, 0.024]);
  }
  if (spec.hairstyle === 'ponytail') {
    ellipsoid('hair', [0, 1.285, -0.233], [0.062, 0.067, 0.07]);
    ellipsoid('hair', [0, 1.155, -0.272], [0.057, 0.135, 0.061]);
    ellipsoid('detail', [0, 1.275, -0.241], [0.065, 0.015, 0.045]);
  }
  if (spec.hairstyle === 'bob') {
    ellipsoid('hair', [0, 1.115, -0.175], [0.2, 0.18, 0.061]);
    for (const side of [-1, 1])
      ellipsoid('hair', [side * 0.193, 1.115, -0.055], [0.045, 0.18, 0.105]);
  }
  for (const primitive of mesh.listPrimitives()) mesh.removePrimitive(primitive);
  for (const [suffix, g] of groups) {
    const accessor = (name, type, array) =>
      doc
        .createAccessor(`${spec.id}_${suffix}_${name}`)
        .setType(type)
        .setArray(array)
        .setBuffer(buffer);
    const primitive = doc.createPrimitive().setMaterial(materials.get(suffix));
    primitive.setAttribute('POSITION', accessor('pos', 'VEC3', new Float32Array(g.p)));
    primitive.setAttribute('NORMAL', accessor('normal', 'VEC3', new Float32Array(g.n)));
    primitive.setAttribute('JOINTS_0', accessor('joints', 'VEC4', new Uint16Array(g.j)));
    primitive.setAttribute('WEIGHTS_0', accessor('weights', 'VEC4', new Float32Array(g.w)));
    primitive.setIndices(accessor('indices', 'SCALAR', new Uint16Array(g.indices)));
    mesh.addPrimitive(primitive);
  }
  for (const node of root.listNodes())
    if (node.getName().startsWith(`npc_${spec.base}`))
      node.setName(node.getName().replace(`npc_${spec.base}`, `npc_${spec.id}`));
  mesh.setName(`npc_${spec.id}_body`);
  root.listScenes()[0].setName(`npc_${spec.id}`);
  root.setExtras({
    variante: spec.id,
    base: spec.base,
    generador: 'scripts/generar-personajes.mjs',
    version: 1,
  });
  await doc.transform(prune({ keepLeaves: true }));
  const output = `${folder}/npc_${spec.id}.glb`;
  await io.write(output, doc);
  console.log(
    `${output}: ${(statSync(output).size / 1024).toFixed(0)} KiB, ${mesh.listPrimitives().length} materiales, ${root.listAnimations().length} clips`
  );
}
