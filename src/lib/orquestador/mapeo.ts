import { createHash } from 'node:crypto';

import { ACTITUDES, type IdRiesgo, SINTOMAS } from '@/lib/casos/opciones';
import { componerInstrucciones, quitarReglasIncrustadas } from '@/lib/ia/reglas';
import { type CamposCaso } from '@/schemas/caso.schema';
import { type CategoriaEscenario, type DificultadEscenario } from '@/types';

import { type EscenarioOrquestador, type PerfilOrquestador } from './tipos';

/** Prefijo que pidió Juan José para todo perfil y escenario creado desde el entorno 3D. */
export const PREFIJO_3D = '-3D-';

/**
 * Versión del mapeo. Al cambiar cómo se traduce un caso (esta tabla, los rasgos, las reglas
 * fijas), se sube: la huella de todos los casos cambia y se vuelven a sincronizar solos.
 */
export const VERSION_MAPEO = 1;

/** Lo que PsySim sabe de un caso y hace falta para describirlo en el orquestador. */
export interface CasoParaOrquestador {
  /** `E-03` (oficial) o `C-12345678` (propio de un docente). */
  codigo: string;
  titulo: string;
  categoria: CategoriaEscenario;
  dificultad: DificultadEscenario;
  paciente: { nombre: string; edad: number; perfilClinico: string };
  /** Prompt del caso tal como lo usará la práctica (con los ajustes del docente, si los hay). */
  prompt: string;
  /** Campos del constructor guiado, si el caso se creó con él. */
  campos?: CamposCaso | null;
}

/**
 * Severidad inicial y rango de comportamiento según la dificultad del caso. El orquestador mueve
 * la severidad dentro de `[min, max]` en cada turno; 5 es la zona de cierre automático, así que
 * solo los casos avanzados o con riesgo alto pueden llegar a ella.
 */
export const SEVERIDAD_POR_DIFICULTAD: Record<
  DificultadEscenario,
  { inicial: number; min: number; max: number }
> = {
  basico: { inicial: 2, min: 1, max: 4 },
  intermedio: { inicial: 3, min: 1, max: 4.5 },
  avanzado: { inicial: 3, min: 2, max: 5 },
};

/**
 * Cómo modifica el riesgo del caso esa base: `suma` se añade a la severidad inicial (tope 4, para
 * que ninguna práctica empiece en la zona de cierre) y `maximo` amplía el rango hasta 5.
 */
export const AJUSTE_POR_RIESGO: Record<
  IdRiesgo,
  { suma: number; maximo: boolean; bandera: string | null }
> = {
  ninguno: { suma: 0, maximo: false, bandera: null },
  ideacion_pasiva: { suma: 0, maximo: false, bandera: 'ideación_pasiva' },
  ideacion_activa: { suma: 1, maximo: true, bandera: 'ideación_activa' },
  autolesion: { suma: 1, maximo: true, bandera: 'autolesión' },
  terceros: { suma: 1, maximo: true, bandera: 'riesgo_para_terceros' },
};

const SEVERIDAD_INICIAL_MAXIMA = 4;

function sinTildes(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
}

/**
 * Riesgo del caso. Los casos del constructor lo traen en sus campos; en los oficiales y en los
 * redactados a mano se lee de la línea «Riesgo:» del prompt (o del prompt entero si no la tiene).
 */
export function deducirRiesgo(prompt: string, campos?: CamposCaso | null): IdRiesgo {
  if (campos) return campos.riesgo;

  const lineas = prompt.split('\n').filter(linea => /^\s*riesgo\s*:/i.test(linea));
  const texto = sinTildes(lineas.length > 0 ? lineas.join(' ') : prompt);
  if (/quitarte la vida|suicid|idea de como hacerlo/.test(texto)) return 'ideacion_activa';
  if (/te has hecho dano|autolesi|cortarte|lastimarte/.test(texto)) return 'autolesion';
  if (/hacerle dano|imaginas hacer(le)? dano/.test(texto)) return 'terceros';
  if (/mejor no estar|no despertar|desaparecer/.test(texto)) return 'ideacion_pasiva';
  return 'ninguno';
}

/** Severidad inicial (entera, 1 a 4) y rango de comportamiento del caso. */
export function severidadDelCaso(
  dificultad: DificultadEscenario,
  categoria: CategoriaEscenario,
  riesgo: IdRiesgo
): { inicial: number; min: number; max: number } {
  const base = SEVERIDAD_POR_DIFICULTAD[dificultad];
  const ajuste = AJUSTE_POR_RIESGO[riesgo];
  // Una situación cotidiana (una discusión, los parciales) empieza un punto más tranquila.
  const cotidiano = categoria === 'cotidiano' ? 1 : 0;
  const inicial = Math.min(
    SEVERIDAD_INICIAL_MAXIMA,
    Math.max(1, base.inicial + ajuste.suma - cotidiano)
  );
  return {
    inicial,
    min: Math.min(base.min, inicial),
    max: ajuste.maximo ? 5 : base.max,
  };
}

function recortar(texto: string, maximo: number): string {
  const limpio = texto.replace(/\s+/g, ' ').trim();
  return limpio.length > maximo ? `${limpio.slice(0, maximo - 1).trimEnd()}…` : limpio;
}

/** Huella corta y estable de un texto (para distinguir prompts y detectar cambios). */
export function huella(texto: string): string {
  return createHash('sha256').update(texto).digest('hex').slice(0, 16);
}

/**
 * Identifica el prompt de una práctica. Dos prompts que solo difieren en espacios, o en las
 * reglas que versiones antiguas llevaban pegadas al final, son el mismo.
 */
export function huellaDelPrompt(prompt: string): string {
  return huella(quitarReglasIncrustadas(prompt).replace(/\s+/g, ' '));
}

/** Perfil del orquestador (el «quién»): identidad del paciente y su rango de comportamiento. */
export function perfilDelCaso(caso: CasoParaOrquestador): PerfilOrquestador {
  const riesgo = deducirRiesgo(caso.prompt, caso.campos);
  const { min, max } = severidadDelCaso(caso.dificultad, caso.categoria, riesgo);
  const campos = caso.campos;

  const actitudes = campos ? ACTITUDES.filter(a => campos.actitudes.includes(a.id)) : [];
  const sintomas = campos ? SINTOMAS.filter(s => campos.sintomas.includes(s.id)) : [];
  const traits: Record<string, string | number> = { age: caso.paciente.edad };
  if (campos?.ocupacion.trim()) traits.occupation = campos.ocupacion.trim();
  if (actitudes.length > 0) {
    traits.personality = actitudes.map(a => a.texto).join(', ');
    traits.communication_style = actitudes.map(a => a.conducta).join('; ');
  }
  if (sintomas.length > 0) traits.symptoms = sintomas.map(s => s.texto).join(', ');
  traits.language = 'español colombiano';

  return {
    name: `${PREFIJO_3D} ${caso.paciente.nombre} (${caso.codigo})`,
    description: recortar(
      `${caso.paciente.nombre}, ${caso.paciente.edad} años. ${caso.paciente.perfilClinico}`,
      800
    ),
    traits,
    behavior: {
      behavior_min: min,
      behavior_max: max,
      // El orquestador todavía no usa estas dos listas; se envían para cuando lo haga.
      triggers: campos?.seCierraSi.trim() ? [recortar(campos.seCierraSi, 400)] : [],
      regulators: campos?.seAbreSi.trim() ? [recortar(campos.seAbreSi, 400)] : [],
    },
  };
}

/**
 * Escenario del orquestador (el «qué le pasa»). El `context` lleva el prompt completo del caso más
 * las reglas fijas de PsySim: es lo que el orquestador inyecta en su propio prompt. Con
 * `variante`, el nombre lleva la huella del prompt ajustado para esa práctica.
 */
export function escenarioDelCaso(
  caso: CasoParaOrquestador,
  variante: string | null = null
): EscenarioOrquestador {
  const riesgo = deducirRiesgo(caso.prompt, caso.campos);
  const { inicial } = severidadDelCaso(caso.dificultad, caso.categoria, riesgo);
  const bandera = AJUSTE_POR_RIESGO[riesgo].bandera;
  const sufijo = variante ? ` · ajuste ${variante.slice(0, 8)}` : '';

  return {
    name: `${PREFIJO_3D} ${caso.codigo} · ${recortar(caso.titulo, 90)}${sufijo}`,
    context: componerInstrucciones(caso.prompt),
    severity: inicial,
    risk_flags: bandera ? [bandera] : [],
    constraints: { origen: 'PsySim', caso: caso.codigo, mapeo: VERSION_MAPEO },
  };
}

/** Huella de lo que se envía al orquestador: si no cambia, no hace falta actualizarlo. */
export function huellaDeSincronizacion(
  perfil: PerfilOrquestador,
  escenario: EscenarioOrquestador
): string {
  return huella(JSON.stringify([VERSION_MAPEO, perfil, escenario]));
}
