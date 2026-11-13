import { afterEach, describe, expect, it, vi } from 'vitest';

import { getOrquestadorEnv, getProveedorIa, reiniciarOrquestadorEnv } from './orquestador';

const BASE = {
  ORQUESTADOR_URL: 'https://orquestador.test/',
  ORQUESTADOR_CORREO: 'Docente@CorreoUnivalle.edu.co',
  ORQUESTADOR_CONTRASENA: 'secreta-1',
};

function conEntorno(variables: Record<string, string | undefined>) {
  reiniciarOrquestadorEnv();
  for (const nombre of ['IA_PROVEEDOR', 'ORQUESTADOR_CUENTAS', ...Object.keys(BASE)]) {
    vi.stubEnv(nombre, variables[nombre] ?? '');
  }
}

afterEach(() => {
  vi.unstubAllEnvs();
  reiniciarOrquestadorEnv();
});

describe('getProveedorIa', () => {
  it('sin configurar, el paciente lo responde Gemini', () => {
    conEntorno({});
    expect(getProveedorIa()).toBe('gemini');
  });

  it('acepta orquestador y rechaza un valor desconocido', () => {
    conEntorno({ IA_PROVEEDOR: 'orquestador' });
    expect(getProveedorIa()).toBe('orquestador');

    conEntorno({ IA_PROVEEDOR: 'openai' });
    expect(() => getProveedorIa()).toThrow(/IA_PROVEEDOR/);
  });
});

describe('getOrquestadorEnv', () => {
  it('modo de una sola cuenta: sin grupo, normaliza la URL y el correo', () => {
    conEntorno(BASE);
    expect(getOrquestadorEnv()).toEqual({
      url: 'https://orquestador.test',
      docente: { correo: 'docente@correounivalle.edu.co', contrasena: 'secreta-1' },
      grupo: [],
    });
  });

  it('lee el grupo de cuentas y descarta la teacher si alguien la repite ahí', () => {
    conEntorno({
      ...BASE,
      ORQUESTADOR_CUENTAS: JSON.stringify([
        { correo: 'grupo1@psysim.test', contrasena: 'con,coma:y"comillas' },
        { correo: 'docente@correounivalle.edu.co', contrasena: 'secreta-1' },
      ]),
    });
    expect(getOrquestadorEnv().grupo).toEqual([
      { correo: 'grupo1@psysim.test', contrasena: 'con,coma:y"comillas' },
    ]);
  });

  it('falla si faltan la URL o las credenciales, sin mostrar valores', () => {
    conEntorno({ ORQUESTADOR_URL: BASE.ORQUESTADOR_URL });
    expect(() => getOrquestadorEnv()).toThrow(/ORQUESTADOR_CORREO[\s\S]*ORQUESTADOR_CONTRASENA/);
  });

  it.each([
    ['no es JSON', 'grupo1@psysim.test:clave'],
    ['no es una lista de cuentas', '[{"correo":"sin-arroba","contrasena":"secreta-9"}]'],
    ['contraseña corta', '[{"correo":"g@psysim.test","contrasena":"123"}]'],
    [
      'cuenta repetida',
      '[{"correo":"g@psysim.test","contrasena":"secreta-2"},{"correo":"G@psysim.test","contrasena":"secreta-3"}]',
    ],
  ])('rechaza un grupo mal escrito (%s) sin citar su contenido', (_, valor) => {
    conEntorno({ ...BASE, ORQUESTADOR_CUENTAS: valor });
    let mensaje = '';
    try {
      getOrquestadorEnv();
    } catch (error) {
      mensaje = (error as Error).message;
    }
    expect(mensaje).toMatch(/ORQUESTADOR_CUENTAS/);
    expect(mensaje).not.toMatch(/secreta|psysim\.test|clave/);
  });
});
