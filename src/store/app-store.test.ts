import { describe, expect, it } from 'vitest';

import { type PerfilDocente } from '@/types';

import { crearAppStore } from './app-store';

const perfil: PerfilDocente = {
  id: '8d519f8f-cfb6-4da4-a3f9-1f1467535735',
  nombre: 'Docente de Prueba',
  correo: 'docente@psysim.test',
  codigoInstitucional: 'DOC-0001',
  rol: 'docente',
};

describe('slice auth', () => {
  it('se hidrata con el perfil inicial', () => {
    const store = crearAppStore({ auth: { perfil } });
    expect(store.getState().auth.perfil).toEqual(perfil);
  });

  it('establece y limpia el perfil', () => {
    const store = crearAppStore();
    expect(store.getState().auth.perfil).toBeNull();

    store.getState().auth.establecerPerfil(perfil);
    expect(store.getState().auth.perfil).toEqual(perfil);

    store.getState().auth.limpiar();
    expect(store.getState().auth.perfil).toBeNull();
  });

  it('cada store es independiente (sin estado compartido entre peticiones)', () => {
    const a = crearAppStore({ auth: { perfil } });
    const b = crearAppStore();
    expect(b.getState().auth.perfil).toBeNull();
    a.getState().auth.limpiar();
    expect(a.getState().auth.perfil).toBeNull();
  });
});
