import { normalizarTexto } from '@/lib/estudiantes/estudiantes';

/*
 * Utilidades de las listas largas del panel (revisiones, estudiantes, casos, docentes). Un
 * docente con 30 estudiantes y 6 casos acumula unas 180 prácticas por semestre: sin búsqueda,
 * filtros y páginas, la lista se vuelve interminable. El estado vive en la URL (`?q=&orden=&
 * pagina=`): volver atrás conserva la vista y se puede guardar o compartir el enlace.
 */

export const TAMANO_PAGINA = 20;

/** Valor de un parámetro de búsqueda de Next (puede venir repetido). */
export type ParametroUrl = string | string[] | undefined;

export function leerTexto(parametro: ParametroUrl): string {
  const valor = Array.isArray(parametro) ? parametro[0] : parametro;
  return (valor ?? '').trim().slice(0, 100);
}

/** El valor del parámetro si es una de las opciones; si no, el valor por defecto. */
export function leerOpcion<T extends string>(
  parametro: ParametroUrl,
  opciones: readonly T[],
  defecto: T
): T {
  const valor = leerTexto(parametro);
  return (opciones as readonly string[]).includes(valor) ? (valor as T) : defecto;
}

export function leerPagina(parametro: ParametroUrl): number {
  const numero = Number.parseInt(leerTexto(parametro), 10);
  return Number.isFinite(numero) && numero > 0 ? numero : 1;
}

export interface Pagina<T> {
  visibles: T[];
  /** Página mostrada (ajustada si la pedida ya no existe tras filtrar). */
  pagina: number;
  totalPaginas: number;
  total: number;
  /** Posiciones (desde 1) del primer y el último elemento visibles; 0 si no hay ninguno. */
  desde: number;
  hasta: number;
}

export function paginar<T>(
  elementos: readonly T[],
  pagina: number,
  tamano = TAMANO_PAGINA
): Pagina<T> {
  const total = elementos.length;
  const totalPaginas = Math.max(1, Math.ceil(total / tamano));
  const actual = Math.min(Math.max(1, pagina), totalPaginas);
  const inicio = (actual - 1) * tamano;
  const visibles = elementos.slice(inicio, inicio + tamano);
  return {
    visibles,
    pagina: actual,
    totalPaginas,
    total,
    desde: total === 0 ? 0 : inicio + 1,
    hasta: inicio + visibles.length,
  };
}

/**
 * ¿Coincide lo escrito con alguno de los textos? Sin tildes ni mayúsculas, y cada palabra escrita
 * debe aparecer en alguno de ellos (en cualquier orden): «ana e-03» encuentra a Ana en el caso E-03.
 */
export function coincideBusqueda(consulta: string, ...textos: (string | null | undefined)[]) {
  const palabras = normalizarTexto(consulta).split(' ').filter(Boolean);
  if (palabras.length === 0) return true;
  const pajar = normalizarTexto(textos.filter(Boolean).join(' '));
  return palabras.every(palabra => pajar.includes(palabra));
}

export const PERIODOS = [
  { id: 'todo', etiqueta: 'Cualquier fecha', dias: null },
  { id: 'semana', etiqueta: 'Últimos 7 días', dias: 7 },
  { id: 'mes', etiqueta: 'Últimos 30 días', dias: 30 },
  { id: 'trimestre', etiqueta: 'Últimos 3 meses', dias: 90 },
] as const;

export type Periodo = (typeof PERIODOS)[number]['id'];
export const IDS_PERIODO = PERIODOS.map(p => p.id);

/** ¿La fecha cae dentro del periodo (contado hacia atrás desde `ahora`)? */
export function dentroDelPeriodo(iso: string, periodo: Periodo, ahora = new Date()): boolean {
  const dias = PERIODOS.find(p => p.id === periodo)?.dias ?? null;
  if (dias === null) return true;
  return ahora.getTime() - new Date(iso).getTime() <= dias * 24 * 60 * 60 * 1000;
}

/**
 * Query string con los parámetros actuales y los cambios indicados. Los valores vacíos o iguales
 * a su valor por defecto se omiten, así la URL queda corta. Cambiar un filtro vuelve a la página 1.
 */
export function conParametros(
  ruta: string,
  actuales: Readonly<Record<string, string>>,
  cambios: Readonly<Record<string, string | number | null>>,
  defectos: Readonly<Record<string, string>> = {}
): string {
  const valores: Record<string, string> = { ...actuales };
  if (!('pagina' in cambios)) delete valores.pagina;
  for (const [clave, valor] of Object.entries(cambios)) {
    if (valor === null || valor === '') delete valores[clave];
    else valores[clave] = String(valor);
  }
  const busqueda = new URLSearchParams();
  for (const [clave, valor] of Object.entries(valores)) {
    if (!valor || defectos[clave] === valor || (clave === 'pagina' && valor === '1')) continue;
    busqueda.set(clave, valor);
  }
  const texto = busqueda.toString();
  return texto ? `${ruta}?${texto}` : ruta;
}

/** Días completos entre una fecha y ahora (0 si es de hoy o futura). */
export function diasDesde(iso: string, ahora = new Date()): number {
  return Math.max(0, Math.floor((ahora.getTime() - new Date(iso).getTime()) / 86_400_000));
}
