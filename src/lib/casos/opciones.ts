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
  {
    ruta: 'scenes/e-07.json',
    nombre: 'Consultorio de consejería',
    detalle: 'Luz fría de mañana, tonos azulados',
  },
  {
    ruta: 'scenes/e-08.json',
    nombre: 'Sala de acogida',
    detalle: 'Luz cálida de tarde, ambiente sereno',
  },
  {
    ruta: 'scenes/e-09.json',
    nombre: 'Orientación escolar',
    detalle: 'Entorno de colegio, luminoso',
  },
  {
    ruta: 'scenes/e-10.json',
    nombre: 'Consultorio de salud',
    detalle: 'Luz de mediodía, tonos claros',
  },
  {
    ruta: 'scenes/e-11.json',
    nombre: 'Consultorio reservado',
    detalle: 'Tarde tranquila, ambiente discreto',
  },
  {
    ruta: 'scenes/e-12.json',
    nombre: 'Sala para adultos mayores',
    detalle: 'Luz de tarde, ambiente de hogar',
  },
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

/**
 * Actitudes del paciente. Además del adjetivo, cada una describe cómo conversa: los pacientes
 * simulados son más fieles cuando su estilo se define como conducta (estilos de conversación de
 * Patient-Ψ: reservado, verborreico, tangencial, complaciente, molesto).
 */
export const ACTITUDES = [
  {
    id: 'reservado',
    texto: 'reservado',
    conducta: 'das respuestas breves o vagas y necesitas que te animen para hablar de lo personal',
  },
  {
    id: 'hablador',
    texto: 'muy hablador',
    conducta: 'das respuestas largas, con detalles que no hacen falta, y cuesta encauzarte',
  },
  {
    id: 'desconfiado',
    texto: 'desconfiado',
    conducta: 'dudas de las intenciones del estudiante y pruebas si de verdad te escucha',
  },
  {
    id: 'ansioso',
    texto: 'inquieto y ansioso',
    conducta: 'hablas rápido, saltas entre preocupaciones y te anticipas a lo peor',
  },
  {
    id: 'emotivo',
    texto: 'emotivo, al borde del llanto',
    conducta: 'te quiebras con facilidad y a veces necesitas una pausa para seguir',
  },
  {
    id: 'irritable',
    texto: 'irritable',
    conducta: 'contestas con brusquedad cuando algo te molesta',
  },
  {
    id: 'evasivo',
    texto: 'evasivo con los temas dolorosos',
    conducta: 'cambias de tema o restas importancia cuando la conversación toca lo que más duele',
  },
  {
    id: 'tangencial',
    texto: 'disperso, se va por las ramas',
    conducta: 'empiezas a responder y pronto te desvías a otros temas; necesitas que te reencaucen',
  },
  {
    id: 'complaciente',
    texto: 'complaciente',
    conducta:
      'minimizas lo que te pasa y buscas la aprobación del estudiante; dices que estás bien aunque no sea así',
  },
  {
    id: 'resistente',
    texto: 'resistente al proceso',
    conducta: 'cuestionas las propuestas del estudiante, te quejas del proceso y te cuesta confiar',
  },
  {
    id: 'colaborador',
    texto: 'colaborador y dispuesto',
    conducta: 'respondes con disposición, aunque te cuesta nombrar lo que sientes',
  },
  {
    id: 'resignado',
    texto: 'resignado, con poca energía',
    conducta: 'hablas despacio y con pocas palabras, como si nada fuera a cambiar',
  },
] as const;

/** Datos que el paciente guarda y la condición para contarlos (máximo por caso). */
export const MAXIMO_SECRETOS = 4;

export const EJEMPLOS_SECRETOS = [
  {
    dato: 'Desde hace meses toma alcohol casi todas las noches para dormir',
    condicion: 'le preguntan con calma cómo maneja las noches',
  },
  {
    dato: 'Se siente culpable por una discusión con su hijo antes de que se fuera',
    condicion: 'siente que no la van a juzgar',
  },
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
