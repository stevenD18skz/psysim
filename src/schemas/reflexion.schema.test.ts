import { describe, expect, it } from 'vitest';

import { guardarReflexionSchema, LIMITE_REFLEXION } from './reflexion.schema';

const SESION_ID = '44444444-4444-4444-8444-444444444444';

describe('guardarReflexionSchema', () => {
  it('recorta los espacios del texto', () => {
    expect(guardarReflexionSchema.parse({ sesionId: SESION_ID, contenido: '  Hola  ' })).toEqual({
      sesionId: SESION_ID,
      contenido: 'Hola',
    });
  });

  it('acepta un texto vacío: así se retira la reflexión', () => {
    expect(guardarReflexionSchema.parse({ sesionId: SESION_ID, contenido: '   ' }).contenido).toBe(
      ''
    );
  });

  it('acepta exactamente el límite y rechaza uno más', () => {
    const justo = 'a'.repeat(LIMITE_REFLEXION);
    expect(
      guardarReflexionSchema.safeParse({ sesionId: SESION_ID, contenido: justo }).success
    ).toBe(true);
    expect(
      guardarReflexionSchema.safeParse({ sesionId: SESION_ID, contenido: `${justo}a` }).success
    ).toBe(false);
  });

  it.each([
    ['una sesión que no es UUID', { sesionId: 'x', contenido: 'a' }],
    ['sin sesión', { contenido: 'a' }],
    ['sin contenido', { sesionId: SESION_ID }],
    ['un contenido que no es texto', { sesionId: SESION_ID, contenido: 12 }],
  ])('rechaza %s', (_, valores) => {
    expect(guardarReflexionSchema.safeParse(valores).success).toBe(false);
  });
});
