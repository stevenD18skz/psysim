import { type CamposCaso, type CasoFormData, type BorradorCaso } from '@/schemas/caso.schema';

import { componerPerfilClinico, componerPrompt } from './componer-prompt';

/** Extrae del formulario los campos del paciente (los que componen el prompt). */
export function camposDelFormulario(caso: CasoFormData): CamposCaso {
  return {
    nombre: caso.nombre,
    edad: caso.edad,
    ocupacion: caso.ocupacion,
    situacion: caso.situacion,
    sintomas: caso.sintomas,
    sintomasExtra: caso.sintomasExtra,
    actitudes: caso.actitudes,
    seAbreSi: caso.seAbreSi,
    seCierraSi: caso.seCierraSi,
    riesgo: caso.riesgo,
    fraseApertura: caso.fraseApertura,
    notas: caso.notas,
  };
}

/** Prompt final del caso: el redactado a mano o el compuesto por el constructor. */
export function promptDelCaso(caso: CasoFormData): string {
  return caso.modoTexto ? caso.promptManual.trim() : componerPrompt(camposDelFormulario(caso));
}

/** Filas de `escenario` y `npc` que corresponden a un caso del constructor. */
export function filasDelCaso(caso: CasoFormData) {
  const campos = camposDelFormulario(caso);
  const borrador: BorradorCaso = {
    campos,
    modoTexto: caso.modoTexto,
    promptManual: caso.promptManual,
  };
  return {
    escenario: {
      titulo: caso.titulo,
      descripcion: caso.situacion,
      categoria: caso.categoria,
      dificultad: caso.dificultad,
      competencia_central: caso.competenciaCentral,
      configuracion_3d: caso.consultorio,
      borrador,
    },
    npc: {
      nombre: caso.nombre,
      edad: caso.edad,
      perfil_clinico: componerPerfilClinico(campos),
      prompt_sistema: promptDelCaso(caso),
    },
  };
}
