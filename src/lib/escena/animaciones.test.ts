import { describe, expect, it } from 'vitest';

import { clipParaEstado, faseAnimacion, poseProcedural } from './animaciones';

describe('poseProcedural (HU-15)', () => {
  const mirada = { giro: 0.3, cabeceo: 0.1 };

  it('en reposo sigue con la mirada al estudiante y no mueve la boca', () => {
    const pose = poseProcedural('esperando_input', 1, mirada);
    expect(pose.giro).toBeCloseTo(0.24);
    expect(pose.cabeceo).toBeCloseTo(0.1);
    expect(pose.boca).toBe(0);
  });

  it('al procesar baja la cabeza y respira más despacio', () => {
    const reposo = poseProcedural('esperando_input', 1, mirada);
    const pensando = poseProcedural('procesando', 1, mirada);
    expect(pensando.cabeceo).toBeGreaterThan(0.18);
    expect(pensando.periodoRespiracion).toBeGreaterThan(reposo.periodoRespiracion);
  });

  it('al responder mueve la boca', () => {
    const aperturas = [0.1, 0.2, 0.3].map(t => poseProcedural('respondiendo', t, mirada).boca);
    expect(Math.max(...aperturas)).toBeGreaterThan(0.3);
  });

  it('limita el giro de la cabeza aunque el estudiante esté detrás', () => {
    expect(
      Math.abs(poseProcedural('inactivo', 0, { giro: 3, cabeceo: 2 }).giro)
    ).toBeLessThanOrEqual(0.6);
  });
});

const nombres = { idle: 'Idle', pensando: 'Pensando', hablando: 'Hablando' };

describe('animaciones del NPC según su estado (HU-14 · T03, HU-15)', () => {
  it.each([
    ['inactivo', 'idle'],
    ['esperando_input', 'idle'],
    ['procesando', 'pensando'],
    ['respondiendo', 'hablando'],
    ['error_comunicacion', 'idle'],
    ['sesion_finalizada', 'idle'],
  ] as const)('%s → fase %s', (estado, fase) => {
    expect(faseAnimacion(estado)).toBe(fase);
  });

  it('elige el clip de la fase si existe', () => {
    expect(clipParaEstado('procesando', ['Idle', 'Pensando', 'Hablando'], nombres)).toBe(
      'Pensando'
    );
    expect(clipParaEstado('respondiendo', ['Idle', 'Pensando', 'Hablando'], nombres)).toBe(
      'Hablando'
    );
  });

  it('usa el clip de reposo si falta el de la fase', () => {
    expect(clipParaEstado('respondiendo', ['Idle'], nombres)).toBe('Idle');
  });

  it('usa el primer clip disponible si tampoco hay reposo', () => {
    expect(clipParaEstado('inactivo', ['mixamo.com'], nombres)).toBe('mixamo.com');
  });

  it('devuelve null si el modelo no trae animaciones', () => {
    expect(clipParaEstado('inactivo', [], nombres)).toBeNull();
  });

  it('respeta nombres de clips personalizados', () => {
    const propios = { idle: 'Sitting Idle', pensando: 'Thinking', hablando: 'Talking' };
    expect(clipParaEstado('procesando', ['Sitting Idle', 'Thinking'], propios)).toBe('Thinking');
  });
});
