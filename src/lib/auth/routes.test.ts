import { describe, expect, it } from 'vitest';

import { RUTA_INICIO_DOCENTE, esRutaProtegida, rutaSiguienteSegura } from './routes';

describe('esRutaProtegida', () => {
  it.each([
    '/configuracion',
    '/configuracion/escenario',
    '/simulacion',
    '/simulacion/abc',
    '/estudiantes',
    '/laboratorio',
    '/laboratorio/npc',
  ])('protege %s', ruta => {
    expect(esRutaProtegida(ruta)).toBe(true);
  });

  it.each([
    '/',
    '/login',
    '/acceso-denegado',
    '/configuraciones',
    '/simulacion-demo',
    '/laboratorios',
    '/estudiantes-publico',
  ])('no protege %s', ruta => {
    expect(esRutaProtegida(ruta)).toBe(false);
  });
});

describe('rutaSiguienteSegura', () => {
  it('acepta rutas protegidas internas conservando la query', () => {
    expect(rutaSiguienteSegura('/simulacion?escenario=2')).toBe('/simulacion?escenario=2');
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
  });
});
