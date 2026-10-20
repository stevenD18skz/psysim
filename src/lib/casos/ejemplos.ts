import { type CasoFormInput, LIMITES_CASO } from '@/schemas/caso.schema';

import { CONSULTORIOS } from './opciones';

/*
 * Ayudas del constructor para quien nunca ha diseñado un paciente simulado: casos de ejemplo
 * completos para empezar, competencias frecuentes y frases de apertura. Todo se puede cambiar.
 */

export const COMPETENCIAS_FRECUENTES = [
  'Empatía y validación emocional',
  'Escucha activa',
  'Preguntas abiertas y exploración',
  'Encuadre y alianza terapéutica',
  'Evaluación de riesgo',
  'Intervención en crisis',
  'Estrategias de afrontamiento',
] as const;

export const FRASES_APERTURA = [
  'Buenas… la verdad no sé muy bien por dónde empezar.',
  'Hola. Vengo porque me dijeron que me haría bien hablar con alguien.',
  'No sé si esto sea importante, pero ya no puedo más.',
] as const;

type CamposEjemplo = Omit<CasoFormInput, 'modoTexto' | 'promptManual'>;

export interface EjemploCaso {
  id: string;
  etiqueta: string;
  detalle: string;
  valores: CamposEjemplo;
}

export const EJEMPLOS_CASO: readonly EjemploCaso[] = [
  {
    id: 'duelo-madre',
    etiqueta: 'Duelo reciente',
    detalle: 'Básico · empatía',
    valores: {
      titulo: 'Duelo por la muerte de la madre',
      categoria: 'clinico',
      dificultad: 'basico',
      competenciaCentral: 'Empatía y validación emocional',
      consultorio: CONSULTORIOS[0].ruta,
      nombre: 'Rocío Andrea',
      edad: 41,
      ocupacion: 'enfermera de un hospital público',
      situacion:
        'Su madre murió hace dos meses tras una enfermedad larga que ella cuidó sola. Volvió al trabajo enseguida y desde entonces llora a escondidas y casi no duerme.',
      sintomas: ['tristeza', 'llanto', 'insomnio', 'culpa'],
      sintomasExtra: '',
      actitudes: ['emotivo', 'evasivo'],
      seAbreSi: 'el estudiante valida mis emociones; me dan tiempo para responder',
      seCierraSi: 'me dan consejos apresurados; me dicen que debo ser fuerte',
      riesgo: 'ninguno',
      fraseApertura: 'Buenas… perdón, es que no sé muy bien qué hago aquí.',
      notas: 'Tiene un hermano que vive en otra ciudad y casi no la llamó durante la enfermedad.',
      secretos: [
        {
          dato: 'Siente alivio de que su madre ya no sufra, y eso la hace sentir culpable',
          condicion: 'siente que el estudiante no la va a juzgar',
        },
      ],
    },
  },
  {
    id: 'agotamiento',
    etiqueta: 'Agotamiento laboral',
    detalle: 'Intermedio · alianza',
    valores: {
      titulo: 'Agotamiento laboral y conflictos en casa',
      categoria: 'clinico',
      dificultad: 'intermedio',
      competenciaCentral: 'Encuadre y alianza terapéutica',
      consultorio: CONSULTORIOS[1].ruta,
      nombre: 'Diego Alejandro',
      edad: 38,
      ocupacion: 'ingeniero de soporte técnico',
      situacion:
        'Lleva un año con turnos extendidos. Su pareja le dio un ultimátum: o busca ayuda o se separan. Viene sin mucha convicción.',
      sintomas: ['fatiga', 'irritabilidad', 'concentracion', 'insomnio'],
      sintomasExtra: '',
      actitudes: ['irritable', 'resistente'],
      seAbreSi: 'me escuchan sin interrumpir; no me tratan como un problema',
      seCierraSi: 'me juzgan o minimizan lo que siento; me hacen muchas preguntas seguidas',
      riesgo: 'ninguno',
      fraseApertura: 'Vengo porque mi pareja insistió. La verdad no creo que esto sirva de mucho.',
      notas: '',
      secretos: [
        {
          dato: 'Ha empezado a tomar cerveza casi todas las noches para poder dormir',
          condicion: 'le preguntan con calma cómo descansa',
        },
      ],
    },
  },
  {
    id: 'universidad',
    etiqueta: 'Llegada a la universidad',
    detalle: 'Básico · escucha',
    valores: {
      titulo: 'Adaptación al primer semestre',
      categoria: 'cotidiano',
      dificultad: 'basico',
      competenciaCentral: 'Escucha activa',
      consultorio: CONSULTORIOS[5].ruta,
      nombre: 'Valentina',
      edad: 18,
      ocupacion: 'estudiante de primer semestre de derecho',
      situacion:
        'Se mudó sola desde un pueblo para estudiar. Extraña a su familia, no ha hecho amigos y siente que todos van más adelantados que ella.',
      sintomas: ['ansiedad', 'aislamiento', 'apetito'],
      sintomasExtra: '',
      actitudes: ['complaciente', 'reservado'],
      seAbreSi: 'me hacen preguntas abiertas; me escuchan sin interrumpir',
      seCierraSi: 'me dan consejos apresurados',
      riesgo: 'ninguno',
      fraseApertura: 'Hola… bueno, no es nada grave, solo que me han recomendado venir.',
      notas: '',
      secretos: [
        {
          dato: 'Está pensando en dejar la carrera y no se lo ha dicho a sus papás',
          condicion: 'siente confianza y le preguntan por sus planes',
        },
      ],
    },
  },
];

/** Lo que falta para poder guardar el caso, con el campo al que lleva cada aviso. */
export function camposFaltantes(
  valores: Partial<CasoFormInput>
): { campo: string; texto: string }[] {
  const faltan: { campo: string; texto: string }[] = [];
  const largo = (texto: string | undefined) => (texto ?? '').trim().length;
  if (largo(valores.titulo) < LIMITES_CASO.titulo.min) {
    faltan.push({ campo: 'titulo', texto: 'El título del caso' });
  }
  if (largo(valores.competenciaCentral) < LIMITES_CASO.competencia.min) {
    faltan.push({ campo: 'competenciaCentral', texto: 'La competencia que se entrena' });
  }
  if (largo(valores.nombre) < LIMITES_CASO.nombre.min) {
    faltan.push({ campo: 'nombre', texto: 'El nombre del paciente' });
  }
  const edad = Number(valores.edad);
  if (!Number.isFinite(edad) || edad < LIMITES_CASO.edad.min || edad > LIMITES_CASO.edad.max) {
    faltan.push({ campo: 'edad', texto: 'La edad' });
  }
  if (largo(valores.situacion) < LIMITES_CASO.situacion.min) {
    faltan.push({
      campo: 'situacion',
      texto: `La situación (al menos ${LIMITES_CASO.situacion.min} caracteres)`,
    });
  }
  if (!valores.modoTexto && largo(valores.fraseApertura) < LIMITES_CASO.fraseApertura.min) {
    faltan.push({ campo: 'fraseApertura', texto: 'La frase de apertura' });
  }
  return faltan;
}
