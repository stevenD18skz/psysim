import { describe, expect, it } from 'vitest';

import { esCuentaDePrueba, metodosDeAcceso } from './metodo-acceso';

/** Token con la forma de un JWT (cabecera.cuerpo.firma); la firma no se comprueba aquí. */
function token(cuerpo: unknown): string {
  const parte = (valor: unknown) => Buffer.from(JSON.stringify(valor)).toString('base64url');
  return `${parte({ alg: 'ES256' })}.${parte(cuerpo)}.firma`;
}

describe('metodosDeAcceso', () => {
  it('lee el método de una sesión abierta con Google', () => {
    expect(metodosDeAcceso(token({ amr: [{ method: 'oauth', timestamp: 1 }] }))).toEqual(['oauth']);
  });

  it('lee el método de una sesión abierta con contraseña', () => {
    expect(metodosDeAcceso(token({ amr: [{ method: 'password', timestamp: 1 }] }))).toEqual([
      'password',
    ]);
  });

  it('acepta el formato de lista de textos (RFC 8176)', () => {
    expect(metodosDeAcceso(token({ amr: ['password', 'otp'] }))).toEqual(['password', 'otp']);
  });

  it.each([
    ['sin token', null],
    ['vacío', ''],
    ['sin partes', 'no-es-un-jwt'],
    ['cuerpo ilegible', 'a.%%%.c'],
    ['sin amr', token({ sub: 'x' })],
    ['amr con otra forma', token({ amr: 'password' })],
    ['entradas sin método', token({ amr: [{ timestamp: 1 }, 7, null] })],
  ])('%s: devuelve una lista vacía en lugar de fallar', (_, valor) => {
    expect(metodosDeAcceso(valor)).toEqual([]);
  });
});

describe('esCuentaDePrueba', () => {
  it('reconoce el dominio de las cuentas de prueba, sin importar las mayúsculas', () => {
    expect(esCuentaDePrueba('estudiante1@psysim.test')).toBe(true);
    expect(esCuentaDePrueba('Estudiante1@PsySim.Test')).toBe(true);
  });

  it('no confunde un correo real ni un dominio parecido', () => {
    expect(esCuentaDePrueba('ana.perez@correounivalle.edu.co')).toBe(false);
    expect(esCuentaDePrueba('ana@psysim.test.evil.co')).toBe(false);
    expect(esCuentaDePrueba('ana@notpsysim.test')).toBe(false);
    expect(esCuentaDePrueba(null)).toBe(false);
  });
});
