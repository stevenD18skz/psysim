import { describe, expect, it } from 'vitest';

import {
  codigoEstudianteSchema,
  generarAsignacionSchema,
  type GenerarAsignacionInput,
  nombreEstudianteSchema,
} from './configuracion.schema';

const ESCENARIO_ID = '0f8fad5b-d9cb-469f-a165-70867728950e';
const ESTUDIANTE_ID = '55555555-5555-4555-8555-555555555555';
const PROMPT = 'Eres un paciente de prueba con un perfil clínico suficientemente descrito.';

const valido: GenerarAsignacionInput = {
  escenarioId: ESCENARIO_ID,
  promptSistema: PROMPT,
  estudianteId: ESTUDIANTE_ID,
  vigenciaDias: 7,
};

function erroresDe(valores: unknown) {
  const resultado = generarAsignacionSchema.safeParse(valores);
  return resultado.success ? {} : resultado.error.flatten().fieldErrors;
}

describe('generarAsignacionSchema', () => {
  it('acepta una configuración completa', () => {
    expect(generarAsignacionSchema.parse(valido)).toEqual(valido);
  });

  it('exige seleccionar un escenario y un estudiante', () => {
    const errores = erroresDe({ ...valido, escenarioId: '', estudianteId: '' });
    expect(errores.escenarioId?.[0]).toBe('Selecciona un escenario para continuar.');
    expect(errores.estudianteId?.[0]).toBe('Elige al estudiante que va a practicar.');
  });

  it.each([1, 3, 7, 30])('acepta una vigencia de %i días', dias => {
    expect(generarAsignacionSchema.safeParse({ ...valido, vigenciaDias: dias }).success).toBe(true);
  });

  it.each([0, 2, 31, '7'])('rechaza la vigencia %j', dias => {
    expect(erroresDe({ ...valido, vigenciaDias: dias }).vigenciaDias).toBeDefined();
  });

  it('exige un prompt con contenido suficiente', () => {
    expect(erroresDe({ ...valido, promptSistema: '   ' }).promptSistema?.[0]).toBe(
      'El comportamiento del paciente no puede estar vacío.'
    );
    expect(erroresDe({ ...valido, promptSistema: 'corto' }).promptSistema).toBeDefined();
    expect(erroresDe({ ...valido, promptSistema: 'x'.repeat(8001) }).promptSistema).toBeDefined();
  });
});

describe('codigoEstudianteSchema', () => {
  it('quita los espacios de los bordes', () => {
    expect(codigoEstudianteSchema.parse(' 202012345 ')).toBe('202012345');
  });

  it.each([
    ['', 'Ingresa el código institucional del estudiante.'],
    ['   ', 'Ingresa el código institucional del estudiante.'],
    ['2020-123', 'El código solo puede contener números.'],
    ['abc12', 'El código solo puede contener números.'],
    ['1234', 'El código debe tener al menos 5 dígitos.'],
    ['1234567890123', 'El código no puede superar los 12 dígitos.'],
  ])('rechaza el código %j', (codigo, mensaje) => {
    expect(codigoEstudianteSchema.safeParse(codigo).error?.issues[0]?.message).toBe(mensaje);
  });
});

describe('nombreEstudianteSchema', () => {
  it('normaliza los espacios', () => {
    expect(nombreEstudianteSchema.parse('  Ana   María  Pérez ')).toBe('Ana María Pérez');
  });

  it.each([
    ['', 'Ingresa el nombre completo del estudiante.'],
    ['A', 'El nombre debe tener al menos 2 caracteres.'],
    ['Ana123', 'El nombre solo puede contener letras y espacios.'],
    ['<script>', 'El nombre solo puede contener letras y espacios.'],
  ])('rechaza el nombre %j', (nombre, mensaje) => {
    expect(nombreEstudianteSchema.safeParse(nombre).error?.issues[0]?.message).toBe(mensaje);
  });

  it('acepta nombres con tildes, ñ, apóstrofes y guiones', () => {
    expect(nombreEstudianteSchema.safeParse("Íñigo O'Neil-Muñoz").success).toBe(true);
  });
});
