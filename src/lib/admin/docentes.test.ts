import { describe, expect, it } from 'vitest';

import { generarContrasenaTemporal } from '@/lib/admin/contrasena';
import { iniciales, primerNombre } from '@/lib/nombres';
import { type DocenteAdmin } from '@/types';

import { describirAcceso, filtrarDocentes } from './docentes';

function docente(cambios: Partial<DocenteAdmin>): DocenteAdmin {
  return {
    id: 'id',
    nombre: 'Ana María Gómez',
    correo: 'ana.gomez@correounivalle.edu.co',
    codigoInstitucional: 'DOC-0001',
    rol: 'docente',
    activo: true,
    contrasenaTemporal: false,
    conGoogle: true,
    creadoEn: '2026-10-01T00:00:00Z',
    ultimoAcceso: '2026-10-08T00:00:00Z',
    metricas: {
      estudiantes: 0,
      sesiones: 0,
      enCurso: 0,
      pendientesRetroalimentacion: 0,
      casosPropios: 0,
      ultimaSesion: null,
    },
    ...cambios,
  };
}

describe('filtrarDocentes', () => {
  const ana = docente({ id: 'ana' });
  const luis = docente({
    id: 'luis',
    nombre: 'Luis Pérez',
    correo: 'luis@gmail.com',
    codigoInstitucional: 'DOC-0099',
    activo: false,
  });

  it.each([
    ['', ['ana', 'luis']],
    ['maria gomez', ['ana']],
    ['MARÍA', ['ana']],
    ['gmail', ['luis']],
    ['doc-0099', ['luis']],
    ['nadie', []],
  ])('«%s» → %j', (termino, ids) => {
    expect(filtrarDocentes([ana, luis], termino).map(d => d.id)).toEqual(ids);
  });

  it('filtra por estado', () => {
    expect(filtrarDocentes([ana, luis], '', 'activos').map(d => d.id)).toEqual(['ana']);
    expect(filtrarDocentes([ana, luis], '', 'desactivados').map(d => d.id)).toEqual(['luis']);
  });
});

describe('describirAcceso', () => {
  it.each([
    [{ ultimoAcceso: null, contrasenaTemporal: false }, 'Aún no ha entrado'],
    [{ ultimoAcceso: null, contrasenaTemporal: true }, 'Aún no entra · contraseña temporal'],
    [{ contrasenaTemporal: true }, 'Contraseña temporal sin cambiar'],
    [{ conGoogle: true }, 'Con Google'],
    [{ conGoogle: false }, 'Con contraseña'],
  ])('%o → %s', (cambios, texto) => {
    expect(describirAcceso(docente(cambios))).toBe(texto);
  });
});

describe('generarContrasenaTemporal', () => {
  it('genera 4 grupos de 4 caracteres sin caracteres ambiguos, distintos cada vez', () => {
    const contrasenas = new Set(Array.from({ length: 50 }, generarContrasenaTemporal));
    expect(contrasenas.size).toBe(50);
    for (const contrasena of contrasenas) {
      expect(contrasena).toMatch(/^[a-zA-Z2-9]{4}(-[a-zA-Z2-9]{4}){3}$/);
      expect(contrasena).not.toMatch(/[0O1lI]/);
    }
  });
});

describe('nombres', () => {
  it.each([
    ['Ana María Gómez', 'AG', 'Ana'],
    ['  Luis  ', 'L', 'Luis'],
  ])('%s', (nombre, ini, primero) => {
    expect(iniciales(nombre)).toBe(ini);
    expect(primerNombre(nombre)).toBe(primero);
  });
});
