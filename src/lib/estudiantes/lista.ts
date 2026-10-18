import { coincideBusqueda } from '@/lib/listas';
import { type EstudianteRegistrado } from '@/types';

/** Filtros de la lista de estudiantes del docente. */
export const FILTROS_ESTUDIANTES = [
  { valor: 'todos', etiqueta: 'Todos' },
  { valor: 'por-revisar', etiqueta: 'Con prácticas por revisar' },
  { valor: 'practicando', etiqueta: 'Practicando ahora' },
  { valor: 'codigos', etiqueta: 'Con códigos sin usar' },
  { valor: 'sin-practicas', etiqueta: 'Sin prácticas aún' },
  { valor: 'sin-cuenta', etiqueta: 'Sin cuenta (falta el correo)' },
] as const;

export type FiltroEstudiantes = (typeof FILTROS_ESTUDIANTES)[number]['valor'];
export const IDS_FILTRO_ESTUDIANTES = FILTROS_ESTUDIANTES.map(f => f.valor);

export const ORDENES_ESTUDIANTES = [
  { valor: 'nombre', etiqueta: 'Nombre (A–Z)' },
  { valor: 'pendientes', etiqueta: 'Más por revisar' },
  { valor: 'reciente', etiqueta: 'Práctica más reciente' },
  { valor: 'practicas', etiqueta: 'Más prácticas' },
  { valor: 'nota', etiqueta: 'Nota promedio' },
] as const;

export type OrdenEstudiantes = (typeof ORDENES_ESTUDIANTES)[number]['valor'];
export const IDS_ORDEN_ESTUDIANTES = ORDENES_ESTUDIANTES.map(o => o.valor);

const PREDICADOS: Record<FiltroEstudiantes, (e: EstudianteRegistrado) => boolean> = {
  todos: () => true,
  'por-revisar': e => e.metricas.pendientesRetroalimentacion > 0,
  practicando: e => e.metricas.enCurso > 0,
  codigos: e => e.metricas.codigosPendientes > 0,
  'sin-practicas': e => e.metricas.sesiones === 0,
  'sin-cuenta': e => !e.cuentaVinculada,
};

const comparadorNombre = new Intl.Collator('es', { sensitivity: 'base' });

/** Estudiantes que coinciden con la búsqueda y el filtro, en el orden pedido. */
export function listarEstudiantes(
  estudiantes: readonly EstudianteRegistrado[],
  {
    consulta,
    filtro,
    orden,
  }: { consulta: string; filtro: FiltroEstudiantes; orden: OrdenEstudiantes }
): EstudianteRegistrado[] {
  const porNombre = (a: EstudianteRegistrado, b: EstudianteRegistrado) =>
    comparadorNombre.compare(a.nombre, b.nombre);
  const comparadores: Record<
    OrdenEstudiantes,
    (a: EstudianteRegistrado, b: EstudianteRegistrado) => number
  > = {
    nombre: porNombre,
    pendientes: (a, b) =>
      b.metricas.pendientesRetroalimentacion - a.metricas.pendientesRetroalimentacion ||
      porNombre(a, b),
    reciente: (a, b) =>
      (b.metricas.ultimaSesion ?? '').localeCompare(a.metricas.ultimaSesion ?? '') ||
      porNombre(a, b),
    practicas: (a, b) => b.metricas.sesiones - a.metricas.sesiones || porNombre(a, b),
    nota: (a, b) =>
      (b.metricas.notaPromedio ?? -1) - (a.metricas.notaPromedio ?? -1) || porNombre(a, b),
  };
  return estudiantes
    .filter(e => PREDICADOS[filtro](e) && coincideBusqueda(consulta, e.nombre, e.codigo, e.correo))
    .sort(comparadores[orden]);
}
