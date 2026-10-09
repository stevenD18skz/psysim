import 'server-only';

import { cache } from 'react';

import { createClient } from '@/lib/supabase/server';
import { type EstudianteRegistrado } from '@/types';
import { type Tables } from '@/types/database.types';

export const COLUMNAS_RESUMEN = `
  id, codigo, nombre, correo, cuenta_vinculada, creado_en, sesiones_total, sesiones_finalizadas,
  sesiones_en_curso, pendientes_retroalimentacion, nota_promedio, segundos_practica,
  casos_distintos, intervenciones, ultima_sesion, codigos_pendientes
` as const;

type FilaResumen = Pick<
  Tables<'estudiante_resumen'>,
  | 'id'
  | 'codigo'
  | 'nombre'
  | 'correo'
  | 'cuenta_vinculada'
  | 'creado_en'
  | 'sesiones_total'
  | 'sesiones_finalizadas'
  | 'sesiones_en_curso'
  | 'pendientes_retroalimentacion'
  | 'nota_promedio'
  | 'segundos_practica'
  | 'casos_distintos'
  | 'intervenciones'
  | 'ultima_sesion'
  | 'codigos_pendientes'
>;

/** Las columnas de una vista llegan como anulables en los tipos generados, aunque no lo sean. */
export function aEstudiante(fila: FilaResumen): EstudianteRegistrado | null {
  if (!fila.id || !fila.codigo || !fila.nombre || !fila.creado_en) return null;
  return {
    id: fila.id,
    codigo: fila.codigo,
    nombre: fila.nombre,
    correo: fila.correo,
    cuentaVinculada: fila.cuenta_vinculada ?? false,
    creadoEn: fila.creado_en,
    metricas: {
      sesiones: fila.sesiones_total ?? 0,
      finalizadas: fila.sesiones_finalizadas ?? 0,
      enCurso: fila.sesiones_en_curso ?? 0,
      pendientesRetroalimentacion: fila.pendientes_retroalimentacion ?? 0,
      notaPromedio: fila.nota_promedio,
      codigosPendientes: fila.codigos_pendientes ?? 0,
      segundosPractica: fila.segundos_practica ?? 0,
      casos: fila.casos_distintos ?? 0,
      intervenciones: fila.intervenciones ?? 0,
      ultimaSesion: fila.ultima_sesion,
    },
  };
}

/**
 * Estudiantes del docente con sus métricas básicas (vista `estudiante_resumen`; RLS solo deja
 * ver los propios), del que practicó más recientemente al más antiguo.
 */
export const obtenerEstudiantes = cache(async (): Promise<EstudianteRegistrado[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('estudiante_resumen')
    .select(COLUMNAS_RESUMEN)
    .order('ultima_sesion', { ascending: false, nullsFirst: false })
    .order('nombre');

  if (error) {
    throw new Error('No fue posible cargar los estudiantes.', { cause: error });
  }

  return data.flatMap(fila => aEstudiante(fila) ?? []);
});

/** Un estudiante del docente con sus métricas, o `null` si no existe o no es suyo. */
export const obtenerEstudiante = cache(async (id: string): Promise<EstudianteRegistrado | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('estudiante_resumen')
    .select(COLUMNAS_RESUMEN)
    .eq('id', id)
    .maybeSingle();

  if (error) {
    throw new Error('No fue posible cargar al estudiante.', { cause: error });
  }
  return data ? aEstudiante(data) : null;
});
