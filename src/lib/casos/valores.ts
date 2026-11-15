import { ETIQUETA_DIFICULTAD } from '@/lib/escenarios/etiquetas';
import { type CasoFormInput, LIMITES_CASO } from '@/schemas/caso.schema';
import { type DificultadEscenario, type EscenarioCatalogo } from '@/types';

import { FRASES_APERTURA } from './ejemplos';
import {
  ACTITUDES,
  CONSULTORIOS,
  type IdActitud,
  type IdSintoma,
  RUTAS_CONSULTORIO,
  SINTOMAS,
} from './opciones';

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
    secretos: [],
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
      perfilHeredado: caso.borrador.perfilHeredado,
    };
  }

  return {
    ...base,
    nombre: caso.npc.nombre,
    edad: caso.npc.edad,
    situacion: caso.descripcion,
    modoTexto: true,
    promptManual: caso.npc.promptSistema,
    perfilHeredado: caso.npc.perfilClinico,
  };
}

const PAUTAS_POR_NIVEL: Record<
  DificultadEscenario,
  {
    actitudes: IdActitud[];
    seAbreSi: string;
    seCierraSi: string;
  }
> = {
  basico: {
    actitudes: ['colaborador'],
    seAbreSi: 'me hacen preguntas abiertas; me escuchan sin interrumpir',
    seCierraSi: 'me dan consejos apresurados; me interrumpen',
  },
  intermedio: {
    actitudes: ['reservado', 'evasivo'],
    seAbreSi: 'el estudiante valida mis emociones; me dan tiempo para responder',
    seCierraSi: 'me juzgan o minimizan lo que siento; me hacen muchas preguntas seguidas',
  },
  avanzado: {
    actitudes: ['desconfiado', 'resistente'],
    seAbreSi: 'percibo empatía genuina sin juicios y respetan mi silencio durante la consulta',
    seCierraSi:
      'me presionan para hablar, usan frases hechas o intentan dirigir la consulta sin escucharme',
  },
};

function detectarSintomas(texto: string): IdSintoma[] {
  const minusculas = texto.toLowerCase();
  return SINTOMAS.filter(
    s => minusculas.includes(s.id) || minusculas.includes(s.texto.toLowerCase())
  ).map(s => s.id);
}

function detectarActitudes(texto: string, respaldo: DificultadEscenario): IdActitud[] {
  const minusculas = texto.toLowerCase();
  const halladas = ACTITUDES.filter(
    a => minusculas.includes(a.id) || minusculas.includes(a.texto.toLowerCase())
  ).map(a => a.id);
  return halladas.length > 0 ? halladas.slice(0, 3) : PAUTAS_POR_NIVEL[respaldo].actitudes;
}

function extraerFraseApertura(prompt: string): string {
  const entreComillas = /["«“]([^"»”]{10,260})["»”]/.exec(prompt);
  if (entreComillas?.[1]) return entreComillas[1].trim();
  return FRASES_APERTURA[0];
}

function limparSufijoTitulo(titulo: string): string {
  return titulo
    .replace(/\s*\((?:mi versión|copia|variante|nivel (?:básico|intermedio|avanzado))\)\s*$/i, '')
    .trim();
}

/**
 * Adapta los campos del constructor a un nuevo nivel de dificultad: ajusta el título, la
 * exigencia en la actitud del paciente y las condiciones con las que se abre o se cierra.
 */
export function adaptarDificultadCaso(
  valores: CasoFormInput,
  dificultad: DificultadEscenario,
  tituloBase?: string
): CasoFormInput {
  const pauta = PAUTAS_POR_NIVEL[dificultad];
  const baseTitulo = limparSufijoTitulo(tituloBase ?? valores.titulo);
  const etiquetaNivel = ETIQUETA_DIFICULTAD[dificultad].toLowerCase();
  const nuevoTitulo = baseTitulo
    ? `${baseTitulo} (nivel ${etiquetaNivel})`.slice(0, LIMITES_CASO.titulo.max)
    : valores.titulo;

  return {
    ...valores,
    titulo: nuevoTitulo,
    dificultad,
    actitudes: pauta.actitudes,
    seAbreSi: pauta.seAbreSi,
    seCierraSi: pauta.seCierraSi,
  };
}

/**
 * Prepara los valores iniciales del constructor guiado a partir de un caso previo (ya sea uno
 * predefinido de PsySim o uno propio del docente). Siempre devuelve el formulario en modo guiado
 * para que el docente pueda variar el nivel de dificultad, la actitud o los detalles con botones.
 */
export function valoresDesdePlantilla(
  caso: EscenarioCatalogo,
  dificultadOpcional?: DificultadEscenario
): CasoFormInput {
  const dificultad = dificultadOpcional ?? caso.dificultad;
  const baseTitulo = limparSufijoTitulo(caso.titulo);
  const sufijo =
    dificultadOpcional && dificultadOpcional !== caso.dificultad
      ? `nivel ${ETIQUETA_DIFICULTAD[dificultadOpcional].toLowerCase()}`
      : 'mi versión';
  const titulo = `${baseTitulo} (${sufijo})`.slice(0, LIMITES_CASO.titulo.max);

  const consultorio = (RUTAS_CONSULTORIO as readonly string[]).includes(caso.configuracion3d)
    ? (caso.configuracion3d as CasoFormInput['consultorio'])
    : CONSULTORIOS[0].ruta;

  if (caso.borrador && !caso.borrador.modoTexto) {
    const desdeBorrador: CasoFormInput = {
      ...valoresVacios(),
      ...caso.borrador.campos,
      titulo,
      categoria: caso.categoria,
      dificultad,
      competenciaCentral: caso.competenciaCentral,
      consultorio,
      modoTexto: false,
      promptManual: '',
    };
    return dificultadOpcional && dificultadOpcional !== caso.dificultad
      ? adaptarDificultadCaso(desdeBorrador, dificultadOpcional, baseTitulo)
      : desdeBorrador;
  }

  const pauta = PAUTAS_POR_NIVEL[dificultad];
  const textoFuente = `${caso.descripcion} ${caso.npc.perfilClinico} ${caso.npc.promptSistema}`;
  const sintomas = detectarSintomas(textoFuente);
  const actitudes =
    dificultadOpcional && dificultadOpcional !== caso.dificultad
      ? pauta.actitudes
      : detectarActitudes(textoFuente, dificultad);

  return {
    ...valoresVacios(),
    titulo,
    categoria: caso.categoria,
    dificultad,
    competenciaCentral: caso.competenciaCentral,
    consultorio,
    nombre: caso.npc.nombre,
    edad: caso.npc.edad,
    ocupacion: '',
    situacion: caso.descripcion.slice(0, LIMITES_CASO.situacion.max),
    sintomas,
    sintomasExtra: '',
    actitudes,
    seAbreSi: pauta.seAbreSi,
    seCierraSi: pauta.seCierraSi,
    riesgo: 'ninguno',
    fraseApertura: extraerFraseApertura(caso.npc.promptSistema).slice(
      0,
      LIMITES_CASO.fraseApertura.max
    ),
    notas: caso.npc.perfilClinico.slice(0, LIMITES_CASO.notas.max),
    secretos: [],
    modoTexto: false,
    promptManual: '',
  };
}
