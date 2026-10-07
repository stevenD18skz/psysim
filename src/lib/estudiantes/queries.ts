import 'server-only';

import { cache } from 'react';

import { createClient } from '@/lib/supabase/server';
import { type EstudianteRegistrado } from '@/types';

/**
 * Estudiantes del docente con sus métricas básicas (vista `estudiante_resumen`; RLS solo deja
 * ver los propios), del que practicó más recientemente al más antiguo.
 */
export const obtenerEstudiantes = cache(async (): Promise<EstudianteRegistrado[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('estudiante_resumen')
    .select(
      'id, codigo, nombre, creado_en, sesiones_total, sesiones_finalizadas, segundos_practica, casos_distintos, intervenciones, ultima_sesion'
    )
    .order('ultima_sesion', { ascending: false, nullsFirst: false })
    .order('nombre');

  if (error) {
    throw new Error('No fue posible cargar los estudiantes.', { cause: error });
  }

  // Las columnas de una vista llegan como anulables en los tipos generados, aunque no lo sean.
  return data.flatMap(fila => {
    if (!fila.id || !fila.codigo || !fila.nombre || !fila.creado_en) return [];
    return [
      {
        id: fila.id,
        codigo: fila.codigo,
        nombre: fila.nombre,
        creadoEn: fila.creado_en,
        metricas: {
          sesiones: fila.sesiones_total ?? 0,
          finalizadas: fila.sesiones_finalizadas ?? 0,
          segundosPractica: fila.segundos_practica ?? 0,
          casos: fila.casos_distintos ?? 0,
          intervenciones: fila.intervenciones ?? 0,
          ultimaSesion: fila.ultima_sesion,
        },
      },
    ];
  });
});
