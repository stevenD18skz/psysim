/** Minutos sin actividad tras los que el servidor cierra una sesión en curso. */
export const MINUTOS_CIERRE_INACTIVIDAD = 10;

const formatoHora = new Intl.DateTimeFormat('es-CO', {
  hour: 'numeric',
  minute: '2-digit',
  timeZone: 'America/Bogota',
});

/** Hora legible en Colombia, p. ej. "3:42 p. m." (igual en el servidor y el navegador). */
export function formatearHora(iso: string | Date): string {
  return formatoHora.format(typeof iso === 'string' ? new Date(iso) : iso);
}

/** Momento en que se cerrará una sesión en curso si no hay más actividad. */
export function cierrePorInactividad(ultimaActividad: string): Date {
  return new Date(new Date(ultimaActividad).getTime() + MINUTOS_CIERRE_INACTIVIDAD * 60_000);
}

/**
 * Hora límite que se promete a quien sale de una práctica abierta. El último latido guardado en
 * el servidor puede ir hasta 30 s por detrás del clic, así que se cuenta desde entonces: la hora
 * nunca es más tarde que la que verá en Mis prácticas (que parte de `ultima_actividad`).
 */
export function plazoAlSalir(ahora: number = Date.now()): string {
  return formatearHora(new Date(ahora - 30_000 + MINUTOS_CIERRE_INACTIVIDAD * 60_000));
}

const relativo = new Intl.RelativeTimeFormat('es-CO', { numeric: 'auto' });

/** Tiempo relativo legible: "hace 5 minutos", "ayer", "hace 3 días", "en 2 días". */
export function tiempoRelativo(iso: string, ahora: Date = new Date()): string {
  const segundos = (new Date(iso).getTime() - ahora.getTime()) / 1000;
  const abs = Math.abs(segundos);
  if (abs < 60) return 'justo ahora';
  if (abs < 3600) return relativo.format(Math.round(segundos / 60), 'minute');
  if (abs < 86_400) return relativo.format(Math.round(segundos / 3600), 'hour');
  if (abs < 30 * 86_400) return relativo.format(Math.round(segundos / 86_400), 'day');
  return relativo.format(Math.round(segundos / (30 * 86_400)), 'month');
}

const formatoFechaBogota = new Intl.DateTimeFormat('en-CA', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  timeZone: 'America/Bogota',
});

function diaUtcDeBogota(fecha: Date): number {
  const [anio, mes, dia] = formatoFechaBogota.format(fecha).split('-').map(Number);
  return Date.UTC(anio ?? 0, (mes ?? 1) - 1, dia ?? 1);
}

/**
 * Texto natural para el vencimiento de un código: «Vence hoy», «Vence mañana» o «Vence en X días»,
 * calculado por día calendario en Colombia (`America/Bogota`).
 */
export function formatearVencimientoCodigo(iso: string, ahora: Date = new Date()): string {
  const expiracion = new Date(iso);
  if (expiracion.getTime() <= ahora.getTime()) return 'Vencido';
  const dias = Math.round((diaUtcDeBogota(expiracion) - diaUtcDeBogota(ahora)) / 86_400_000);
  if (dias <= 0) return 'Vence hoy';
  if (dias === 1) return 'Vence mañana';
  return `Vence en ${dias} días`;
}
