import { type CasoFormInput } from '@/schemas/caso.schema';
import { type EscenarioCatalogo } from '@/types';

import { CONSULTORIOS, RUTAS_CONSULTORIO } from './opciones';

/** Valores de un formulario vacío (caso nuevo). */
export function valoresVacios(): CasoFormInput {
  return {
    titulo: '',
    categoria: 'clinico',
    dificultad: 'basico',
    competenciaCentral: '',
    consultorio: CONSULTORIOS[0].ruta,
    nombre: '',
    // Sin valor inicial: el campo numérico arranca vacío.
    edad: undefined as unknown as number,
    ocupacion: '',
    situacion: '',
    sintomas: [],
    sintomasExtra: '',
    actitudes: [],
    seAbreSi: '',
    seCierraSi: '',
    riesgo: 'ninguno',
    fraseApertura: '',
    notas: '',
    modoTexto: false,
    promptManual: '',
  };
}

/**
 * Valores para editar un caso propio. Si se creó con el constructor se recupera su borrador; si
 * viene de un escenario oficial con el prompt ajustado, se abre en modo texto.
 */
export function valoresDeCaso(caso: EscenarioCatalogo): CasoFormInput {
  const base: CasoFormInput = {
    ...valoresVacios(),
    titulo: caso.titulo,
    categoria: caso.categoria,
    dificultad: caso.dificultad,
    competenciaCentral: caso.competenciaCentral,
    consultorio: (RUTAS_CONSULTORIO as readonly string[]).includes(caso.configuracion3d)
      ? (caso.configuracion3d as CasoFormInput['consultorio'])
      : CONSULTORIOS[0].ruta,
  };

  if (caso.borrador) {
    return {
      ...base,
      ...caso.borrador.campos,
      modoTexto: caso.borrador.modoTexto,
      promptManual: caso.borrador.promptManual,
    };
  }

  return {
    ...base,
    nombre: caso.npc.nombre,
    edad: caso.npc.edad,
    situacion: caso.descripcion,
    modoTexto: true,
    promptManual: caso.npc.promptSistema,
  };
}
