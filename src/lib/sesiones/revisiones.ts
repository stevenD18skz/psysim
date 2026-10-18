import { coincideBusqueda, dentroDelPeriodo, diasDesde, type Periodo } from '@/lib/listas';
import { duracionSesion, estadoCortoSesion, estaPorRevisar } from '@/lib/sesiones/estados';
import { type SesionDocente } from '@/types';

/*
 * Lógica pura de la página de revisiones: filtros, orden, agrupaciones y exportación. La página
 * la aplica en el servidor sobre las sesiones del docente (cientos a lo sumo) y pagina el
 * resultado.
 */

export const VISTAS = [
  { id: 'pendientes', etiqueta: 'Por revisar' },
  { id: 'publicadas', etiqueta: 'Publicadas' },
  { id: 'en-curso', etiqueta: 'En curso' },
  { id: 'todas', etiqueta: 'Todas' },
] as const;

export type Vista = (typeof VISTAS)[number]['id'];
export const IDS_VISTA = VISTAS.map(v => v.id);

export const FILTROS_VISTA: Record<Vista, (s: SesionDocente) => boolean> = {
  pendientes: estaPorRevisar,
  publicadas: s => s.retroalimentacion?.publicada ?? false,
  'en-curso': s => s.estado === 'en_curso',
  todas: () => true,
};

export const ORDENES = [
  { valor: 'espera', etiqueta: 'Espera más larga' },
  { valor: 'recientes', etiqueta: 'Más recientes' },
  { valor: 'estudiante', etiqueta: 'Estudiante (A–Z)' },
  { valor: 'caso', etiqueta: 'Caso' },
  { valor: 'nota', etiqueta: 'Nota (de mayor a menor)' },
] as const;

export type Orden = (typeof ORDENES)[number]['valor'];
export const IDS_ORDEN = ORDENES.map(o => o.valor);

/** Por revisar, lo justo es atender primero lo que más espera; en el resto, lo más reciente. */
export function ordenPorDefecto(vista: Vista): Orden {
  return vista === 'pendientes' ? 'espera' : 'recientes';
}

export const AGRUPACIONES = [
  { valor: 'lista', etiqueta: 'Lista' },
  { valor: 'estudiante', etiqueta: 'Por estudiante' },
  { valor: 'caso', etiqueta: 'Por caso' },
  { valor: 'matriz', etiqueta: 'Estudiantes × casos' },
] as const;

export type Agrupacion = (typeof AGRUPACIONES)[number]['valor'];
export const IDS_AGRUPACION = AGRUPACIONES.map(a => a.valor);

export interface FiltrosRevision {
  vista: Vista;
  consulta: string;
  /** Código del caso o '' para todos. */
  caso: string;
  periodo: Periodo;
}

export function filtrarRevisiones(
  sesiones: readonly SesionDocente[],
  { vista, consulta, caso, periodo }: FiltrosRevision,
  ahora = new Date()
): SesionDocente[] {
  return sesiones.filter(
    s =>
      FILTROS_VISTA[vista](s) &&
      (!caso || s.escenario.codigo === caso) &&
      dentroDelPeriodo(s.inicio, periodo, ahora) &&
      coincideBusqueda(
        consulta,
        s.estudiante.nombre,
        s.estudiante.codigo,
        s.escenario.codigo,
        s.escenario.titulo
      )
  );
}

const comparadorNombre = new Intl.Collator('es', { sensitivity: 'base' });

/** Momento desde el que una práctica espera revisión: su fin (o su inicio si no terminó). */
function finOInicio(s: SesionDocente): string {
  return s.fin ?? s.inicio;
}

export function ordenarRevisiones(
  sesiones: readonly SesionDocente[],
  orden: Orden
): SesionDocente[] {
  const copia = [...sesiones];
  const recientes = (a: SesionDocente, b: SesionDocente) => b.inicio.localeCompare(a.inicio);
  switch (orden) {
    case 'espera':
      return copia.sort((a, b) => finOInicio(a).localeCompare(finOInicio(b)));
    case 'recientes':
      return copia.sort(recientes);
    case 'estudiante':
      return copia.sort(
        (a, b) =>
          comparadorNombre.compare(a.estudiante.nombre, b.estudiante.nombre) || recientes(a, b)
      );
    case 'caso':
      return copia.sort(
        (a, b) => a.escenario.codigo.localeCompare(b.escenario.codigo) || recientes(a, b)
      );
    case 'nota':
      return copia.sort((a, b) => {
        const na = a.retroalimentacion?.publicada ? (a.retroalimentacion.nota ?? -1) : -1;
        const nb = b.retroalimentacion?.publicada ? (b.retroalimentacion.nota ?? -1) : -1;
        return nb - na || recientes(a, b);
      });
  }
}

/** Una práctica con menos de esto (s) se marca como «muy corta»: conviene mirarla primero. */
export const DURACION_CORTA_S = 3 * 60;

export interface SenalesRevision {
  /** Días que lleva esperando la revisión (solo si está por revisar). */
  esperaDias: number | null;
  /** Llegó a comenzar pero duró muy poco o casi no hubo conversación. */
  corta: boolean;
}

/** Señales para priorizar sin abrir la práctica. */
export function senalesRevision(sesion: SesionDocente, ahora = new Date()): SenalesRevision {
  const duracion = duracionSesion(sesion);
  return {
    esperaDias: estaPorRevisar(sesion) ? diasDesde(finOInicio(sesion), ahora) : null,
    corta:
      sesion.comenzada &&
      sesion.estado !== 'en_curso' &&
      ((duracion !== null && duracion < DURACION_CORTA_S) || sesion.intervenciones < 3),
  };
}

export interface ResumenGrupo {
  clave: string;
  titulo: string;
  subtitulo: string;
  /** Enlace a la ficha (estudiante) o `null`. */
  enlace: string | null;
  sesiones: SesionDocente[];
  porRevisar: number;
  enCurso: number;
  publicadas: number;
  /** Promedio de las notas publicadas, o `null`. */
  promedio: number | null;
  /** Inicio de la práctica más reciente. */
  ultima: string;
}

function resumir(
  clave: string,
  titulo: string,
  subtitulo: string,
  enlace: string | null,
  sesiones: SesionDocente[]
): ResumenGrupo {
  const notas = sesiones.flatMap(s =>
    s.retroalimentacion?.publicada && s.retroalimentacion.nota !== null
      ? [s.retroalimentacion.nota]
      : []
  );
  return {
    clave,
    titulo,
    subtitulo,
    enlace,
    sesiones,
    porRevisar: sesiones.filter(estaPorRevisar).length,
    enCurso: sesiones.filter(s => s.estado === 'en_curso').length,
    publicadas: notas.length,
    promedio:
      notas.length > 0
        ? Math.round((notas.reduce((a, b) => a + b, 0) / notas.length) * 10) / 10
        : null,
    ultima: sesiones.reduce((max, s) => (s.inicio > max ? s.inicio : max), ''),
  };
}

/** Grupos por estudiante, con lo pendiente primero (y luego por nombre). */
export function agruparPorEstudiante(sesiones: readonly SesionDocente[]): ResumenGrupo[] {
  const grupos = new Map<string, SesionDocente[]>();
  for (const s of sesiones) {
    const clave = s.estudiante.id || s.estudiante.codigo;
    grupos.set(clave, [...(grupos.get(clave) ?? []), s]);
  }
  return [...grupos.entries()]
    .map(([clave, lista]) => {
      const { estudiante } = lista[0]!;
      return resumir(
        clave,
        estudiante.nombre,
        estudiante.codigo,
        estudiante.id ? `/estudiantes/${estudiante.id}` : null,
        lista
      );
    })
    .sort((a, b) => b.porRevisar - a.porRevisar || comparadorNombre.compare(a.titulo, b.titulo));
}

/** Grupos por caso, en el orden de sus códigos. */
export function agruparPorCaso(sesiones: readonly SesionDocente[]): ResumenGrupo[] {
  const grupos = new Map<string, SesionDocente[]>();
  for (const s of sesiones) {
    grupos.set(s.escenario.codigo, [...(grupos.get(s.escenario.codigo) ?? []), s]);
  }
  return [...grupos.entries()]
    .map(([codigo, lista]) => resumir(codigo, lista[0]!.escenario.titulo, codigo, null, lista))
    .sort((a, b) => a.clave.localeCompare(b.clave));
}

export interface MatrizRevisiones {
  estudiantes: { id: string; nombre: string; codigo: string }[];
  casos: { codigo: string; titulo: string }[];
  /** Prácticas de cada estudiante en cada caso (clave `${estudianteId}|${codigoCaso}`), recientes primero. */
  celdas: Map<string, SesionDocente[]>;
}

export function claveCelda(estudianteId: string, codigoCaso: string) {
  return `${estudianteId}|${codigoCaso}`;
}

/**
 * Matriz estudiantes × casos, como un libro de notas: de un vistazo se ve quién no ha hecho qué
 * caso y dónde falta revisar.
 */
export function matrizRevisiones(sesiones: readonly SesionDocente[]): MatrizRevisiones {
  const estudiantes = new Map<string, MatrizRevisiones['estudiantes'][number]>();
  const casos = new Map<string, MatrizRevisiones['casos'][number]>();
  const celdas = new Map<string, SesionDocente[]>();
  for (const s of [...sesiones].sort((a, b) => b.inicio.localeCompare(a.inicio))) {
    const id = s.estudiante.id || s.estudiante.codigo;
    estudiantes.set(id, { id, nombre: s.estudiante.nombre, codigo: s.estudiante.codigo });
    casos.set(s.escenario.codigo, s.escenario);
    const clave = claveCelda(id, s.escenario.codigo);
    celdas.set(clave, [...(celdas.get(clave) ?? []), s]);
  }
  return {
    estudiantes: [...estudiantes.values()].sort((a, b) =>
      comparadorNombre.compare(a.nombre, b.nombre)
    ),
    casos: [...casos.values()].sort((a, b) => a.codigo.localeCompare(b.codigo)),
    celdas,
  };
}

/** Celda de CSV: entre comillas si hace falta; neutraliza fórmulas al abrirlo en una hoja de cálculo. */
function celdaCsv(valor: string | number | null): string {
  if (valor === null) return '';
  let texto = String(valor);
  if (/^[=+\-@\t\r]/.test(texto)) texto = `'${texto}`;
  return /[",\n;]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
}

const formatoFechaCsv = new Intl.DateTimeFormat('sv-SE', {
  dateStyle: 'short',
  timeStyle: 'short',
  timeZone: 'America/Bogota',
});

/**
 * Las prácticas en CSV para llevar las notas a otro sistema (separado por comas, UTF-8 con BOM
 * para que Excel respete las tildes). Las notas son las que publicó el docente.
 */
export function revisionesCsv(sesiones: readonly SesionDocente[]): string {
  const encabezado = [
    'Estudiante',
    'Código estudiante',
    'Caso',
    'Título del caso',
    'Estado',
    'Inicio',
    'Duración (min)',
    'Intervenciones',
    'Retroalimentación',
    'Nota',
  ];
  const filas = sesiones.map(s => {
    const duracion = duracionSesion(s);
    const publicada = s.retroalimentacion?.publicada ?? false;
    return [
      s.estudiante.nombre,
      s.estudiante.codigo,
      s.escenario.codigo,
      s.escenario.titulo,
      estadoCortoSesion(s),
      formatoFechaCsv.format(new Date(s.inicio)),
      duracion === null ? null : Math.round(duracion / 60),
      s.intervenciones,
      publicada ? 'Publicada' : s.retroalimentacion ? 'Borrador' : 'Pendiente',
      publicada && s.retroalimentacion?.nota !== null && s.retroalimentacion?.nota !== undefined
        ? s.retroalimentacion.nota.toFixed(1)
        : null,
    ];
  });
  return `﻿${[encabezado, ...filas].map(fila => fila.map(celdaCsv).join(',')).join('\r\n')}\r\n`;
}
