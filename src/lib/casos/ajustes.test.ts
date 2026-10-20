import { describe, expect, it } from 'vitest';

import {
  AJUSTES_VACIOS,
  componerAjustes,
  hayAjustes,
  promptConAjustes,
  resumenAjustes,
} from './ajustes';
import { camposFaltantes, EJEMPLOS_CASO } from './ejemplos';

describe('ajustes guiados de una práctica', () => {
  it('sin ajustes, el comportamiento del caso queda igual', () => {
    expect(hayAjustes(AJUSTES_VACIOS)).toBe(false);
    expect(componerAjustes(AJUSTES_VACIOS)).toBe('');
    expect(promptConAjustes('Eres Marta.', AJUSTES_VACIOS)).toBe('Eres Marta.');
    expect(resumenAjustes(AJUSTES_VACIOS)).toEqual([]);
  });

  it('traduce cada elección a una instrucción al final del caso', () => {
    const ajustes = {
      apertura: 'mas-reservado',
      intensidad: 'mas-intenso',
      actitudes: ['tangencial'],
      secretos: [
        { dato: 'Perdió el trabajo', condicion: 'le preguntan por su rutina.' },
        { dato: '  ', condicion: 'incompleto' },
      ],
      indicacion: 'Llega tarde.',
    } as const;
    const prompt = promptConAjustes('Eres Marta.\n', {
      ...ajustes,
      actitudes: [...ajustes.actitudes],
      secretos: [...ajustes.secretos],
    });

    expect(prompt.startsWith('Eres Marta.\n\nAjustes del docente para esta práctica')).toBe(true);
    expect(prompt).toContain('te cuesta más abrirte');
    expect(prompt).toContain('más a flor de piel');
    expect(prompt).toContain('pronto te desvías a otros temas');
    expect(prompt).toContain(
      'Guardas esto (no lo cuentes de entrada): Perdió el trabajo. Lo cuentas solo si le preguntan por su rutina.'
    );
    expect(prompt).not.toContain('incompleto');
    expect(prompt).toContain('Indicación del docente: Llega tarde.');
  });

  it('el resumen lo dice en lenguaje cotidiano', () => {
    expect(
      resumenAjustes({ ...AJUSTES_VACIOS, apertura: 'mas-abierto', actitudes: ['irritable'] })
    ).toEqual(['Se abre más: habla con menos esfuerzo.', 'Se muestra irritable.']);
  });
});

describe('ejemplos y pendientes del constructor', () => {
  it('cada ejemplo está completo: no le falta nada para guardarse', () => {
    for (const ejemplo of EJEMPLOS_CASO) {
      expect(camposFaltantes({ ...ejemplo.valores, modoTexto: false })).toEqual([]);
    }
  });

  it('un formulario vacío pide los seis datos obligatorios', () => {
    expect(camposFaltantes({}).map(f => f.campo)).toEqual([
      'titulo',
      'competenciaCentral',
      'nombre',
      'edad',
      'situacion',
      'fraseApertura',
    ]);
    // En modo texto la frase de apertura va dentro del texto.
    expect(camposFaltantes({ modoTexto: true }).map(f => f.campo)).not.toContain('fraseApertura');
  });
});
