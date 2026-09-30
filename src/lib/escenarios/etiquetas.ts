import { type CategoriaEscenario, type DificultadEscenario } from '@/types';

export const ETIQUETA_CATEGORIA: Record<CategoriaEscenario, string> = {
  clinico: 'Clínico',
  cotidiano: 'Cotidiano',
};

export const ETIQUETA_DIFICULTAD: Record<DificultadEscenario, string> = {
  basico: 'Básico',
  intermedio: 'Intermedio',
  avanzado: 'Avanzado',
};

/** Nivel numérico (1 a 3) para representar la complejidad de forma visual. */
export const NIVEL_DIFICULTAD: Record<DificultadEscenario, 1 | 2 | 3> = {
  basico: 1,
  intermedio: 2,
  avanzado: 3,
};

const formatoFecha = new Intl.DateTimeFormat('es-CO', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  timeZone: 'America/Bogota',
});

/** Fecha legible en español de Colombia, p. ej. "30 sept 2026, 3:05 p. m.". */
export function formatearFecha(iso: string): string {
  return formatoFecha.format(new Date(iso));
}
