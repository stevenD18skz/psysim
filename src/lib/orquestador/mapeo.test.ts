import { describe, expect, it } from 'vitest';

import { TEXTO_REGLAS } from '@/lib/ia/reglas';
import { type CamposCaso } from '@/schemas/caso.schema';

import {
  type CasoParaOrquestador,
  deducirRiesgo,
  escenarioDelCaso,
  huellaDelPrompt,
  huellaDeSincronizacion,
  perfilDelCaso,
  severidadDelCaso,
} from './mapeo';

const PROMPT_OFICIAL = [
  'Eres Sara, una adolescente de 15 años.',
  'Situación: tu mamá te trajo a consulta después de ver marcas en tus brazos.',
  'Riesgo: alguna vez te has hecho daño para aliviar el malestar y lo sientes con vergüenza.',
  'Frase de apertura (úsala en tu primera respuesta): "No sé por qué estoy aquí."',
].join('\n');

const oficial: CasoParaOrquestador = {
  codigo: 'E-09',
  titulo: 'Adolescente con autolesiones',
  categoria: 'clinico',
  dificultad: 'avanzado',
  paciente: { nombre: 'Sara', edad: 15, perfilClinico: 'Autolesiones sin intención suicida.' },
  prompt: PROMPT_OFICIAL,
};

const campos: CamposCaso = {
  nombre: 'Julián Ortiz',
  edad: 41,
  ocupacion: 'conductor de bus',
  situacion: 'Lleva tres meses sin dormir bien después de un accidente en la vía.',
  sintomas: ['insomnio', 'aislamiento'],
  sintomasExtra: '',
  actitudes: ['reservado', 'irritable'],
  seAbreSi: 'el estudiante valida su miedo sin apurarlo',
  seCierraSi: 'le dicen que fue solo un susto',
  riesgo: 'ideacion_pasiva',
  fraseApertura: 'Yo vine porque mi esposa insistió.',
  notas: '',
  secretos: [],
};

const propio: CasoParaOrquestador = {
  codigo: 'C-00412345',
  titulo: 'Insomnio tras un accidente',
  categoria: 'clinico',
  dificultad: 'intermedio',
  paciente: { nombre: 'Julián Ortiz', edad: 41, perfilClinico: campos.situacion },
  prompt:
    'Eres Julián Ortiz, una persona de 41 años, conductor de bus.\nRiesgo: a veces piensas que sería mejor no estar.',
  campos,
};

describe('deducirRiesgo', () => {
  it('usa el campo del constructor si el caso lo tiene', () => {
    expect(deducirRiesgo('Riesgo: has pensado en quitarte la vida.', campos)).toBe(
      'ideacion_pasiva'
    );
  });

  it.each([
    ['Riesgo: no presentas ideas de hacerte daño ni de dañar a otros.', 'ninguno'],
    ['Riesgo: a veces piensas que sería mejor no estar, sin plan.', 'ideacion_pasiva'],
    ['Riesgo: has pensado en quitarte la vida y tienes una idea de cómo.', 'ideacion_activa'],
    ['Riesgo: alguna vez te has hecho daño para aliviar el malestar.', 'autolesion'],
    ['Riesgo: sientes rabia y a veces imaginas hacerle daño.', 'terceros'],
    ['Riesgo: no tienes ideas de hacerte daño; tu miedo es a lo que pase en casa.', 'ninguno'],
  ] as const)('lee la línea de riesgo del prompt: %s', (prompt, riesgo) => {
    expect(deducirRiesgo(`Eres Ana.\n${prompt}\nMás texto.`)).toBe(riesgo);
  });

  it('solo mira la línea de riesgo: lo que diga el resto del prompt no cuenta', () => {
    const prompt =
      'Situación: tu hermano intentó quitarte la vida de joven.\nRiesgo: no presentas ideas de hacerte daño.';
    expect(deducirRiesgo(prompt)).toBe('ninguno');
  });

  it('sin línea de riesgo busca en todo el prompt y, si no hay señales, no hay riesgo', () => {
    expect(deducirRiesgo('Eres Ana. A veces piensas que sería mejor no despertar.')).toBe(
      'ideacion_pasiva'
    );
    expect(deducirRiesgo('Eres Ana y discutes con tu pareja.')).toBe('ninguno');
  });
});

describe('severidadDelCaso', () => {
  it('sale de la dificultad cuando no hay riesgo', () => {
    expect(severidadDelCaso('basico', 'clinico', 'ninguno')).toEqual({
      inicial: 2,
      min: 1,
      max: 4,
    });
    expect(severidadDelCaso('intermedio', 'clinico', 'ninguno')).toEqual({
      inicial: 3,
      min: 1,
      max: 4.5,
    });
    expect(severidadDelCaso('avanzado', 'clinico', 'ninguno')).toEqual({
      inicial: 3,
      min: 2,
      max: 5,
    });
  });

  it('el riesgo alto sube la severidad inicial (hasta 4) y abre el rango hasta 5', () => {
    expect(severidadDelCaso('basico', 'clinico', 'autolesion')).toEqual({
      inicial: 3,
      min: 1,
      max: 5,
    });
    expect(severidadDelCaso('avanzado', 'clinico', 'ideacion_activa')).toEqual({
      inicial: 4,
      min: 2,
      max: 5,
    });
  });

  it('la ideación pasiva no cambia los números (solo añade la bandera)', () => {
    expect(severidadDelCaso('intermedio', 'clinico', 'ideacion_pasiva')).toEqual(
      severidadDelCaso('intermedio', 'clinico', 'ninguno')
    );
  });

  it('un caso cotidiano empieza un punto más tranquilo, nunca por debajo de 1', () => {
    expect(severidadDelCaso('basico', 'cotidiano', 'ninguno')).toEqual({
      inicial: 1,
      min: 1,
      max: 4,
    });
    expect(severidadDelCaso('avanzado', 'cotidiano', 'ninguno').inicial).toBe(2);
  });
});

describe('perfilDelCaso', () => {
  it('un caso oficial lleva el prefijo -3D-, la edad y el rango de su dificultad y riesgo', () => {
    expect(perfilDelCaso(oficial)).toEqual({
      name: '-3D- Sara (E-09)',
      description: 'Sara, 15 años. Autolesiones sin intención suicida.',
      traits: { age: 15, language: 'español colombiano' },
      behavior: { behavior_min: 2, behavior_max: 5, triggers: [], regulators: [] },
    });
  });

  it('un caso del constructor suma ocupación, actitudes, síntomas y lo que lo abre o lo cierra', () => {
    const perfil = perfilDelCaso(propio);
    expect(perfil.traits).toEqual({
      age: 41,
      occupation: 'conductor de bus',
      personality: 'reservado, irritable',
      communication_style:
        'das respuestas breves o vagas y necesitas que te animen para hablar de lo personal; contestas con brusquedad cuando algo te molesta',
      symptoms: 'dificultad para dormir, aislamiento social',
      language: 'español colombiano',
    });
    expect(perfil.behavior).toEqual({
      behavior_min: 1,
      behavior_max: 4.5,
      triggers: ['le dicen que fue solo un susto'],
      regulators: ['el estudiante valida su miedo sin apurarlo'],
    });
  });

  it('recorta una descripción demasiado larga', () => {
    const largo = {
      ...oficial,
      paciente: { ...oficial.paciente, perfilClinico: 'x'.repeat(2000) },
    };
    const { description } = perfilDelCaso(largo);
    expect(description.length).toBe(800);
    expect(description.endsWith('…')).toBe(true);
  });
});

describe('escenarioDelCaso', () => {
  it('el contexto lleva el prompt del caso y las reglas fijas de PsySim', () => {
    const escenario = escenarioDelCaso(oficial);
    expect(escenario.name).toBe('-3D- E-09 · Adolescente con autolesiones');
    expect(escenario.context.startsWith(PROMPT_OFICIAL)).toBe(true);
    expect(escenario.context.endsWith(TEXTO_REGLAS)).toBe(true);
    expect(escenario.severity).toBe(4);
    expect(escenario.risk_flags).toEqual(['autolesión']);
    expect(escenario.constraints).toMatchObject({ origen: 'PsySim', caso: 'E-09' });
  });

  it('no duplica las reglas si un prompt antiguo ya las traía pegadas', () => {
    const conReglas = { ...oficial, prompt: `${PROMPT_OFICIAL}\n\n${TEXTO_REGLAS}` };
    expect(escenarioDelCaso(conReglas).context).toBe(escenarioDelCaso(oficial).context);
  });

  it('una variante se distingue en el nombre por la huella de su prompt', () => {
    expect(escenarioDelCaso(propio, 'a1b2c3d4e5f60718').name).toBe(
      '-3D- C-00412345 · Insomnio tras un accidente · ajuste a1b2c3d4'
    );
    expect(escenarioDelCaso(propio).risk_flags).toEqual(['ideación_pasiva']);
  });

  it('la severidad inicial es un entero entre 1 y 5 para cualquier combinación', () => {
    for (const dificultad of ['basico', 'intermedio', 'avanzado'] as const) {
      for (const categoria of ['clinico', 'cotidiano'] as const) {
        const { severity } = escenarioDelCaso({ ...oficial, dificultad, categoria });
        expect(Number.isInteger(severity) && severity >= 1 && severity <= 5).toBe(true);
      }
    }
  });
});

describe('huellas', () => {
  it('el mismo prompt con otros espacios o con las reglas pegadas tiene la misma huella', () => {
    const base = huellaDelPrompt(PROMPT_OFICIAL);
    expect(huellaDelPrompt(`  ${PROMPT_OFICIAL.replaceAll('\n', '\n\n')}  `)).toBe(base);
    expect(huellaDelPrompt(`${PROMPT_OFICIAL}\n\n${TEXTO_REGLAS}`)).toBe(base);
    expect(base).toMatch(/^[0-9a-f]{16}$/);
  });

  it('un ajuste del docente cambia la huella del prompt', () => {
    expect(
      huellaDelPrompt(`${PROMPT_OFICIAL}\n\nAjustes del docente: hoy estás más reservada.`)
    ).not.toBe(huellaDelPrompt(PROMPT_OFICIAL));
  });

  it('la huella de sincronización cambia si cambia cualquier dato enviado', () => {
    const perfil = perfilDelCaso(oficial);
    const escenario = escenarioDelCaso(oficial);
    const original = huellaDeSincronizacion(perfil, escenario);
    expect(huellaDeSincronizacion(perfil, escenario)).toBe(original);
    expect(huellaDeSincronizacion(perfil, { ...escenario, severity: 2 })).not.toBe(original);
    expect(huellaDeSincronizacion({ ...perfil, description: 'Otra' }, escenario)).not.toBe(
      original
    );
  });
});
