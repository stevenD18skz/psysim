import { describe, expect, it } from 'vitest';

import {
  ajustarCalidad,
  type AvisoRendimiento,
  CALIDAD_INICIAL,
  type CalidadEscena,
  DPR_MAXIMO,
  DPR_REDUCIDO,
} from './calidad';

const recorrer = (avisos: AvisoRendimiento[], desde: CalidadEscena = CALIDAD_INICIAL) =>
  avisos.reduce(ajustarCalidad, desde);

describe('ajustarCalidad', () => {
  it('empieza a 1,5× y con sombras', () => {
    expect(CALIDAD_INICIAL).toMatchObject({ dpr: DPR_MAXIMO, sombras: true, fija: false });
  });

  it('baja la resolución cuando cae el rendimiento y la recupera cuando mejora', () => {
    const baja = recorrer(['baja']);
    expect(baja).toMatchObject({ dpr: DPR_REDUCIDO, sombras: true });
    expect(ajustarCalidad(baja, 'sube')).toMatchObject({ dpr: DPR_MAXIMO, sombras: true });
  });

  // P4-02: un equipo que sostiene 1× pero no 1,5× cambiaba de resolución cada pocos segundos.
  it('tras tres cambios la resolución queda fija en la baja', () => {
    const fija = recorrer(['baja', 'sube', 'baja']);
    expect(fija).toMatchObject({ dpr: DPR_REDUCIDO, fija: true, sombras: true });
    expect(recorrer(['sube', 'sube', 'sube'], fija).dpr).toBe(DPR_REDUCIDO);
  });

  it('apaga las sombras si a 1× sigue lento dos veces seguidas', () => {
    expect(recorrer(['baja', 'baja']).sombras).toBe(true);
    expect(recorrer(['baja', 'baja', 'baja'])).toMatchObject({
      dpr: DPR_REDUCIDO,
      sombras: false,
    });
  });

  it('un aviso de mejora entre dos caídas no apaga las sombras', () => {
    const fija = recorrer(['baja', 'sube', 'baja']);
    expect(recorrer(['baja', 'sube', 'baja'], fija).sombras).toBe(true);
    expect(recorrer(['baja', 'baja'], fija).sombras).toBe(false);
  });

  it('sin sombras no vuelve a subir la resolución ni a encenderlas', () => {
    const sinSombras = recorrer(['baja', 'baja', 'baja']);
    expect(recorrer(['sube', 'sube', 'baja', 'sube'], sinSombras)).toMatchObject({
      dpr: DPR_REDUCIDO,
      sombras: false,
    });
  });

  it('devuelve el mismo objeto cuando nada cambia', () => {
    expect(ajustarCalidad(CALIDAD_INICIAL, 'sube')).toBe(CALIDAD_INICIAL);
    const sinSombras = recorrer(['baja', 'baja', 'baja']);
    expect(ajustarCalidad(sinSombras, 'baja')).toBe(sinSombras);
  });
});
