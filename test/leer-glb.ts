import { readFileSync } from 'node:fs';
import path from 'node:path';

import { type Group } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

import { type GlbCargado } from '@/lib/npc/cargar-glb';

/**
 * Lee un GLB de `public/` con el mismo cargador que usa el navegador. Úsalo en tests con
 * `// @vitest-environment node`: GLTFLoader comprueba `instanceof ArrayBuffer`, que falla entre
 * el realm de Node y el de jsdom.
 */
export async function leerGlb(url: string): Promise<GlbCargado> {
  const datos = readFileSync(path.join(process.cwd(), 'public', url));
  const buffer = datos.buffer.slice(datos.byteOffset, datos.byteOffset + datos.byteLength);
  const gltf = await new GLTFLoader().parseAsync(buffer, '');
  return { escena: gltf.scene as Group, animaciones: gltf.animations };
}
