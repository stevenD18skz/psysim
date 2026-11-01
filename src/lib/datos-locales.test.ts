import { beforeEach, describe, expect, it } from 'vitest';

import { olvidarDatosDeLaCuenta } from './datos-locales';

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});

describe('olvidarDatosDeLaCuenta', () => {
  it('borra las notas del estudiante y el borrador de retroalimentación del docente', () => {
    localStorage.setItem('psysim:notas:s1', 'Notas privadas');
    sessionStorage.setItem('psysim:borrador-retro:s2', 'Comentario a medias');

    olvidarDatosDeLaCuenta();

    expect(localStorage.getItem('psysim:notas:s1')).toBeNull();
    expect(sessionStorage.getItem('psysim:borrador-retro:s2')).toBeNull();
  });

  it('conserva las preferencias del equipo', () => {
    localStorage.setItem('psysim:sonido-silenciado', '1');
    localStorage.setItem('psysim:voz-paciente', 'off');

    olvidarDatosDeLaCuenta();

    expect(localStorage.getItem('psysim:sonido-silenciado')).toBe('1');
    expect(localStorage.getItem('psysim:voz-paciente')).toBe('off');
  });
});
