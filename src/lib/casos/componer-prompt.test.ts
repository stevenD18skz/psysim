import { describe, expect, it } from 'vitest';

import { type CamposCaso } from '@/schemas/caso.schema';

import { componerPerfilClinico, componerPrompt } from './componer-prompt';

const CAMPOS: CamposCaso = {
  nombre: 'Camila Rojas',
  edad: 29,
  ocupacion: 'diseñadora gráfica',
  situacion: 'Perdió su empleo hace un mes y se siente sin rumbo',
  sintomas: ['tristeza', 'insomnio'],
  sintomasExtra: 'dolores de cabeza',
  actitudes: ['reservado', 'evasivo'],
  seAbreSi: 'el estudiante valida mis emociones',
  seCierraSi: 'me dan consejos apresurados',
  riesgo: 'ninguno',
  fraseApertura: 'Hola, no sé por dónde empezar.',
  notas: 'Vive sola desde hace dos años',
};

describe('componerPrompt', () => {
  it('arma el prompt con la estructura de los casos del catálogo', () => {
    const prompt = componerPrompt(CAMPOS);

    expect(prompt).toContain('Eres Camila Rojas, una persona de 29 años, diseñadora gráfica.');
    expect(prompt).toContain('Situación: Perdió su empleo hace un mes y se siente sin rumbo.');
    expect(prompt).toContain(
      'Estado actual: experimentas tristeza persistente, dificultad para dormir y dolores de cabeza.'
    );
    expect(prompt).toContain(
      'Actitud en la consulta: te muestras reservado y evasivo con los temas dolorosos.'
    );
    expect(prompt).toContain('Te abres y hablas con más confianza cuando el estudiante valida');
    expect(prompt).toContain('Te cierras y respondes menos cuando me dan consejos apresurados.');
    expect(prompt).toContain('Información adicional: Vive sola desde hace dos años.');
    expect(prompt).toContain(
      'Frase de apertura (úsala en tu primera respuesta): "Hola, no sé por dónde empezar."'
    );
  });

  it('no incluye las reglas fijas: las añade el servidor', () => {
    expect(componerPrompt(CAMPOS)).not.toContain('Reglas de interpretación');
  });

  it('omite las secciones vacías', () => {
    const prompt = componerPrompt({
      ...CAMPOS,
      ocupacion: '',
      sintomas: [],
      sintomasExtra: '',
      actitudes: [],
      seAbreSi: '',
      seCierraSi: '',
      notas: '',
    });

    expect(prompt).not.toContain('Estado actual');
    expect(prompt).not.toContain('Actitud');
    expect(prompt).not.toContain('Te abres');
    expect(prompt).not.toContain('Información adicional');
    expect(prompt).toContain('Eres Camila Rojas, una persona de 29 años.');
  });

  it('describe el riesgo elegido sin pedir detalles de métodos', () => {
    const prompt = componerPrompt({ ...CAMPOS, riesgo: 'ideacion_activa' });

    expect(prompt).toContain('Riesgo: Has pensado en quitarte la vida');
    expect(prompt).toContain('Nunca describas métodos');
  });

  it('tolera campos vacíos mientras el docente escribe (vista previa)', () => {
    const prompt = componerPrompt({
      ...CAMPOS,
      nombre: '',
      edad: Number.NaN,
      situacion: '',
      fraseApertura: '',
    });

    expect(prompt.startsWith('Eres un paciente, una persona')).toBe(true);
    expect(prompt).not.toContain('NaN');
    expect(prompt).not.toContain('Frase de apertura');
  });

  it('quita las comillas que el docente ponga a la frase de apertura', () => {
    const prompt = componerPrompt({ ...CAMPOS, fraseApertura: '«Buenas tardes»' });
    expect(prompt).toContain('"Buenas tardes"');
  });
});

describe('componerPerfilClinico', () => {
  it('resume la situación y los síntomas', () => {
    expect(componerPerfilClinico(CAMPOS)).toBe(
      'Perdió su empleo hace un mes y se siente sin rumbo. Tristeza persistente, dificultad para dormir y dolores de cabeza.'
    );
  });
});
