import { ACTITUDES, type IdActitud } from './opciones';

/*
 * Ajustes del paciente para una práctica concreta, sin escribir instrucciones para la IA. El
 * docente elige con botones (que se abra más o menos, cuánto se le notan las emociones, una
 * actitud distinta, algo que guarde) y, si quiere, añade una indicación con sus palabras. Todo se
 * traduce a un bloque de texto que se suma al final del comportamiento del caso.
 */

export type Apertura = 'mas-abierto' | 'igual' | 'mas-reservado';
export type IntensidadAjuste = 'mas-suave' | 'igual' | 'mas-intenso';

export interface SecretoAjuste {
  dato: string;
  condicion: string;
}

export interface AjustesPractica {
  apertura: Apertura;
  intensidad: IntensidadAjuste;
  /** Actitudes que se suman a las del caso. */
  actitudes: IdActitud[];
  /** Datos que el paciente guarda en esta práctica (además de los del caso). */
  secretos: SecretoAjuste[];
  /** Indicación libre del docente, en lenguaje cotidiano. */
  indicacion: string;
}

export const AJUSTES_VACIOS: Readonly<AjustesPractica> = {
  apertura: 'igual',
  intensidad: 'igual',
  actitudes: [],
  secretos: [],
  indicacion: '',
};

export const MAXIMO_SECRETOS_AJUSTE = 2;
export const MAXIMO_INDICACION = 400;

export const OPCIONES_APERTURA: readonly { valor: Apertura; etiqueta: string; detalle: string }[] =
  [
    { valor: 'mas-abierto', etiqueta: 'Se abre más', detalle: 'Habla con menos esfuerzo' },
    { valor: 'igual', etiqueta: 'Como el caso', detalle: 'Sin cambios' },
    { valor: 'mas-reservado', etiqueta: 'Más reservado', detalle: 'Hay que ganarse su confianza' },
  ];

export const OPCIONES_INTENSIDAD: readonly {
  valor: IntensidadAjuste;
  etiqueta: string;
  detalle: string;
}[] = [
  { valor: 'mas-suave', etiqueta: 'Más contenido', detalle: 'Las emociones se notan menos' },
  { valor: 'igual', etiqueta: 'Como el caso', detalle: 'Sin cambios' },
  { valor: 'mas-intenso', etiqueta: 'Más intenso', detalle: 'Emociones a flor de piel' },
];

/** Ideas de indicaciones con las propias palabras del docente. */
export const EJEMPLOS_INDICACION = [
  'Hoy viene después de una discusión fuerte con su familia.',
  'Llega tarde y apurado; al principio quiere irse pronto.',
  'Pregunta varias veces si lo que cuenta es confidencial.',
] as const;

const TEXTO_APERTURA: Record<Exclude<Apertura, 'igual'>, string> = {
  'mas-abierto':
    'Hoy estás algo más dispuesto a hablar que de costumbre: te abres con menos esfuerzo.',
  'mas-reservado':
    'Hoy te cuesta más abrirte que de costumbre: el estudiante tendrá que ganarse tu confianza con más paciencia.',
};

const TEXTO_INTENSIDAD: Record<Exclude<IntensidadAjuste, 'igual'>, string> = {
  'mas-suave': 'Tus emociones se notan menos que de costumbre: estás más contenido.',
  'mas-intenso': 'Tus emociones están más a flor de piel que de costumbre.',
};

function limpio(texto: string): string {
  return texto.trim().replace(/[.\s]+$/, '');
}

function secretosCompletos(ajustes: AjustesPractica): SecretoAjuste[] {
  return ajustes.secretos.filter(s => limpio(s.dato) && limpio(s.condicion));
}

export function hayAjustes(ajustes: AjustesPractica): boolean {
  return (
    ajustes.apertura !== 'igual' ||
    ajustes.intensidad !== 'igual' ||
    ajustes.actitudes.length > 0 ||
    secretosCompletos(ajustes).length > 0 ||
    limpio(ajustes.indicacion).length > 0
  );
}

/** El bloque de texto para la IA (vacío si no hay ajustes). */
export function componerAjustes(ajustes: AjustesPractica): string {
  if (!hayAjustes(ajustes)) return '';
  const lineas = ['Ajustes del docente para esta práctica (tienen prioridad sobre lo anterior):'];
  if (ajustes.apertura !== 'igual') lineas.push(`- ${TEXTO_APERTURA[ajustes.apertura]}`);
  if (ajustes.intensidad !== 'igual') lineas.push(`- ${TEXTO_INTENSIDAD[ajustes.intensidad]}`);
  const actitudes = ACTITUDES.filter(a => ajustes.actitudes.includes(a.id));
  if (actitudes.length > 0) {
    lineas.push(`- Además, hoy ${actitudes.map(a => a.conducta).join('; ')}.`);
  }
  for (const { dato, condicion } of secretosCompletos(ajustes)) {
    lineas.push(
      `- Guardas esto (no lo cuentes de entrada): ${limpio(dato)}. Lo cuentas solo si ${limpio(condicion)}.`
    );
  }
  const indicacion = limpio(ajustes.indicacion).slice(0, MAXIMO_INDICACION);
  if (indicacion) lineas.push(`- Indicación del docente: ${indicacion}.`);
  return lineas.join('\n');
}

/** El comportamiento del caso con los ajustes al final. */
export function promptConAjustes(base: string, ajustes: AjustesPractica): string {
  const bloque = componerAjustes(ajustes);
  return bloque ? `${base.trimEnd()}\n\n${bloque}` : base;
}

/** Los ajustes contados en lenguaje cotidiano, para que el docente vea qué cambiará. */
export function resumenAjustes(ajustes: AjustesPractica): string[] {
  const resumen: string[] = [];
  const apertura = OPCIONES_APERTURA.find(o => o.valor === ajustes.apertura);
  if (apertura && ajustes.apertura !== 'igual')
    resumen.push(`${apertura.etiqueta}: ${apertura.detalle.toLowerCase()}.`);
  const intensidad = OPCIONES_INTENSIDAD.find(o => o.valor === ajustes.intensidad);
  if (intensidad && ajustes.intensidad !== 'igual')
    resumen.push(`${intensidad.etiqueta}: ${intensidad.detalle.toLowerCase()}.`);
  for (const actitud of ACTITUDES.filter(a => ajustes.actitudes.includes(a.id))) {
    resumen.push(`Se muestra ${actitud.texto}.`);
  }
  for (const { dato } of secretosCompletos(ajustes)) resumen.push(`Guarda: ${limpio(dato)}.`);
  if (limpio(ajustes.indicacion)) resumen.push(`Tu indicación: «${limpio(ajustes.indicacion)}».`);
  return resumen;
}
