// @vitest-environment node
import { readFileSync } from 'node:fs';

import { type Node, NodeIO } from '@gltf-transform/core';
import { AnimationMixer, PropertyBinding, SkinnedMesh, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';

import { leerGlb } from '../../../test/leer-glb';

import { ACCIONES_NPC } from './acciones';
import { buscarModeloNpc, urlModeloNpc } from './catalogo';
import { RigNpc } from './rig';

const VARIANTES = [
  ['julian', 'leo', 'e-04'],
  ['hernan', 'leo', 'e-07'],
  ['yolanda', 'lucia', 'e-08'],
  ['sara', 'lucia', 'e-09'],
  ['daniela', 'lucia', 'e-10'],
  ['paola', 'lucia', 'e-11'],
] as const;
const ruta = (id: string) => urlModeloNpc(buscarModeloNpc(id));

describe.each(VARIANTES)('variante %s', (id, base, escena) => {
  it('conserva el rig completo, las matrices de enlace y las pistas de su base', async () => {
    const io = new NodeIO();
    const nuevo = await io.read(`public${ruta(id)}`);
    const original = await io.read(`public${ruta(base)}`);
    const skin = nuevo.getRoot().listSkins()[0]!;
    const originalSkin = original.getRoot().listSkins()[0]!;
    const describir = (n: Node) => ({
      nombre: n.getName(),
      traslacion: n.getTranslation(),
      rotacion: n.getRotation(),
      escala: n.getScale(),
      hijos: n.listChildren().map(h => h.getName()),
    });
    expect(skin.listJoints().map(describir)).toEqual(originalSkin.listJoints().map(describir));
    expect(skin.getInverseBindMatrices()!.getArray()).toEqual(
      originalSkin.getInverseBindMatrices()!.getArray()
    );
    const animations = nuevo.getRoot().listAnimations();
    expect(animations.map(a => a.getName())).toEqual([...ACCIONES_NPC]);
    for (const [i, animation] of animations.entries()) {
      const channels = animation.listChannels();
      const originalChannels = original.getRoot().listAnimations()[i]!.listChannels();
      expect(channels.length).toBe(originalChannels.length);
      for (const [j, channel] of channels.entries()) {
        const reference = originalChannels[j]!;
        expect(channel.getTargetNode()!.getName()).toBe(reference.getTargetNode()!.getName());
        expect(channel.getTargetPath()).toBe(reference.getTargetPath());
        expect(channel.getSampler()!.getInterpolation()).toBe(
          reference.getSampler()!.getInterpolation()
        );
        expect(channel.getSampler()!.getInput()!.getArray()).toEqual(
          reference.getSampler()!.getInput()!.getArray()
        );
        expect(channel.getSampler()!.getOutput()!.getArray()).toEqual(
          reference.getSampler()!.getOutput()!.getArray()
        );
      }
    }
  });

  it('cada clip enlaza sus pistas y deforma vértices sin valores inválidos', async () => {
    const glb = await leerGlb(ruta(id));
    const rig = new RigNpc(glb, 'validacion');
    const mixer = new AnimationMixer(rig.copia);
    const meshes = rig.mallas.filter((m): m is SkinnedMesh => m instanceof SkinnedMesh);
    const punto = new Vector3();
    const muestra = () => {
      rig.raiz.updateMatrixWorld(true);
      return meshes.flatMap(mesh => {
        const pos = mesh.geometry.attributes.position!;
        // Incluye cada superficie de ropa, pelo, ojos y piel en la muestra.
        return Array.from({ length: Math.min(24, pos.count) }, (_, i) => {
          const index = Math.floor((i * (pos.count - 1)) / 23);
          mesh.getVertexPosition(index, punto);
          expect(punto.toArray().every(Number.isFinite)).toBe(true);
          expect(punto.length()).toBeLessThan(10);
          return punto.toArray();
        }).flat();
      });
    };
    try {
      for (const clip of glb.animaciones) {
        for (const track of clip.tracks) {
          const parsed = PropertyBinding.parseTrackName(track.name);
          expect(PropertyBinding.findNode(rig.copia, parsed.nodeName), track.name).toBeTruthy();
          expect(Array.from(track.values).every(Number.isFinite)).toBe(true);
        }
        mixer.stopAllAction();
        mixer.clipAction(clip).reset().play();
        mixer.setTime(clip.duration * 0.13);
        const a = muestra();
        mixer.setTime(clip.duration * 0.61);
        const b = muestra();
        expect(
          b.some((v, i) => Math.abs(v - a[i]!) > 0.00001),
          clip.name
        ).toBe(true);
      }
      for (const mesh of meshes) {
        const { position, normal, skinIndex, skinWeight } = mesh.geometry.attributes;
        expect(normal!.count).toBe(position!.count);
        expect(skinIndex!.count).toBe(position!.count);
        expect(skinWeight!.count).toBe(position!.count);
        for (let v = 0; v < position!.count; v++) {
          let sum = 0;
          for (let k = 0; k < 4; k++) {
            const weight = skinWeight!.getComponent(v, k);
            expect(weight).toBeGreaterThanOrEqual(0);
            sum += weight;
            expect(skinIndex!.getComponent(v, k)).toBeLessThan(mesh.skeleton.bones.length);
          }
          expect(sum).toBeCloseTo(1, 5);
        }
      }
    } finally {
      mixer.stopAllAction();
      mixer.uncacheRoot(rig.copia);
      rig.liberar();
    }
  });

  it('tiene geometría propia y está asignada al caso correspondiente', async () => {
    const glb = await leerGlb(ruta(id));
    const original = await leerGlb(ruta(base));
    const geometria = (modelo: typeof glb) => {
      const positions: number[] = [];
      modelo.escena.traverse(n => {
        if (n instanceof SkinnedMesh) positions.push(...n.geometry.attributes.position!.array);
      });
      return positions;
    };
    expect(geometria(glb)).not.toEqual(geometria(original));
    const json = JSON.parse(readFileSync(`public/scenes/${escena}.json`, 'utf8'));
    expect(json.npc.personaje).toBe(id);
  });
});
