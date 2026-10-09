import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';
import { type EscenarioCatalogo, type NpcEscenario } from '@/types';

/*
 * Datos del caso que el estudiante no puede leer directamente: RLS no le da acceso a `escenario`
 * ni a `npc`, y la columna `sesion.prompt_sistema` no se expone por la API (así no puede leer
 * cómo debe actuar el paciente). Estas funciones usan la clave secreta y SOLO deben llamarse
 * después de leer la sesión con el cliente del usuario, que con RLS demuestra que es suya.
 */

export type EscenarioDeSesion = Pick<
  EscenarioCatalogo,
  | 'id'
  | 'codigo'
  | 'titulo'
  | 'descripcion'
  | 'categoria'
  | 'dificultad'
  | 'competenciaCentral'
  | 'configuracion3d'
> & { npc: Pick<NpcEscenario, 'id' | 'nombre' | 'edad' | 'perfilClinico'> };

/** Caso y paciente (sin el prompt) de una sesión ya autorizada. */
export async function leerEscenarioDeSesion(
  escenarioId: string
): Promise<EscenarioDeSesion | null> {
  const { data, error } = await createAdminClient()
    .from('escenario')
    .select(
      `id, codigo, titulo, descripcion, categoria, dificultad, competencia_central, configuracion_3d,
       npc ( id, nombre, edad, perfil_clinico )`
    )
    .eq('id', escenarioId)
    .maybeSingle();

  if (error) {
    throw new Error('No fue posible cargar el caso de la sesión.', { cause: error });
  }
  if (!data?.npc) return null;

  return {
    id: data.id,
    codigo: data.codigo,
    titulo: data.titulo,
    descripcion: data.descripcion,
    categoria: data.categoria,
    dificultad: data.dificultad,
    competenciaCentral: data.competencia_central,
    configuracion3d: data.configuracion_3d,
    npc: {
      id: data.npc.id,
      nombre: data.npc.nombre,
      edad: data.npc.edad,
      perfilClinico: data.npc.perfil_clinico,
    },
  };
}

/** Código y título de varios casos (para los listados de sesiones y códigos). */
export async function leerTitulosDeEscenarios(
  ids: readonly string[]
): Promise<Map<string, { codigo: string; titulo: string }>> {
  const unicos = [...new Set(ids)];
  if (unicos.length === 0) return new Map();

  const { data, error } = await createAdminClient()
    .from('escenario')
    .select('id, codigo, titulo')
    .in('id', unicos);

  if (error) {
    throw new Error('No fue posible cargar los casos.', { cause: error });
  }
  return new Map(data.map(fila => [fila.id, { codigo: fila.codigo, titulo: fila.titulo }]));
}

/** Prompt efectivo de una sesión ya autorizada (lo usa el Route Handler del paciente). */
export async function leerPromptDeSesion(sesionId: string): Promise<string | null> {
  const { data, error } = await createAdminClient()
    .from('sesion')
    .select('prompt_sistema')
    .eq('id', sesionId)
    .maybeSingle();

  if (error) {
    throw new Error('No fue posible cargar el prompt de la sesión.', { cause: error });
  }
  return data?.prompt_sistema ?? null;
}

/** Caso sin título disponible (no debería ocurrir: los casos con sesiones no se borran). */
export const CASO_NO_DISPONIBLE = { codigo: '—', titulo: 'Caso no disponible' } as const;
