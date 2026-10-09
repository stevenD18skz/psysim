import 'server-only';

import { cache } from 'react';

import { aEstudiante, COLUMNAS_RESUMEN } from '@/lib/estudiantes/queries';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { type DocenteAdmin, type EstudianteRegistrado } from '@/types';
import { type Database } from '@/types/database.types';

type FilaDocente = Database['public']['Functions']['admin_docentes']['Returns'][number];

function aDocente(fila: FilaDocente): DocenteAdmin {
  return {
    id: fila.id,
    nombre: fila.nombre,
    correo: fila.correo,
    codigoInstitucional: fila.codigo_institucional,
    rol: fila.rol,
    activo: fila.activo,
    contrasenaTemporal: fila.contrasena_temporal,
    conGoogle: fila.proveedores.includes('google'),
    creadoEn: fila.creado_en,
    ultimoAcceso: fila.ultimo_acceso,
    metricas: {
      estudiantes: fila.estudiantes,
      sesiones: fila.sesiones,
      enCurso: fila.sesiones_en_curso,
      pendientesRetroalimentacion: fila.pendientes_retroalimentacion,
      casosPropios: fila.casos_propios,
      ultimaSesion: fila.ultima_sesion,
    },
  };
}

/**
 * Docentes y Administradores con su actividad (función `admin_docentes`, que solo responde al
 * Administrador). Primero los activos, por nombre.
 */
export const obtenerDocentes = cache(async (): Promise<DocenteAdmin[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('admin_docentes');
  if (error) {
    throw new Error('No fue posible cargar los docentes.', { cause: error });
  }
  return data.map(aDocente);
});

export interface CasoDeDocente {
  id: string;
  codigo: string;
  titulo: string;
  activo: boolean;
  creadoEn: string;
}

/**
 * Ficha de un docente para el Administrador: su resumen, sus estudiantes con métricas y sus
 * casos propios. Los estudiantes y casos se leen con la clave secreta (RLS solo deja a cada
 * docente ver los suyos); la página ya verificó que quien consulta es el Administrador.
 */
export async function obtenerFichaDocente(id: string): Promise<{
  docente: DocenteAdmin;
  estudiantes: EstudianteRegistrado[];
  casos: CasoDeDocente[];
} | null> {
  const docente = (await obtenerDocentes()).find(d => d.id === id);
  if (!docente) return null;

  const admin = createAdminClient();
  const [registros, casos] = await Promise.all([
    admin.from('estudiante').select('id').eq('docente_id', id),
    admin
      .from('escenario')
      .select('id, codigo, titulo, activo, creado_en')
      .eq('docente_id', id)
      .order('creado_en', { ascending: false }),
  ]);
  if (registros.error || casos.error) {
    throw new Error('No fue posible cargar la ficha del docente.', {
      cause: registros.error ?? casos.error,
    });
  }

  let estudiantes: EstudianteRegistrado[] = [];
  const ids = registros.data.map(fila => fila.id);
  if (ids.length > 0) {
    const { data, error } = await admin
      .from('estudiante_resumen')
      .select(COLUMNAS_RESUMEN)
      .in('id', ids)
      .order('ultima_sesion', { ascending: false, nullsFirst: false })
      .order('nombre');
    if (error) {
      throw new Error('No fue posible cargar los estudiantes del docente.', { cause: error });
    }
    estudiantes = data.flatMap(fila => aEstudiante(fila) ?? []);
  }

  return {
    docente,
    estudiantes,
    casos: casos.data.map(caso => ({
      id: caso.id,
      codigo: caso.codigo,
      titulo: caso.titulo,
      activo: caso.activo,
      creadoEn: caso.creado_en,
    })),
  };
}
