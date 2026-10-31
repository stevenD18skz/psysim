import { describe, expect, it } from 'vitest';

import { type EscenarioCatalogo } from '@/types';

import { casoFormSchema } from '@/schemas/caso.schema';

import { filasDelCaso } from './construir';
import { valoresDeCaso, valoresVacios } from './valores';

const CASO: EscenarioCatalogo = {
  id: 'c1',
  codigo: 'C-00000001',
  titulo: 'Duelo grupo A',
  descripcion: 'Duelo reciente.',
  categoria: 'clinico',
  dificultad: 'intermedio',
  competenciaCentral: 'Empatía',
  configuracion3d: 'scenes/e-03.json',
  propio: true,
  borrador: null,
  creadoEn: '2026-10-01T10:00:00.000Z',
  npc: {
    id: 'n1',
    nombre: 'Marta Lucía',
    edad: 58,
    perfilClinico: 'Viuda reciente.',
    promptSistema: 'Eres Marta Lucía y hoy estás reservada.',
  },
};

describe('valoresDeCaso', () => {
  it('un caso guardado desde un escenario se abre en modo texto con su prompt', () => {
    expect(valoresDeCaso(CASO)).toMatchObject({
      titulo: 'Duelo grupo A',
      dificultad: 'intermedio',
      consultorio: 'scenes/e-03.json',
      nombre: 'Marta Lucía',
      edad: 58,
      situacion: 'Duelo reciente.',
      modoTexto: true,
      promptManual: CASO.npc.promptSistema,
    });
  });

  it('editar una variante conserva su perfil clínico (síntomas y riesgo incluidos)', () => {
    const perfil =
      'Viuda desde hace cuatro meses. Insomnio y aislamiento social. Sin ideación suicida.';
    const variante = {
      ...CASO,
      descripcion: 'Duelo reciente por la muerte de su esposo.',
      npc: { ...CASO.npc, perfilClinico: perfil, promptSistema: 'Eres Marta Lucía. '.repeat(10) },
    };

    const primera = filasDelCaso(casoFormSchema.parse(valoresDeCaso(variante)));
    expect(primera.npc.perfil_clinico).toBe(perfil);

    // Segunda edición: el caso ya tiene borrador y el perfil se sigue conservando.
    const conBorrador = { ...variante, borrador: primera.escenario.borrador };
    const segunda = filasDelCaso(casoFormSchema.parse(valoresDeCaso(conBorrador)));
    expect(segunda.npc.perfil_clinico).toBe(perfil);

    // Si el docente pasa al constructor guiado, el perfil vuelve a salir de los campos.
    const guiado = {
      ...valoresDeCaso(conBorrador),
      modoTexto: false,
      fraseApertura: 'Hola, ¿qué tal?',
    };
    expect(filasDelCaso(casoFormSchema.parse(guiado)).npc.perfil_clinico).toBe(
      'Duelo reciente por la muerte de su esposo.'
    );
  });

  it('un caso del constructor recupera sus campos del borrador', () => {
    const campos = {
      ...valoresVacios(),
      nombre: 'Camila',
      edad: 29,
      situacion: 'Perdió su empleo.',
    };
    const valores = valoresDeCaso({
      ...CASO,
      borrador: { campos: campos as never, modoTexto: false, promptManual: '' },
    });
    expect(valores).toMatchObject({ nombre: 'Camila', edad: 29, modoTexto: false });
  });

  it('un consultorio desconocido vuelve al primero de la lista', () => {
    expect(valoresDeCaso({ ...CASO, configuracion3d: 'scenes/e-99.json' }).consultorio).toBe(
      valoresVacios().consultorio
    );
  });
});
