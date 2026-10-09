import { describe, expect, it } from 'vitest';

import { canjearCodigoSchema } from './asignacion.schema';
import { correoEstudianteSchema, registrarEstudianteSchema } from './estudiante.schema';
import {
  crearAnotacionSchema,
  leerNota,
  notaSchema,
  publicarRetroalimentacionSchema,
} from './retroalimentacion.schema';

const SESION_ID = '44444444-4444-4444-8444-444444444444';

describe('correoEstudianteSchema', () => {
  it('normaliza a minúsculas y sin espacios', () => {
    expect(correoEstudianteSchema.parse('  Ana.Perez@CorreoUnivalle.edu.co ')).toBe(
      'ana.perez@correounivalle.edu.co'
    );
  });

  it.each([
    ['', 'Ingresa el correo institucional del estudiante.'],
    ['no-es-correo', 'Ingresa un correo electrónico válido.'],
    ['ana@gmail.com', 'Usa el correo institucional (@correounivalle.edu.co).'],
    ['ana@univalle.edu.co', 'Usa el correo institucional (@correounivalle.edu.co).'],
  ])('rechaza %j', (correo, mensaje) => {
    expect(correoEstudianteSchema.safeParse(correo).error?.issues[0]?.message).toBe(mensaje);
  });
});

describe('registrarEstudianteSchema', () => {
  it('valida código, nombre y correo juntos', () => {
    expect(
      registrarEstudianteSchema.parse({
        codigo: ' 202012345 ',
        nombre: ' Ana   Pérez ',
        correo: 'ANA.PEREZ@correounivalle.edu.co',
      })
    ).toEqual({
      codigo: '202012345',
      nombre: 'Ana Pérez',
      correo: 'ana.perez@correounivalle.edu.co',
    });
  });
});

describe('canjearCodigoSchema', () => {
  it('normaliza el código escrito por el estudiante', () => {
    expect(canjearCodigoSchema.parse({ codigo: ' ABC DEFG HIJ ' })).toEqual({
      codigo: 'abc-defg-hij',
    });
  });

  it.each([
    ['', 'Escribe el código que te envió tu docente.'],
    ['abc-123', 'El código tiene 10 letras, con este formato: abc-defg-hij.'],
  ])('rechaza %j con un mensaje claro', (codigo, mensaje) => {
    expect(canjearCodigoSchema.safeParse({ codigo }).error?.issues[0]?.message).toBe(mensaje);
  });
});

describe('notas', () => {
  it.each([
    ['4,5', 4.5],
    ['4.5', 4.5],
    [' 3 ', 3],
    ['', null],
  ])('leerNota(%j) → %j', (texto, esperado) => {
    expect(leerNota(texto)).toBe(esperado);
  });

  it('un texto no numérico se lee como NaN y el esquema lo rechaza', () => {
    expect(leerNota('cuatro')).toBeNaN();
    expect(notaSchema.safeParse(leerNota('cuatro')).success).toBe(false);
  });

  it.each([0, 2.5, 4.3, 5])('acepta %d', nota => {
    expect(notaSchema.safeParse(nota).success).toBe(true);
  });

  it.each([
    [-0.1, 'La nota mínima es 0,0.'],
    [5.1, 'La nota máxima es 5,0.'],
    [4.25, 'Usa un solo decimal.'],
  ])('rechaza %d', (nota, mensaje) => {
    expect(notaSchema.safeParse(nota).error?.issues[0]?.message).toBe(mensaje);
  });
});

describe('publicarRetroalimentacionSchema', () => {
  it('exige el comentario general y la nota', () => {
    const resultado = publicarRetroalimentacionSchema.safeParse({
      sesionId: SESION_ID,
      comentarioGeneral: '  ',
      nota: null,
    });
    const errores = resultado.error?.flatten().fieldErrors;
    expect(errores?.comentarioGeneral?.[0]).toBe(
      'Escribe la retroalimentación general antes de publicar.'
    );
    expect(errores?.nota?.[0]).toBe('Pon la nota antes de publicar.');
  });
});

describe('crearAnotacionSchema', () => {
  const base = {
    sesionId: SESION_ID,
    mensajeId: '55555555-5555-4555-8555-555555555555',
    inicio: 3,
    fin: 9,
    comentario: ' Aquí hablaste muy duro. ',
  };

  it('recorta el comentario', () => {
    expect(crearAnotacionSchema.parse(base).comentario).toBe('Aquí hablaste muy duro.');
  });

  it('exige un rango no vacío y un comentario', () => {
    expect(crearAnotacionSchema.safeParse({ ...base, fin: 3 }).success).toBe(false);
    expect(crearAnotacionSchema.safeParse({ ...base, comentario: '  ' }).success).toBe(false);
    expect(crearAnotacionSchema.safeParse({ ...base, inicio: -1 }).success).toBe(false);
  });
});
