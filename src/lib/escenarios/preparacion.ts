import { type CategoriaEscenario } from '@/types';

/*
 * Preparación previa (prebriefing) de la práctica, según las normas INACSL de buenas prácticas en
 * simulación: antes de empezar, el estudiante conoce los objetivos, las reglas del juego (el
 * acuerdo de ficción) y las herramientas con que cuenta, en un ambiente de seguridad psicológica
 * donde equivocarse es parte de aprender. No evalúa ni puntúa nada: orienta.
 */

/**
 * Objetivos de la práctica: el encuadre y el cierre de cualquier entrevista, y en el centro la
 * competencia que entrena el caso.
 */
export function objetivosDePractica(
  competenciaCentral: string,
  categoria: CategoriaEscenario
): string[] {
  const competencia = competenciaCentral.trim().replace(/[.\s]+$/, '');
  return [
    'Abrir el encuentro: preséntate y explica para qué están ahí.',
    categoria === 'clinico'
      ? 'Explorar el motivo de consulta con preguntas abiertas, a su ritmo.'
      : 'Explorar lo que le preocupa con preguntas abiertas, a su ritmo.',
    `Practicar la competencia del caso: ${competencia.charAt(0).toLowerCase()}${competencia.slice(1)}.`,
    'Cerrar el encuentro con un resumen de lo conversado.',
  ];
}

/**
 * Acuerdo de ficción: la simulación funciona si se la trata como real, sabiendo que no lo es.
 * Va con las demás reglas de la pantalla de instrucciones.
 */
export const ACUERDO_FICCION =
  'Trata al paciente como a una persona real: lo que ensayes aquí es lo que llevarás a consulta. A la vez, recuerda que es una simulación: si algo te afecta, puedes salir.';

/** Herramientas durante la práctica, con su atajo (si lo tiene). */
export const HERRAMIENTAS_PRACTICA: readonly { nombre: string; detalle: string }[] = [
  {
    nombre: 'Ensayar otra respuesta',
    detalle:
      'Vuelve a cualquiera de tus intervenciones y reformúlala. El paciente olvida lo que vino después; tu docente ve el intento.',
  },
  {
    nombre: 'Hoja de remisión',
    detalle: 'Relee lo que sabes del caso sin salir de la conversación.',
  },
  {
    nombre: 'Mis notas',
    detalle: 'Anota lo que quieres retomar. Quedan solo en este navegador.',
  },
  {
    nombre: 'Dictar',
    detalle: 'Si tu navegador lo permite, habla y revisa el texto antes de enviarlo.',
  },
];
