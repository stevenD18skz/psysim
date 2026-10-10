// @vitest-environment node
// (GLTFLoader comprueba `instanceof ArrayBuffer`, que falla entre el realm de Node y el de jsdom.)

import { type Bone, type Object3D, Vector3 } from 'three';
import { afterEach, describe, expect, it } from 'vitest';

import { type Silaba } from '@/lib/audio/voz';

import { leerGlb } from '../../../test/leer-glb';

import { AnimadorPaciente } from './animador-paciente';
import { buscarModeloNpc, urlModeloNpc } from './catalogo';
import { BOCA_CERRADA, formaHabla } from './rostro';

const FRENTE = new Vector3(0, 1.25, 1.7);
const glb = (id = 'rosa') => leerGlb(urlModeloNpc(buscarModeloNpc(id)));

const desmontar: (() => void)[] = [];
afterEach(() => desmontar.splice(0).forEach(fn => fn()));

async function paciente(id = 'rosa') {
  const animador = new AnimadorPaciente(await glb(id), { postura: 'sentado', alturaAsiento: 0.56 });
  desmontar.push(animador.montar());
  return animador;
}

function avanzar(animador: AnimadorPaciente, segundos: number) {
  for (let i = 0; i < Math.round(segundos * 60); i++) animador.avanzar(1 / 60, FRENTE);
}

function buscar(raiz: Object3D, nombre: string): Object3D | undefined {
  let encontrado: Object3D | undefined;
  raiz.traverse(o => {
    if (o.name === nombre) encontrado ??= o;
  });
  return encontrado;
}

/** Altura de la ceja izquierda (el primer pivote del rostro) respecto de la cabeza. */
function alturaCeja(animador: AnimadorPaciente): number {
  return buscar(animador.modelo, 'rostro')!.children[0]!.position.y;
}

const silaba = (inicio: number, formante: number): Silaba => ({
  inicio,
  duracion: 0.1,
  tono: 180,
  formante,
  volumen: 1,
});

describe('formaHabla', () => {
  it('abre la boca a mitad de la sílaba y la cierra entre sílabas', () => {
    const plan = [silaba(0, 900), silaba(0.2, 450)];
    expect(formaHabla(plan, 0.05).apertura).toBeGreaterThan(0.9);
    expect(formaHabla(plan, 0.15)).toEqual(BOCA_CERRADA);
    expect(formaHabla(plan, 1)).toEqual(BOCA_CERRADA);
  });

  it('la "a" abre más que la "u", que redondea los labios', () => {
    const a = formaHabla([silaba(0, 900)], 0.05);
    const u = formaHabla([silaba(0, 450)], 0.05);
    expect(a.apertura).toBeGreaterThan(u.apertura);
    expect(u.redondez).toBeGreaterThan(0.9);
    expect(u.ancho).toBeLessThan(a.ancho);
  });
});

describe('rostro del paciente', () => {
  it.each(['rosa', 'tomas', 'lucia', 'marina', 'leo', 'ernesto'])(
    '%s tiene cejas, párpados y boca colgados de la cabeza',
    async id => {
      const animador = await paciente(id);
      const rostro = buscar(animador.modelo, 'rostro');
      expect(rostro).toBeDefined();
      expect((rostro!.parent as Bone).name).toBe('head');
      // 2 cejas + 2 párpados + boca.
      expect(rostro!.children).toHaveLength(5);
    }
  );

  it('al desmontar se quita y se puede volver a montar (StrictMode)', async () => {
    const animador = new AnimadorPaciente(await glb(), { postura: 'sentado', alturaAsiento: 0.56 });
    animador.montar()();
    expect(buscar(animador.modelo, 'rostro')).toBeUndefined();
    desmontar.push(animador.montar());
    expect(buscar(animador.modelo, 'rostro')).toBeDefined();
  });

  it('con la tristeza bajan los párpados; con la ansiedad suben las cejas', async () => {
    const animador = await paciente();
    animador.actualizarConducta('respondiendo', 'neutral');
    avanzar(animador, 3);
    const cierreNeutral = animador.cierreParpados;
    const cejaNeutral = alturaCeja(animador);

    animador.actualizarConducta('respondiendo', 'triste');
    avanzar(animador, 3);
    expect(animador.cierreParpados).toBeGreaterThan(cierreNeutral + 0.2);

    animador.actualizarConducta('respondiendo', 'ansioso');
    avanzar(animador, 3);
    expect(alturaCeja(animador)).toBeGreaterThan(cejaNeutral + 0.003);
  });
});
