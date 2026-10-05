import { describe, expect, it } from 'vitest';

import { iniciarSimulacionSchema, type IniciarSimulacionInput } from './configuracion.schema';

const ESCENARIO_ID = '0f8fad5b-d9cb-469f-a165-70867728950e';
const PROMPT = 'Eres un paciente de prueba con un perfil clínico suficientemente descrito.';

const valido: IniciarSimulacionInput = {
  escenarioId: ESCENARIO_ID,
  promptSistema: PROMPT,
  codigoEstudiante: '202012345',
  nombreEstudiante: 'Ana María Pérez',
};

function erroresDe(valores: unknown) {
  const resultado = iniciarSimulacionSchema.safeParse(valores);
  return resultado.success ? {} : resultado.error.flatten().fieldErrors;
}

describe('iniciarSimulacionSchema', () => {
  it('acepta datos válidos y normaliza espacios', () => {
    const datos = iniciarSimulacionSchema.parse({
      ...valido,
      codigoEstudiante: ' 202012345 ',
      nombreEstudiante: '  Ana   María  Pérez ',
    });
    expect(datos.codigoEstudiante).toBe('202012345');
    expect(datos.nombreEstudiante).toBe('Ana María Pérez');
  });

  it('exige seleccionar un escenario', () => {
    expect(erroresDe({ ...valido, escenarioId: '' }).escenarioId?.[0]).toBe(
      'Selecciona un escenario para continuar.'
    );
  });

  it.each([
    ['', 'Ingresa el código institucional del estudiante.'],
    ['   ', 'Ingresa el código institucional del estudiante.'],
    ['2020-123', 'El código solo puede contener números.'],
    ['abc12', 'El código solo puede contener números.'],
    ['1234', 'El código debe tener al menos 5 dígitos.'],
    ['1234567890123', 'El código no puede superar los 12 dígitos.'],
  ])('rechaza el código %j', (codigo, mensaje) => {
    expect(erroresDe({ ...valido, codigoEstudiante: codigo }).codigoEstudiante?.[0]).toBe(mensaje);
  });

  it.each([
    ['', 'Ingresa el nombre completo del estudiante.'],
    ['A', 'El nombre debe tener al menos 2 caracteres.'],
    ['Ana123', 'El nombre solo puede contener letras y espacios.'],
    ['<script>', 'El nombre solo puede contener letras y espacios.'],
  ])('rechaza el nombre %j', (nombre, mensaje) => {
    expect(erroresDe({ ...valido, nombreEstudiante: nombre }).nombreEstudiante?.[0]).toBe(mensaje);
  });

  it('acepta nombres con tildes, ñ, apóstrofes y guiones', () => {
    expect(
      iniciarSimulacionSchema.safeParse({ ...valido, nombreEstudiante: "Íñigo O'Neil-Muñoz" })
        .success
    ).toBe(true);
  });

  it('exige un prompt con contenido suficiente', () => {
    expect(erroresDe({ ...valido, promptSistema: '   ' }).promptSistema?.[0]).toBe(
      'El comportamiento del paciente no puede estar vacío.'
    );
    expect(erroresDe({ ...valido, promptSistema: 'corto' }).promptSistema).toBeDefined();
    expect(erroresDe({ ...valido, promptSistema: 'x'.repeat(8001) }).promptSistema).toBeDefined();
  });
});
