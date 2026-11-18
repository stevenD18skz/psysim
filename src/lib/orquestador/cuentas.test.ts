import { describe, expect, it } from 'vitest';

import { type OrquestadorEnv } from '@/lib/env/orquestador';

import {
  claveDeCuenta,
  cuentaDocente,
  cuentaPorClave,
  cuentasDeConversacion,
  cuentasNecesarias,
  elegirCuenta,
  PRACTICAS_POR_CUENTA,
} from './cuentas';

const docente = { correo: 'docente@correounivalle.edu.co', contrasena: 'secreta-1' };
const unaSola: OrquestadorEnv = { url: 'https://o.test', docente, grupo: [] };
const conGrupo: OrquestadorEnv = {
  ...unaSola,
  grupo: [
    { correo: 'grupo1@psysim.test', contrasena: 'secreta-2' },
    { correo: 'grupo2@psysim.test', contrasena: 'secreta-3' },
  ],
};

describe('claveDeCuenta', () => {
  it('es una huella estable del correo, sin mayúsculas ni espacios, que no lo revela', () => {
    const clave = claveDeCuenta('Docente@CorreoUnivalle.edu.co ');
    expect(clave).toBe(claveDeCuenta(docente.correo));
    expect(clave).toMatch(/^[0-9a-f]{16}$/);
    expect(clave).not.toContain('docente');
  });
});

describe('cuentas de conversación', () => {
  it('modo de una sola cuenta: la cuenta teacher es dueña de todas las sesiones', () => {
    const cuentas = cuentasDeConversacion(unaSola);
    expect(cuentas).toHaveLength(1);
    expect(cuentas[0]).toMatchObject({ correo: docente.correo, esDocente: true });
    expect(cuentas[0]!.clave).toBe(cuentaDocente(unaSola).clave);
  });

  it('con grupo: conversan solo las cuentas del grupo, en el orden configurado', () => {
    const cuentas = cuentasDeConversacion(conGrupo);
    expect(cuentas.map(c => c.correo)).toEqual(['grupo1@psysim.test', 'grupo2@psysim.test']);
    expect(cuentas.every(c => !c.esDocente)).toBe(true);
  });

  it('encuentra la cuenta de una práctica por su clave, también la teacher', () => {
    const [primera] = cuentasDeConversacion(conGrupo);
    expect(cuentaPorClave(conGrupo, primera!.clave)?.correo).toBe('grupo1@psysim.test');
    // Una práctica que empezó en el modo de una sola cuenta sigue con la teacher al añadir el grupo.
    expect(cuentaPorClave(conGrupo, claveDeCuenta(docente.correo))?.esDocente).toBe(true);
  });

  it('una cuenta que se quitó del grupo ya no se encuentra', () => {
    expect(cuentaPorClave(unaSola, claveDeCuenta('grupo1@psysim.test'))).toBeNull();
  });
});

describe('elegirCuenta', () => {
  const claves = ['a', 'b', 'c'];

  it('elige la cuenta con menos prácticas activas', () => {
    expect(
      elegirCuenta(
        claves,
        new Map([
          ['a', 3],
          ['b', 1],
          ['c', 2],
        ]),
        null
      )
    ).toEqual({
      clave: 'b',
      lleno: false,
    });
  });

  it('con empate respeta el orden configurado y cuenta como cero la que no tiene prácticas', () => {
    expect(elegirCuenta(claves, new Map([['a', 1]]), null)).toEqual({ clave: 'b', lleno: false });
    expect(elegirCuenta(claves, new Map(), null)).toEqual({ clave: 'a', lleno: false });
  });

  it('sin tope nunca se llena', () => {
    expect(elegirCuenta(['a'], new Map([['a', 40]]), null)).toEqual({ clave: 'a', lleno: false });
  });

  it('con tope, hay cupo mientras alguna cuenta esté por debajo', () => {
    expect(
      elegirCuenta(
        claves,
        new Map([
          ['a', 4],
          ['b', 4],
          ['c', 3],
        ]),
        4
      )
    ).toEqual({
      clave: 'c',
      lleno: false,
    });
  });

  it('con tope, si todas lo alcanzaron no hay cupo y se informa cuántas prácticas hay', () => {
    expect(
      elegirCuenta(
        claves,
        new Map([
          ['a', 4],
          ['b', 5],
          ['c', 4],
        ]),
        4
      )
    ).toEqual({
      clave: null,
      lleno: true,
      enCurso: 13,
    });
  });

  it('modo de una sola cuenta con tope', () => {
    expect(elegirCuenta(['a'], new Map([['a', 2]]), 3)).toEqual({ clave: 'a', lleno: false });
    expect(elegirCuenta(['a'], new Map([['a', 3]]), 3)).toEqual({
      clave: null,
      lleno: true,
      enCurso: 3,
    });
  });

  it('sin cuentas configuradas no hay dónde practicar', () => {
    expect(elegirCuenta([], new Map(), null)).toEqual({ clave: null, lleno: true, enCurso: 0 });
  });
});

describe('cuentasNecesarias', () => {
  it('cada cuenta atiende tres prácticas simultáneas sin esperas', () => {
    expect(PRACTICAS_POR_CUENTA).toBe(3);
    expect(cuentasNecesarias(1)).toBe(1);
    expect(cuentasNecesarias(3)).toBe(1);
    expect(cuentasNecesarias(4)).toBe(2);
    expect(cuentasNecesarias(30)).toBe(10);
    expect(cuentasNecesarias(0)).toBe(1);
  });
});
