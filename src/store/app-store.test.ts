import { describe, expect, it } from 'vitest';

import { type PerfilDocente, type SesionActiva } from '@/types';

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

const sesion: SesionActiva = {
  id: '5b1c2f0e-8f7a-4a51-9c5e-1b2f3d4e5f60',
  inicio: '2026-09-30T15:00:00.000Z',
  comenzada: true,
  estudiante: { codigo: '202012345', nombre: 'Ana María Pérez' },
  escenario: {
    id: '0f8fad5b-d9cb-469f-a165-70867728950e',
    codigo: 'E-01',
    titulo: 'Duelo y pérdida',
    descripcion: 'Caso de prueba.',
    categoria: 'clinico',
    dificultad: 'basico',
    competenciaCentral: 'Empatía y validación emocional',
    configuracion3d: 'scenes/e-01.json',
  },
  npc: { id: '7c9e6679-7425-40de-944b-e07fc1f90ae7', nombre: 'Marta Lucía', edad: 58 },
};

describe('slice sesion (HU-06 · T04)', () => {
  it('empieza sin sesión activa', () => {
    expect(crearAppStore().getState().sesion.activa).toBeNull();
  });

  it('registra y limpia la sesión activa sin tocar el slice auth', () => {
    const store = crearAppStore({ auth: { perfil } });

    store.getState().sesion.iniciar(sesion);
    expect(store.getState().sesion.activa).toEqual(sesion);
    expect(store.getState().auth.perfil).toEqual(perfil);

    store.getState().sesion.limpiar();
    expect(store.getState().sesion.activa).toBeNull();
    expect(store.getState().auth.perfil).toEqual(perfil);
  });

  it('reemplaza la sesión anterior al iniciar una nueva', () => {
    const store = crearAppStore({ sesion: { activa: sesion } });
    const otra = { ...sesion, id: 'a3bb189e-8bf9-4888-9912-ace4e6543002' };
    store.getState().sesion.iniciar(otra);
    expect(store.getState().sesion.activa?.id).toBe(otra.id);
  });

  it('HU-23: comenzar marca la sesión y adopta el inicio que fijó la base de datos', () => {
    const store = crearAppStore();
    store.getState().sesion.iniciar({ ...sesion, comenzada: false });

    store.getState().sesion.comenzar('2026-09-30T15:05:00.000Z');
    expect(store.getState().sesion.activa).toMatchObject({
      comenzada: true,
      inicio: '2026-09-30T15:05:00.000Z',
    });
  });

  it('HU-23: comenzar sin sesión activa no hace nada', () => {
    const store = crearAppStore();
    store.getState().sesion.comenzar('2026-09-30T15:05:00.000Z');
    expect(store.getState().sesion.activa).toBeNull();
  });
});
