import { describe, expect, it } from 'vitest';

import { valoresVacios } from '@/lib/casos/valores';

import { borradorCasoSchema, casoFormSchema, guardarVarianteSchema } from './caso.schema';

const VALIDO = {
  ...valoresVacios(),
  titulo: 'Duelo por pérdida laboral',
  competenciaCentral: 'Escucha activa',
  nombre: 'Camila Rojas',
  edad: 29,
  situacion: 'Perdió su empleo hace un mes y se siente sin rumbo.',
  fraseApertura: 'Hola, no sé por dónde empezar.',
};

function erroresDe(valor: unknown) {
  const resultado = casoFormSchema.safeParse(valor);
  return resultado.success ? {} : resultado.error.flatten().fieldErrors;
}

describe('casoFormSchema', () => {
  it('acepta un caso completo del constructor y normaliza espacios', () => {
    const resultado = casoFormSchema.parse({ ...VALIDO, nombre: '  Camila Rojas ' });
    expect(resultado.nombre).toBe('Camila Rojas');
  });

  it('exige los datos básicos del caso y del paciente', () => {
    const errores = erroresDe({ ...valoresVacios() });

    expect(errores.titulo).toBeDefined();
    expect(errores.competenciaCentral).toBeDefined();
    expect(errores.nombre).toBeDefined();
    expect(errores.edad).toBeDefined();
    expect(errores.situacion).toBeDefined();
  });

  it('exige la frase de apertura en modo guiado, pero no en modo texto', () => {
    expect(erroresDe({ ...VALIDO, fraseApertura: '' }).fraseApertura).toBeDefined();

    const modoTexto = casoFormSchema.safeParse({
      ...VALIDO,
      fraseApertura: '',
      modoTexto: true,
      promptManual: 'Eres Camila, una joven que perdió su empleo y llega a consulta.',
    });
    expect(modoTexto.success).toBe(true);
  });

  it('en modo texto exige un prompt con contenido suficiente', () => {
    const errores = erroresDe({ ...VALIDO, modoTexto: true, promptManual: 'corto' });
    expect(errores.promptManual).toBeDefined();
  });

  it('rechaza edades fuera de rango y consultorios que no existen', () => {
    expect(erroresDe({ ...VALIDO, edad: 0 }).edad).toBeDefined();
    expect(erroresDe({ ...VALIDO, edad: 150 }).edad).toBeDefined();
    expect(erroresDe({ ...VALIDO, edad: 29.5 }).edad).toBeDefined();
    expect(erroresDe({ ...VALIDO, consultorio: 'scenes/otro.json' }).consultorio).toBeDefined();
  });

  it('rechaza síntomas y niveles de riesgo desconocidos', () => {
    expect(erroresDe({ ...VALIDO, sintomas: ['inventado'] }).sintomas).toBeDefined();
    expect(erroresDe({ ...VALIDO, riesgo: 'extremo' }).riesgo).toBeDefined();
  });
});

describe('borradorCasoSchema', () => {
  it('descarta un borrador con formato inválido', () => {
    expect(borradorCasoSchema.safeParse({ campos: {}, modoTexto: false }).success).toBe(false);
  });
});

describe('guardarVarianteSchema', () => {
  it('exige escenario, nombre y un prompt suficiente', () => {
    const resultado = guardarVarianteSchema.safeParse({
      escenarioId: '11111111-1111-4111-8111-111111111111',
      titulo: '  Duelo — grupo A ',
      prompt: 'Un prompt ajustado por el docente para el grupo A.',
    });
    expect(resultado.success && resultado.data.titulo).toBe('Duelo — grupo A');

    expect(
      guardarVarianteSchema.safeParse({ escenarioId: 'x', titulo: 'ab', prompt: 'corto' }).success
    ).toBe(false);
  });
});
