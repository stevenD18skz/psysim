/**
 * Escenarios que se muestran en la página pública. Reflejan el catálogo sembrado en
 * supabase/migrations/…_sembrar_escenarios.sql (la página es pública y no consulta la base de datos).
 * Las imágenes son capturas reales de cada escena 3D (scripts/capturar-escenas.mjs).
 */

export type CategoriaPublica = 'Clínico' | 'Cotidiano';

export interface EscenarioPublico {
  codigo: string;
  titulo: string;
  categoria: CategoriaPublica;
  /** 1 = básico, 2 = intermedio, 3 = avanzado. */
  nivel: 1 | 2 | 3;
  competencia: string;
  resumen: string;
  consultorio: string;
  paciente: { nombre: string; foto: string; edad: number; perfil: string; apertura: string };
  imagen: { src: string; alt: string };
}

export const NIVELES_PUBLICOS = ['', 'Básico', 'Intermedio', 'Avanzado'] as const;

export const ESCENARIOS_PUBLICOS: readonly EscenarioPublico[] = [
  {
    codigo: 'E-01',
    titulo: 'Duelo y pérdida',
    categoria: 'Clínico',
    nivel: 1,
    competencia: 'Empatía y validación emocional',
    resumen:
      'Una mujer acude a consulta cuatro meses después de la muerte repentina de su esposo. Presenta tristeza profunda, culpa e insomnio, y le cuesta hablar de lo ocurrido.',
    consultorio: 'Consultorio cálido, luz de tarde',
    paciente: {
      nombre: 'Marta Lucía',
      foto: '/pacientes/marta-lucia.webp',
      edad: 58,
      perfil:
        'Viuda desde hace cuatro meses tras el infarto repentino de su esposo, con quien estuvo casada 32 años. Tristeza persistente, llanto frecuente, culpa por no haber notado señales, insomnio y aislamiento social. Sin ideación suicida.',
      apertura:
        'Buenas... la verdad no sé muy bien por dónde empezar. Mi hija fue la que insistió en que viniera.',
    },
    imagen: {
      src: '/simulacion/consultorio-duelo-y-perdida.webp',
      alt: 'Consultorio cálido en 3D: Marta Lucía sentada en un sillón naranja, con una mesa de centro, una lámpara de pie y una biblioteca',
    },
  },
  {
    codigo: 'E-02',
    titulo: 'Ansiedad generalizada',
    categoria: 'Clínico',
    nivel: 2,
    competencia: 'Evaluación estructurada',
    resumen:
      'Un hombre describe preocupaciones constantes y difíciles de controlar sobre el trabajo, la salud y la familia, acompañadas de tensión muscular e irritabilidad.',
    consultorio: 'Consultorio sereno, luz de mañana',
    paciente: {
      nombre: 'Andrés Felipe',
      foto: '/pacientes/andres-felipe.webp',
      edad: 34,
      perfil:
        'Contador con preocupación excesiva y difícil de controlar desde hace ocho meses sobre el trabajo, la salud y su familia. Tensión muscular, irritabilidad, fatiga y dificultad para concentrarse.',
      apertura:
        'Hola, gracias por recibirme. Es que últimamente no logro desconectarme de nada, todo me preocupa.',
    },
    imagen: {
      src: '/simulacion/consultorio-ansiedad-generalizada.webp',
      alt: 'Consultorio sereno en 3D: Andrés Felipe sentado en un sillón verde frente a una mesa de centro, con una biblioteca a la izquierda',
    },
  },
  {
    codigo: 'E-03',
    titulo: 'Episodio depresivo leve',
    categoria: 'Clínico',
    nivel: 2,
    competencia: 'Evaluación de riesgo',
    resumen:
      'Una joven relata semanas de ánimo bajo, cansancio y pérdida de interés. El estudiante debe explorar los síntomas y evaluar el riesgo con tacto.',
    consultorio: 'Consultorio en penumbra, día nublado',
    paciente: {
      nombre: 'Laura Sofía',
      foto: '/pacientes/laura-sofia.webp',
      edad: 26,
      perfil:
        'Diseñadora gráfica con tres semanas de ánimo bajo, pérdida de interés, cansancio, alteraciones del sueño y dificultad para concentrarse. Ideación pasiva de muerte ocasional, sin plan ni intención.',
      apertura: 'Hola... no sé si esto sea algo importante, la verdad. Solo me siento muy cansada.',
    },
    imagen: {
      src: '/simulacion/consultorio-episodio-depresivo.webp',
      alt: 'Consultorio en penumbra en 3D: Laura Sofía sentada en un sillón morado, con un reloj de pared y luz tenue',
    },
  },
  {
    codigo: 'E-04',
    titulo: 'Crisis de pánico aguda',
    categoria: 'Clínico',
    nivel: 3,
    competencia: 'Intervención en crisis',
    resumen:
      'Un joven llega en plena crisis de pánico: taquicardia, respiración agitada y miedo a morir. Requiere contención inmediata antes de cualquier exploración.',
    consultorio: 'Sala de atención luminosa',
    paciente: {
      nombre: 'Julián David',
      foto: '/pacientes/julian-david.webp',
      edad: 24,
      perfil:
        'Estudiante de último semestre que llega en plena crisis de pánico: taquicardia, hiperventilación, temblor, mareo y miedo intenso a morir. Segundo episodio en el mes.',
      apertura:
        'Perdón... es que... no puedo respirar bien. Siento que el corazón se me va a salir.',
    },
    imagen: {
      src: '/simulacion/sala-crisis-de-panico.webp',
      alt: 'Sala de atención en 3D: Julián David de pie entre dos sillas verdes, con una ventana al fondo',
    },
  },
  {
    codigo: 'E-05',
    titulo: 'Conflicto de pareja',
    categoria: 'Cotidiano',
    nivel: 1,
    competencia: 'Escucha activa',
    resumen:
      'Una mujer busca desahogarse por las discusiones frecuentes con su pareja sobre la distribución de las tareas y la falta de comunicación.',
    consultorio: 'Sala de orientación, luz de atardecer',
    paciente: {
      nombre: 'Carolina',
      foto: '/pacientes/carolina.webp',
      edad: 35,
      perfil:
        'Administradora con discusiones frecuentes con su pareja por la distribución de las tareas del hogar y la falta de comunicación. Frustración y cansancio emocional, sin violencia en la relación.',
      apertura:
        'Hola. Pues vengo porque ya no sé qué hacer con Mauricio, siento que siempre terminamos peleando por lo mismo.',
    },
    imagen: {
      src: '/simulacion/sala-conflicto-de-pareja.webp',
      alt: 'Sala de orientación en 3D: Carolina sentada en un sofá naranja con luz cálida de atardecer',
    },
  },
  {
    codigo: 'E-06',
    titulo: 'Estrés académico',
    categoria: 'Cotidiano',
    nivel: 1,
    competencia: 'Estrategias de afrontamiento',
    resumen:
      'Un estudiante universitario en semana de parciales se siente desbordado por la carga académica, duerme mal y siente presión de su familia.',
    consultorio: 'Oficina de bienestar universitario',
    paciente: {
      nombre: 'Santiago',
      foto: '/pacientes/santiago.webp',
      edad: 20,
      perfil:
        'Estudiante de ingeniería en semana de parciales, desbordado por la carga académica. Procrastinación, insomnio, irritabilidad y presión familiar por mantener la beca.',
      apertura:
        'Qué más. Vengo porque estoy que no doy más con los parciales, siento que me voy a rajar en todo.',
    },
    imagen: {
      src: '/simulacion/oficina-estres-academico.webp',
      alt: 'Oficina de bienestar universitario en 3D: Santiago sentado en una silla, con un escritorio con portátil y una biblioteca',
    },
  },
];
