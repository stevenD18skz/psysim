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
    throw new Error('No pudimos cargar el caso de la sesión.', { cause: error });
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
    throw new Error('No pudimos cargar los casos.', { cause: error });
  }
  return new Map(data.map(fila => [fila.id, { codigo: fila.codigo, titulo: fila.titulo }]));
}

export interface ResumenEscenarioEstudiante {
  codigo: string;
  titulo: string;
  competenciaCentral: string | null;
  paciente: string | null;
}

/**
 * Código, título, competencia y nombre del paciente de varios casos (sin prompt ni perfil clínico)
 * para enriquecer el panel del estudiante sobre sesiones o códigos ya verificados con RLS.
 */
export async function leerResumenesDeEscenarios(
  ids: readonly string[]
): Promise<Map<string, ResumenEscenarioEstudiante>> {
  const unicos = [...new Set(ids)];
  if (unicos.length === 0) return new Map();

  const { data, error } = await createAdminClient()
    .from('escenario')
    .select('id, codigo, titulo, competencia_central, npc ( nombre )')
    .in('id', unicos);

  if (error) {
    throw new Error('No pudimos cargar los casos.', { cause: error });
  }

  return new Map(
    data.map(fila => [
      fila.id,
      {
        codigo: fila.codigo,
        titulo: fila.titulo,
        competenciaCentral: fila.competencia_central ?? null,
        paciente: fila.npc?.nombre ?? null,
      },
    ])
  );
}

export interface AsignacionVigenteEstudiante {
  id: string;
  codigo: string;
  expiraEn: string;
  creadoEn: string;
  docenteNombre: string | null;
  escenario: ResumenEscenarioEstudiante;
}

/**
 * Códigos de acceso vigentes y sin canjear asignados a los registros de `estudiante` cuyo
 * `usuario_id` ya se verificó con RLS para el estudiante autenticado.
 */
export async function leerAsignacionesVigentesDeEstudiante(
  estudianteIds: readonly string[],
  docentesPorEstudianteId: ReadonlyMap<string, string>
): Promise<AsignacionVigenteEstudiante[]> {
  const unicos = [...new Set(estudianteIds)];
  if (unicos.length === 0) return [];

  const ahoraIso = new Date().toISOString();
  const { data, error } = await createAdminClient()
    .from('asignacion')
    .select('id, codigo, expira_en, creado_en, escenario_id, estudiante_id')
    .in('estudiante_id', unicos)
    .is('sesion_id', null)
    .is('anulada_en', null)
    .gt('expira_en', ahoraIso)
    .order('expira_en', { ascending: true });

  if (error || !data || data.length === 0) {
    return [];
  }

  const escenarios = await leerResumenesDeEscenarios(data.map(f => f.escenario_id));

  return data.map(fila => ({
    id: fila.id,
    codigo: fila.codigo,
    expiraEn: fila.expira_en,
    creadoEn: fila.creado_en,
    docenteNombre: fila.estudiante_id
      ? (docentesPorEstudianteId.get(fila.estudiante_id) ?? null)
      : null,
    escenario: escenarios.get(fila.escenario_id) ?? {
      ...CASO_NO_DISPONIBLE,
      competenciaCentral: null,
      paciente: null,
    },
  }));
}

/** Prompt efectivo de una sesión ya autorizada (lo usa el Route Handler del paciente). */
export async function leerPromptDeSesion(sesionId: string): Promise<string | null> {
  const { data, error } = await createAdminClient()
    .from('sesion')
    .select('prompt_sistema')
    .eq('id', sesionId)
    .maybeSingle();

  if (error) {
    throw new Error('No pudimos cargar el prompt de la sesión.', { cause: error });
  }
  return data?.prompt_sistema ?? null;
}

/** Caso sin título disponible (no debería ocurrir: los casos con sesiones no se borran). */
export const CASO_NO_DISPONIBLE = { codigo: '—', titulo: 'Caso no disponible' } as const;
