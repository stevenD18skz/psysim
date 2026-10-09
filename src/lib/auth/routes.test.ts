import { describe, expect, it } from 'vitest';

import {
  RUTA_INICIO_ADMIN,
  RUTA_INICIO_DOCENTE,
  RUTA_INICIO_ESTUDIANTE,
  esRutaProtegida,
  rolesDeRuta,
  rolPuedeAbrir,
  rutaSiguienteSegura,
} from './routes';

describe('esRutaProtegida', () => {
  it.each([
    '/configuracion',
    '/configuracion/escenario',
    '/simulacion',
    '/simulacion/abc',
    '/estudiantes',
    '/estudiantes/123',
    '/sesiones/123',
    '/practicas',
    '/practicas/123',
    '/unirse/abc-defg-hij',
    '/laboratorio',
    '/laboratorio/npc',
    '/admin',
    '/admin/docentes/1',
    '/inicio',
  ])('protege %s', ruta => {
    expect(esRutaProtegida(ruta)).toBe(true);
  });

  it.each([
    '/',
    '/login',
    '/auth/callback',
    '/acceso-denegado',
    '/configuraciones',
    '/simulacion-demo',
    '/laboratorios',
    '/estudiantes-publico',
    '/practicas-libres',
    '/administracion',
  ])('no protege %s', ruta => {
    expect(esRutaProtegida(ruta)).toBe(false);
  });
});

describe('rolesDeRuta y rolPuedeAbrir', () => {
  it('reparte las rutas entre los roles', () => {
    expect(rolesDeRuta('/sesiones/1')).toEqual(['superadmin', 'docente']);
    expect(rolesDeRuta('/admin/docentes/1')).toEqual(['superadmin']);
    expect(rolesDeRuta('/laboratorio')).toEqual(['superadmin']);
    expect(rolesDeRuta('/simulacion')).toEqual(['estudiante']);
    expect(rolesDeRuta('/inicio')).toBe('cualquiera');
    expect(rolesDeRuta('/')).toBeNull();
  });

  it('cada rol abre solo las suyas (y las comunes)', () => {
    expect(rolPuedeAbrir('docente', '/estudiantes')).toBe(true);
    expect(rolPuedeAbrir('docente', '/practicas')).toBe(false);
    expect(rolPuedeAbrir('docente', '/admin')).toBe(false);
    expect(rolPuedeAbrir('docente', '/laboratorio/npc')).toBe(false);
    expect(rolPuedeAbrir('estudiante', '/simulacion')).toBe(true);
    expect(rolPuedeAbrir('estudiante', '/configuracion')).toBe(false);
    expect(rolPuedeAbrir('estudiante', '/inicio')).toBe(true);
  });

  it('el Administrador abre su panel y también el del docente', () => {
    expect(rolPuedeAbrir('superadmin', '/admin')).toBe(true);
    expect(rolPuedeAbrir('superadmin', '/configuracion')).toBe(true);
    expect(rolPuedeAbrir('superadmin', '/estudiantes/1')).toBe(true);
    expect(rolPuedeAbrir('superadmin', '/practicas')).toBe(false);
  });
});

describe('rutaSiguienteSegura', () => {
  it('acepta rutas protegidas internas del rol conservando la query', () => {
    expect(rutaSiguienteSegura('/estudiantes?x=2', 'docente')).toBe('/estudiantes?x=2');
    expect(rutaSiguienteSegura('/unirse/abc-defg-hij', 'estudiante')).toBe('/unirse/abc-defg-hij');
  });

  it('el Administrador vuelve a rutas del docente y empieza en su panel', () => {
    expect(rutaSiguienteSegura('/estudiantes', 'superadmin')).toBe('/estudiantes');
    expect(rutaSiguienteSegura(null, 'superadmin')).toBe(RUTA_INICIO_ADMIN);
    expect(rutaSiguienteSegura('/admin', 'docente')).toBe(RUTA_INICIO_DOCENTE);
  });

  it('una ruta del otro rol lleva a la ruta de inicio del propio', () => {
    expect(rutaSiguienteSegura('/simulacion?sesion=1', 'docente')).toBe(RUTA_INICIO_DOCENTE);
    expect(rutaSiguienteSegura('/configuracion', 'estudiante')).toBe(RUTA_INICIO_ESTUDIANTE);
  });

  it.each([
    [null],
    [undefined],
    [''],
    ['/'],
    ['/login'],
    ['configuracion'],
    ['//evil.com/configuracion'],
    ['/\\evil.com'],
    ['https://evil.com/configuracion'],
    ['/%2F%2Fevil.com'],
  ])('rechaza %s y usa la ruta de inicio', valor => {
    expect(rutaSiguienteSegura(valor)).toBe(RUTA_INICIO_DOCENTE);
    expect(rutaSiguienteSegura(valor, 'estudiante')).toBe(RUTA_INICIO_ESTUDIANTE);
  });
});
