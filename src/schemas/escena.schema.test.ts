import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';
import { type z } from 'zod';

import { escenaSchema, rutaModeloSchema } from './escena.schema';

const DIRECTORIO_ESCENAS = path.resolve(process.cwd(), 'public/scenes');
const archivos = readdirSync(DIRECTORIO_ESCENAS).filter(nombre => nombre.endsWith('.json'));

function leerEscena(nombre: string): unknown {
  return JSON.parse(readFileSync(path.join(DIRECTORIO_ESCENAS, nombre), 'utf8'));
}

describe('archivos de escena en public/scenes', () => {
  it('existe una escena para cada uno de los seis escenarios', () => {
    expect(archivos.sort()).toEqual([
      'e-01.json',
      'e-02.json',
      'e-03.json',
      'e-04.json',
      'e-05.json',
      'e-06.json',
    ]);
  });

  it.each(archivos)('%s cumple el esquema', nombre => {
    const resultado = escenaSchema.safeParse(leerEscena(nombre));
    expect(resultado.error?.issues ?? []).toEqual([]);
  });

  it.each(archivos)('%s ubica al paciente dentro de la sala', nombre => {
    const escena = escenaSchema.parse(leerEscena(nombre));
    const [x, , z] = escena.npc.posicion;
    expect(Math.abs(x)).toBeLessThan(escena.sala.ancho / 2);
    expect(Math.abs(z)).toBeLessThan(escena.sala.largo / 2);
  });
});

describe('escenaSchema', () => {
  const base = () => leerEscena('e-01.json') as z.input<typeof escenaSchema>;

  it('aplica valores por defecto', () => {
    const escena = escenaSchema.parse(base());
    const alfombra = escena.mobiliario.find(m => m.id === 'alfombra');
    expect(alfombra?.rotacion).toBe(0);
    expect(alfombra?.escala).toBe(1);
  });

  it('rechaza una cámara fuera de los límites de navegación', () => {
    const escena = base();
    escena.camara.posicion = [10, 1.6, 0];
    const resultado = escenaSchema.safeParse(escena);
    expect(resultado.success).toBe(false);
    expect(resultado.error?.issues[0]?.path).toEqual(['camara', 'posicion']);
  });

  it('rechaza límites invertidos', () => {
    const escena = base();
    escena.navegacion.limites = { min: [1, 1, 1], max: [0, 2, 2] };
    expect(escenaSchema.safeParse(escena).success).toBe(false);
  });

  it('rechaza ids de muebles repetidos', () => {
    const escena = base();
    escena.mobiliario.push({ ...escena.mobiliario[0]! });
    expect(escenaSchema.safeParse(escena).success).toBe(false);
  });
});

describe('rutaModeloSchema', () => {
  it.each(['props/sofa.glb', 'npcs/marta-lucia.glb', 'environments/consultorio_01.glb'])(
    'acepta %s',
    ruta => {
      expect(rutaModeloSchema.safeParse(ruta).success).toBe(true);
    }
  );

  it.each([
    '../secreto.glb',
    'props/../../x.glb',
    '/props/sofa.glb',
    'https://evil.com/x.glb',
    'props/sofa.gltf',
    'Props/Sofa.glb',
  ])('rechaza %s', ruta => {
    expect(rutaModeloSchema.safeParse(ruta).success).toBe(false);
  });
});
