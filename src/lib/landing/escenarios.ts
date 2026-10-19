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
  {
    codigo: 'E-07',
    titulo: 'Consumo de alcohol y ambivalencia',
    categoria: 'Clínico',
    nivel: 2,
    competencia: 'Entrevista motivacional',
    resumen:
      'Un taxista llega presionado por su esposa, que le dijo que se irá con los hijos si sigue tomando. Él cree que toma como cualquiera. Hay que explorar su ambivalencia sin sermonear ni etiquetar.',
    consultorio: 'Consultorio de consejería, luz fría de mañana',
    paciente: {
      nombre: 'Hernán',
      foto: '/pacientes/hernan.webp',
      edad: 46,
      perfil:
        'Taxista casado, con dos hijos. Toma casi todos los fines de semana y varias noches entre semana; su esposa le planteó que se irá con los hijos si sigue. Minimiza el consumo y se muestra a la defensiva. Ambivalente ante el cambio. Sin riesgo para sí ni para otros.',
      apertura: 'Vengo porque mi señora me tiene amenazado, pero yo no tengo ningún problema, ¿ah?',
    },
    imagen: {
      src: '/simulacion/consultorio-consumo-de-alcohol.webp',
      alt: 'Consultorio de consejería en 3D: Hernán sentado en un sillón azul grisáceo, con una mesa de centro, una lámpara de pie y una biblioteca',
    },
  },
  {
    codigo: 'E-08',
    titulo: 'Trauma por desplazamiento forzado',
    categoria: 'Clínico',
    nivel: 3,
    competencia: 'Intervención informada en trauma',
    resumen:
      'Una mujer desplazada por el conflicto armado llega remitida por una fundación, con pesadillas, sobresaltos y culpa. Hay que ir despacio, validar y dejar que ella decida cuánto cuenta.',
    consultorio: 'Sala de acogida de una fundación, luz de tarde',
    paciente: {
      nombre: 'Yolanda',
      foto: '/pacientes/yolanda.webp',
      edad: 34,
      perfil:
        'Mujer desplazada de una vereda del Cauca, en Cali desde hace un año, que trabaja en casas de familia. Pesadillas, sobresaltos, insomnio, evitación de salir de noche y culpa. Reservada y evasiva con lo doloroso. Sin riesgo para sí ni para otros.',
      apertura: 'Buenas… me mandaron de la fundación. La verdad no sé si esto me sirva.',
    },
    imagen: {
      src: '/simulacion/sala-trauma-por-desplazamiento.webp',
      alt: 'Sala de acogida en 3D: Yolanda sentada en un sofá verde con luz cálida de tarde, una lámpara de pie y una ventana a la izquierda',
    },
  },
  {
    codigo: 'E-09',
    titulo: 'Adolescente con autolesiones',
    categoria: 'Clínico',
    nivel: 3,
    competencia: 'Evaluación de riesgo con adolescentes',
    resumen:
      'La orientadora de un colegio remite a una adolescente tras ver cortes en sus antebrazos. Es desconfiada y reservada: hay que explorar el riesgo con honestidad sobre la confidencialidad y sus límites.',
    consultorio: 'Oficina de orientación escolar',
    paciente: {
      nombre: 'Sara',
      foto: '/pacientes/sara.webp',
      edad: 15,
      perfil:
        'Estudiante de grado décimo remitida por la orientadora del colegio tras ver cortes en sus antebrazos. Desconfiada y reservada. Autolesión como forma de manejar el malestar; ciberacoso; ideación pasiva de muerte sin plan ni intención.',
      apertura: 'La orientadora me obligó a venir. No sé qué quiere que le diga.',
    },
    imagen: {
      src: '/simulacion/orientacion-adolescente-autolesiones.webp',
      alt: 'Oficina de orientación escolar en 3D: Sara sentada en una silla naranja, con una mesa de centro, un escritorio con portátil y una biblioteca',
    },
  },
  {
    codigo: 'E-10',
    titulo: 'Conducta alimentaria restrictiva',
    categoria: 'Clínico',
    nivel: 2,
    competencia: 'Exploración sin confrontar',
    resumen:
      'Una joven bailarina llega remitida por su médico por cansancio y mareos. Minimiza lo que le pasa y evita hablar de la comida: hay que explorar sin confrontar ni centrarse en el peso.',
    consultorio: 'Consultorio de salud universitario, luz de mediodía',
    paciente: {
      nombre: 'Daniela',
      foto: '/pacientes/daniela.webp',
      edad: 20,
      perfil:
        'Estudiante de administración y bailarina, remitida por su médico por cansancio y mareos. Complaciente y evasiva; minimiza. Restricción alimentaria, conductas compensatorias ocasionales y control del peso. Sin riesgo para sí ni para otros.',
      apertura:
        'Hola. El médico dijo que viniera porque me he mareado, pero yo creo que es el estrés de la U.',
    },
    imagen: {
      src: '/simulacion/consultorio-conducta-alimentaria.webp',
      alt: 'Consultorio luminoso en 3D: Daniela sentada en un sillón verde azulado frente a una mesa de centro, con un sofá a la izquierda y una biblioteca a la derecha',
    },
  },
  {
    codigo: 'E-11',
    titulo: 'Violencia en la pareja',
    categoria: 'Clínico',
    nivel: 3,
    competencia: 'Detección de violencia y plan de seguridad',
    resumen:
      'Una mujer consulta por estrés y dolores de cabeza, y justifica a su pareja. Hay que detectar con tacto una posible violencia, sin presionarla, y acompañarla a pensar en su seguridad.',
    consultorio: 'Consultorio reservado, luz de tarde',
    paciente: {
      nombre: 'Paola',
      foto: '/pacientes/paola.webp',
      edad: 29,
      perfil:
        'Cajera de supermercado, con una hija de 4 años, que consulta por estrés y dolores de cabeza. Complaciente y ansiosa; justifica a su pareja. Control, amenazas y un episodio reciente de violencia física por parte de la pareja. Sin ideas de hacerse daño; el riesgo viene de un tercero.',
      apertura:
        'Es que ando con mucho estrés, me duele la cabeza todo el tiempo… pero en la casa todo bien, ¿sí?',
    },
    imagen: {
      src: '/simulacion/consultorio-violencia-en-la-pareja.webp',
      alt: 'Consultorio reservado en 3D: Paola sentada en un sillón azul con una alfombra azul grisácea, un reloj de pared y un sofá gris a la derecha',
    },
  },
  {
    codigo: 'E-12',
    titulo: 'Soledad y olvidos en la vejez',
    categoria: 'Cotidiano',
    nivel: 1,
    competencia: 'Comunicación con adultos mayores',
    resumen:
      'Un profesor jubilado, viudo y con los hijos en el exterior, viene porque su hija se preocupa. Habla con gusto de su vida y se va por las ramas: hay que escucharlo con paciencia y preguntar con tacto.',
    consultorio: 'Consulta del adulto mayor, luz de tarde',
    paciente: {
      nombre: 'Gilberto',
      foto: '/pacientes/gilberto.webp',
      edad: 74,
      perfil:
        'Profesor jubilado, viudo hace tres años, con los hijos en el exterior. Colaborador y hablador. Episodio reciente de desorientación al volver a casa y descuido de las comidas. Soledad. Sin riesgo para sí ni para otros.',
      apertura:
        'Buenas tardes, jovencito. Mi hija insistió por videollamada en que viniera; ella siempre tan preocupada.',
    },
    imagen: {
      src: '/simulacion/sala-soledad-y-olvidos.webp',
      alt: 'Consulta del adulto mayor en 3D: Gilberto sentado en un sillón marrón sobre una alfombra terracota, con dos estanterías de libros y una lámpara de pie',
    },
  },
];
