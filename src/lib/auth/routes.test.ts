import { describe, expect, it } from 'vitest';

import {
  RUTA_INICIO_DOCENTE,
  RUTA_INICIO_ESTUDIANTE,
  esRutaProtegida,
  rolDeRuta,
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
  ])('no protege %s', ruta => {
    expect(esRutaProtegida(ruta)).toBe(false);
  });
});

describe('rolDeRuta y rolPuedeAbrir', () => {
  it('reparte las rutas entre el docente y el estudiante', () => {
    expect(rolDeRuta('/sesiones/1')).toBe('docente');
    expect(rolDeRuta('/simulacion')).toBe('estudiante');
    expect(rolDeRuta('/inicio')).toBe('cualquiera');
    expect(rolDeRuta('/')).toBeNull();
  });

  it('cada rol abre solo las suyas (y las comunes)', () => {
    expect(rolPuedeAbrir('docente', '/estudiantes')).toBe(true);
    expect(rolPuedeAbrir('docente', '/practicas')).toBe(false);
    expect(rolPuedeAbrir('estudiante', '/simulacion')).toBe(true);
    expect(rolPuedeAbrir('estudiante', '/configuracion')).toBe(false);
    expect(rolPuedeAbrir('estudiante', '/inicio')).toBe(true);
  });
});

describe('rutaSiguienteSegura', () => {
  it('acepta rutas protegidas internas del rol conservando la query', () => {
    expect(rutaSiguienteSegura('/estudiantes?x=2', 'docente')).toBe('/estudiantes?x=2');
    expect(rutaSiguienteSegura('/unirse/abc-defg-hij', 'estudiante')).toBe('/unirse/abc-defg-hij');
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
