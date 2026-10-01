// @vitest-environment node
// (GLTFLoader comprueba `instanceof ArrayBuffer`, que falla entre el realm de Node y el de jsdom.)

import { readFileSync } from 'node:fs';
import path from 'node:path';

import { Box3, type Group } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { describe, expect, it, vi } from 'vitest';

import { ACCIONES_NPC, esAccionNpc, metaAccion, METADATOS_ACCIONES } from './acciones';
import { type GlbCargado } from './cargar-glb';
import { buscarModeloNpc, CATALOGO_NPC, NPC_POR_DEFECTO, urlModeloNpc } from './catalogo';
import { ControladorNpc } from './controlador-npc';

/** Huesos que la interfaz y el controlador dan por hechos (cabeza, globo, pose manual…). */
const HUESOS_BASICOS = ['root', 'hips', 'spine', 'neck', 'head', 'upperArm_R', 'thigh_L'];

/** Lee un GLB de `public/` con el mismo cargador que usa el navegador. */
async function leerGlb(url: string): Promise<GlbCargado> {
  const datos = readFileSync(path.join(process.cwd(), 'public', url));
  const buffer = datos.buffer.slice(datos.byteOffset, datos.byteOffset + datos.byteLength);
  const gltf = await new GLTFLoader().parseAsync(buffer, '');
  return { escena: gltf.scene as Group, animaciones: gltf.animations };
}

describe('acciones del NPC', () => {
  it('cada acción tiene metadatos, en el mismo orden y con una tecla única', () => {
    expect(METADATOS_ACCIONES.map(m => m.id)).toEqual([...ACCIONES_NPC]);
    const teclas = METADATOS_ACCIONES.map(m => m.tecla);
    expect(new Set(teclas).size).toBe(teclas.length);
  });

  it('solo caminar y correr desplazan al personaje al pasear', () => {
    const conAvance = METADATOS_ACCIONES.filter(m => m.avance).map(m => m.id);
    expect(conAvance).toEqual(['walk', 'run']);
  });

  it('reconoce los identificadores válidos', () => {
    expect(esAccionNpc('wave')).toBe(true);
    expect(esAccionNpc('volar')).toBe(false);
    expect(metaAccion('wave').etiqueta).toBe('Saludar');
  });
});

describe('catálogo de NPC', () => {
  it('no repite identificadores ni archivos', () => {
    expect(new Set(CATALOGO_NPC.map(m => m.id)).size).toBe(CATALOGO_NPC.length);
    expect(new Set(CATALOGO_NPC.map(m => m.archivo)).size).toBe(CATALOGO_NPC.length);
  });

  it('usa el NPC por defecto si el id no existe', () => {
    expect(buscarModeloNpc('rosa').nombre).toBe('Rosa');
    expect(buscarModeloNpc('nadie')).toBe(NPC_POR_DEFECTO);
    expect(buscarModeloNpc(null)).toBe(NPC_POR_DEFECTO);
  });

  it.each(CATALOGO_NPC)('$nombre: GLB con esqueleto y las 13 animaciones', async modelo => {
    const glb = await leerGlb(urlModeloNpc(modelo));

    expect(glb.animaciones.map(c => c.name).sort()).toEqual([...ACCIONES_NPC].sort());
    for (const clip of glb.animaciones) expect(clip.duration).toBeGreaterThan(0);

    const npc = new ControladorNpc(glb);
    expect([...npc.accionesDisponibles].sort()).toEqual([...ACCIONES_NPC].sort());
    expect(npc.huesos.map(b => b.name)).toEqual(expect.arrayContaining(HUESOS_BASICOS));
    expect(npc.nombresHuesos).not.toContain('root');

    // Escala humana (Lucía es una niña de ~1,1 m) con los pies en el suelo.
    const caja = new Box3().setFromObject(npc.modelo);
    expect(caja.min.y).toBeCloseTo(0, 1);
    expect(caja.max.y).toBeGreaterThan(0.9);
    expect(caja.max.y).toBeLessThan(2);
  });
});

describe('ControladorNpc', () => {
  it('reproduce acciones, avisa al terminar y vuelve a reposo', async () => {
    vi.useFakeTimers();
    const npc = new ControladorNpc(await leerGlb(urlModeloNpc(NPC_POR_DEFECTO)));
    const alTerminar = vi.fn();
    const desmontar = npc.montar(alTerminar);
    expect(npc.obtenerEstado().accion).toBe('idle');

    npc.play('wave');
    expect(npc.obtenerEstado().accion).toBe('wave');
    expect(npc.obtenerEstado().globo).toEqual({ texto: '¡Hola, viajero!', visible: true });

    // Avanza más que la duración del clip en pasos de fotograma.
    for (let i = 0; i < 300; i++) npc.avanzar(1 / 60);
    expect(alTerminar).toHaveBeenCalledWith('wave');
    expect(npc.obtenerEstado().accion).toBe('idle');

    vi.advanceTimersByTime(3000);
    expect(npc.obtenerEstado().globo.visible).toBe(false);

    desmontar();
    vi.useRealTimers();
  });

  it('limita la velocidad y la mezcla a sus rangos', async () => {
    const npc = new ControladorNpc(await leerGlb(urlModeloNpc(NPC_POR_DEFECTO)));
    npc.setSpeed(10);
    npc.setFade(-1);
    expect(npc.obtenerEstado()).toMatchObject({ velocidad: 2, mezcla: 0 });
    npc.setSpeed(0);
    expect(npc.obtenerEstado().velocidad).toBe(0.25);
  });

  it('la pose manual detiene la animación y se puede reiniciar', async () => {
    const npc = new ControladorNpc(await leerGlb(urlModeloNpc(NPC_POR_DEFECTO)));
    const desmontar = npc.montar();
    npc.seleccionarHueso('upperArm_R');
    npc.rotarHueso('z', -120);
    expect(npc.obtenerEstado()).toMatchObject({ modoPose: true, accion: null });
    expect(npc.obtenerEstado().rotacion.z).toBe(-120);

    npc.reiniciarPose();
    expect(npc.obtenerEstado().rotacion.z).toBe(0);
    desmontar();
  });
});
