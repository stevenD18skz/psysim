import { type AnimationClip, type Group } from 'three';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

import { RUTA_DRACO } from '@/lib/escena/modelos';

export interface GlbCargado {
  escena: Group;
  animaciones: AnimationClip[];
}

const cache = new Map<string, Promise<GlbCargado>>();
let cargador: GLTFLoader | undefined;

function obtenerCargador(): GLTFLoader {
  if (!cargador) {
    const draco = new DRACOLoader();
    draco.setDecoderPath(RUTA_DRACO);
    cargador = new GLTFLoader().setDRACOLoader(draco);
  }
  return cargador;
}

/**
 * Carga un GLB una sola vez por URL y devuelve siempre la misma promesa (apta para `use()` de
 * React, que suspende hasta que termina). Quien lo use debe clonar la escena: el original queda
 * en caché para volver a mostrarlo sin descargarlo de nuevo. Si falla, se quita de la caché para
 * poder reintentar.
 */
export function cargarGlb(url: string): Promise<GlbCargado> {
  let promesa = cache.get(url);
  if (!promesa) {
    promesa = obtenerCargador()
      .loadAsync(url)
      .then(gltf => ({ escena: gltf.scene, animaciones: gltf.animations }));
    promesa.catch(() => cache.delete(url));
    cache.set(url, promesa);
  }
  return promesa;
}
