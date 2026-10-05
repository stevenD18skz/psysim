/** Opciones del constructor de casos: consultorios, riesgo y chips de ayuda para el docente. */

/**
 * Consultorios disponibles. Cada uno es una escena existente (public/scenes) e incluye el aspecto
 * del paciente.
 */
export const CONSULTORIOS = [
  {
    ruta: 'scenes/e-01.json',
    nombre: 'Consultorio cálido',
    detalle: 'Luz de tarde, tonos cálidos',
  },
  {
    ruta: 'scenes/e-02.json',
    nombre: 'Consultorio sereno',
    detalle: 'Luz de mañana, tonos suaves',
  },
  {
    ruta: 'scenes/e-03.json',
    nombre: 'Consultorio en penumbra',
    detalle: 'Día nublado, ambiente apagado',
  },
  {
    ruta: 'scenes/e-04.json',
    nombre: 'Sala de atención',
    detalle: 'Luminosa, pensada para crisis',
  },
  {
    ruta: 'scenes/e-05.json',
    nombre: 'Sala de orientación',
    detalle: 'Atardecer, ambiente cercano',
  },
  { ruta: 'scenes/e-06.json', nombre: 'Oficina de bienestar', detalle: 'Entorno universitario' },
] as const;

type RutaConsultorio = (typeof CONSULTORIOS)[number]['ruta'];

export const RUTAS_CONSULTORIO = CONSULTORIOS.map(c => c.ruta) as [
  RutaConsultorio,
  ...RutaConsultorio[],
];

export const NIVELES_RIESGO = [
  {
    id: 'ninguno',
    etiqueta: 'Sin riesgo',
    descripcion: 'No hay ideación suicida, autolesión ni riesgo para otras personas.',
    instruccion:
      'No presentas ideas de hacerte daño ni de dañar a otros; si te preguntan, lo niegas con naturalidad.',
  },
  {
    id: 'ideacion_pasiva',
    etiqueta: 'Ideación pasiva',
    descripcion: 'A veces piensa que "sería mejor no estar", sin plan ni intención.',
    instruccion:
      'A veces piensas que sería mejor no estar, pero no tienes plan ni intención. Solo lo mencionas si el estudiante pregunta con tacto y confianza; no lo ofrezcas de entrada.',
  },
  {
    id: 'ideacion_activa',
    etiqueta: 'Ideación con plan',
    descripcion: 'Tiene ideas de quitarse la vida con un plan. Requiere evaluación de riesgo.',
    instruccion:
      'Has pensado en quitarte la vida y tienes una idea de cómo hacerlo, pero no lo dices abiertamente. Solo lo revelas si el estudiante pregunta de forma directa y respetuosa por tus ideas de muerte. Nunca describas métodos con detalle.',
  },
  {
    id: 'autolesion',
    etiqueta: 'Autolesión',
    descripcion: 'Se ha hecho daño como forma de manejar el malestar.',
    instruccion:
      'Alguna vez te has hecho daño para aliviar el malestar y lo sientes con vergüenza. Solo lo cuentas si te sientes sin juicio. Nunca describas métodos ni detalles.',
  },
  {
    id: 'terceros',
    etiqueta: 'Riesgo para terceros',
    descripcion: 'Siente impulsos de hacerle daño a otra persona.',
    instruccion:
      'Sientes mucha rabia hacia una persona y a veces imaginas hacerle daño, aunque no tienes un plan. Solo lo expresas si el estudiante pregunta con calma; nunca des detalles de cómo hacerlo.',
  },
] as const;

export type IdRiesgo = (typeof NIVELES_RIESGO)[number]['id'];
export const IDS_RIESGO = NIVELES_RIESGO.map(r => r.id) as [IdRiesgo, ...IdRiesgo[]];

export const SINTOMAS = [
  { id: 'tristeza', texto: 'tristeza persistente' },
  { id: 'llanto', texto: 'llanto frecuente' },
  { id: 'insomnio', texto: 'dificultad para dormir' },
  { id: 'ansiedad', texto: 'preocupación excesiva' },
  { id: 'tension', texto: 'tensión muscular' },
  { id: 'fatiga', texto: 'cansancio constante' },
  { id: 'irritabilidad', texto: 'irritabilidad' },
  { id: 'concentracion', texto: 'dificultad para concentrarse' },
  { id: 'aislamiento', texto: 'aislamiento social' },
  { id: 'culpa', texto: 'sentimientos de culpa' },
  { id: 'apetito', texto: 'cambios en el apetito' },
  { id: 'panico', texto: 'palpitaciones y falta de aire' },
  { id: 'desinteres', texto: 'pérdida de interés' },
] as const;

export const ACTITUDES = [
  { id: 'reservado', texto: 'reservado' },
  { id: 'hablador', texto: 'muy hablador' },
  { id: 'desconfiado', texto: 'desconfiado' },
  { id: 'ansioso', texto: 'inquieto y ansioso' },
  { id: 'emotivo', texto: 'emotivo, al borde del llanto' },
  { id: 'irritable', texto: 'irritable' },
  { id: 'evasivo', texto: 'evasivo con los temas dolorosos' },
  { id: 'colaborador', texto: 'colaborador y dispuesto' },
  { id: 'resignado', texto: 'resignado, con poca energía' },
] as const;

export const SUGERENCIAS_SE_ABRE = [
  'el estudiante valida mis emociones',
  'me hacen preguntas abiertas',
  'me escuchan sin interrumpir',
  'me dan tiempo para responder',
] as const;

export const SUGERENCIAS_SE_CIERRA = [
  'me juzgan o minimizan lo que siento',
  'me dan consejos apresurados',
  'me interrumpen',
  'me hacen muchas preguntas seguidas',
] as const;

export type IdSintoma = (typeof SINTOMAS)[number]['id'];
export type IdActitud = (typeof ACTITUDES)[number]['id'];
export const IDS_SINTOMA = SINTOMAS.map(s => s.id) as [IdSintoma, ...IdSintoma[]];
export const IDS_ACTITUD = ACTITUDES.map(a => a.id) as [IdActitud, ...IdActitud[]];
