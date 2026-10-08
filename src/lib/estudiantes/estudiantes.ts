import { type EstudianteRegistrado } from '@/types';

/** "  José   PÉREZ " → "jose perez": sin tildes, minúsculas y espacios simples. */
export function normalizarTexto(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}

/**
 * Estudiantes que coinciden con lo escrito: por código (desde el inicio) o por nombre (cada
 * palabra escrita debe aparecer, sin importar tildes ni orden). Primero los códigos, porque son
 * la coincidencia más precisa. Sin término devuelve los más recientes.
 */
export function filtrarEstudiantes(
  estudiantes: readonly EstudianteRegistrado[],
  termino: string,
  limite = 6
): EstudianteRegistrado[] {
  const consulta = normalizarTexto(termino);
  if (!consulta) return estudiantes.slice(0, limite);

  const palabras = consulta.split(' ');
  const porCodigo = estudiantes.filter(e => e.codigo.startsWith(consulta.replace(/\s/g, '')));
  const porNombre = estudiantes.filter(e => {
    if (porCodigo.includes(e)) return false;
    const nombre = normalizarTexto(e.nombre);
    return palabras.every(p => nombre.includes(p));
  });
  return [...porCodigo, ...porNombre].slice(0, limite);
}

/** Estudiante registrado con exactamente ese código (o `undefined`). */
export function buscarPorCodigo(
  estudiantes: readonly EstudianteRegistrado[],
  codigo: string
): EstudianteRegistrado | undefined {
  const limpio = codigo.trim();
  return limpio ? estudiantes.find(e => e.codigo === limpio) : undefined;
}

/** Tiempo de práctica legible: "45 min", "1 h 20 min", "menos de 1 min" o "—". */
export function formatearTiempoPractica(segundos: number): string {
  if (segundos <= 0) return '—';
  const minutos = Math.round(segundos / 60);
  if (minutos < 1) return 'menos de 1 min';
  const horas = Math.floor(minutos / 60);
  const resto = minutos % 60;
  if (horas === 0) return `${minutos} min`;
  return resto === 0 ? `${horas} h` : `${horas} h ${resto} min`;
}

/** "1 sesión", "3 sesiones". */
export function contarSesiones(total: number): string {
  return `${total} ${total === 1 ? 'sesión' : 'sesiones'}`;
}

const formatoDia = new Intl.DateTimeFormat('es-CO', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'America/Bogota',
});

/** Día legible (zona horaria fija: igual en el servidor y el navegador), p. ej. "6 de oct de 2026". */
export function formatearDia(iso: string): string {
  return formatoDia.format(new Date(iso));
}

const formatoFechaHora = new Intl.DateTimeFormat('es-CO', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  timeZone: 'America/Bogota',
});

/** Día y hora legibles en la hora de Colombia, p. ej. "7 de oct de 2026, 3:05 p. m.". */
export function formatearFechaHora(iso: string): string {
  return formatoFechaHora.format(new Date(iso));
}

/** Nota con un decimal y coma decimal: 4.5 → "4,5"; `null` → "—". */
export function formatearNota(nota: number | null): string {
  if (nota === null) return '—';
  return nota.toLocaleString('es-CO', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}
