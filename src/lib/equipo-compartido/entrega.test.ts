import { describe, expect, it } from 'vitest';

import { leerEntrega, primerNombre, serializarEntrega, usaGoogle } from './entrega';

const ENTREGA = {
  codigo: 'abc-defg-hij',
  estudiante: 'María José Ríos',
  caso: 'Estrés académico',
  docenteConGoogle: false,
};

describe('cookie de entrega (modo presencial)', () => {
  it('conserva los datos de ida y vuelta, con tildes', () => {
    expect(leerEntrega(serializarEntrega(ENTREGA))).toEqual(ENTREGA);
  });

  it('sin cookie, con JSON roto o con datos alterados no hay entrega', () => {
    expect(leerEntrega(undefined)).toBeNull();
    expect(leerEntrega('%7Bno-es-json')).toBeNull();
    expect(leerEntrega(serializarEntrega({ ...ENTREGA, codigo: 'cualquier-cosa' }))).toBeNull();
    expect(leerEntrega(encodeURIComponent(JSON.stringify({ codigo: ENTREGA.codigo })))).toBeNull();
  });
});

describe('usaGoogle', () => {
  it('detecta Google como proveedor principal o vinculado', () => {
    expect(usaGoogle({ provider: 'google', providers: ['google'] })).toBe(true);
    expect(usaGoogle({ provider: 'email', providers: ['email', 'google'] })).toBe(true);
    expect(usaGoogle({ provider: 'email', providers: ['email'] })).toBe(false);
    expect(usaGoogle(undefined)).toBe(false);
  });
});

describe('primerNombre', () => {
  it('toma la primera palabra del nombre', () => {
    expect(primerNombre('  María José Ríos ')).toBe('María');
    expect(primerNombre('Santiago')).toBe('Santiago');
  });
});
