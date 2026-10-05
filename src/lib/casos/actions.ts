'use server';

import { requerirDocente } from '@/lib/auth/dal';
import { type ResultadoAccion } from '@/lib/escenarios/actions';
import { ErrorIA, generarRespuestaPaciente, type TipoErrorIA } from '@/lib/ia/paciente';
import { log } from '@/lib/log';
import { createClient } from '@/lib/supabase/server';
import {
  actualizarCasoSchema,
  casoFormSchema,
  guardarVarianteSchema,
  idCasoSchema,
  probarPacienteSchema,
} from '@/schemas/caso.schema';

import { type CategoriaEscenario, type DificultadEscenario, type Json } from '@/types';

import { filasDelCaso } from './construir';

const MENSAJE_DATOS_INVALIDOS = 'Revisa los datos del caso.';
const UNIQUE_VIOLATION = '23505';
const MAX_INTENTOS_CODIGO = 5;

/** Código `C-NNNNNNNN` de un caso propio. Si choca con otro, se reintenta con uno nuevo. */
function generarCodigoCaso(): string {
  return `C-${String(Math.floor(Math.random() * 1e8)).padStart(8, '0')}`;
}

interface FilaEscenario {
  titulo: string;
  descripcion: string;
  categoria: CategoriaEscenario;
  dificultad: DificultadEscenario;
  competencia_central: string;
  configuracion_3d: string;
  borrador: Json | null;
}

interface FilaNpc {
  nombre: string;
  edad: number;
  perfil_clinico: string;
  prompt_sistema: string;
}

/**
 * Crea un caso propio: una fila de `escenario` (el dueño lo fija la base de datos con
 * `auth.uid()`) y la de su `npc`. Si el NPC falla, el escenario se archiva para no dejar un
 * caso sin paciente a la vista.
 */
async function insertarCaso(
  escenario: FilaEscenario,
  npc: FilaNpc
): Promise<ResultadoAccion<{ id: string }>> {
  const supabase = await createClient();

  let id: string | null = null;
  for (let intento = 0; intento < MAX_INTENTOS_CODIGO && !id; intento++) {
    const { data, error } = await supabase
      .from('escenario')
      .insert({ ...escenario, codigo: generarCodigoCaso() })
      .select('id')
      .single();
    if (!error) {
      id = data.id;
    } else if (error.code !== UNIQUE_VIOLATION) {
      console.error('[caso] No se pudo crear el escenario:', error.code);
      return { ok: false, error: 'No fue posible guardar el caso. Inténtalo de nuevo.' };
    }
  }
  if (!id) return { ok: false, error: 'No fue posible guardar el caso. Inténtalo de nuevo.' };

  const { error } = await supabase.from('npc').insert({ ...npc, escenario_id: id });
  if (error) {
    console.error('[caso] No se pudo crear el paciente:', error.code);
    await supabase.from('escenario').update({ activo: false }).eq('id', id);
    return { ok: false, error: 'No fue posible guardar el caso. Inténtalo de nuevo.' };
  }
  return { ok: true, datos: { id } };
}

/** Crea un caso propio desde el constructor guiado (o desde su modo de texto). */
export async function crearCaso(valores: unknown): Promise<ResultadoAccion<{ id: string }>> {
  await requerirDocente();

  const datos = casoFormSchema.safeParse(valores);
  if (!datos.success) return { ok: false, error: MENSAJE_DATOS_INVALIDOS };

  const { escenario, npc } = filasDelCaso(datos.data);
  return insertarCaso(escenario, npc);
}

/** Actualiza un caso propio. RLS impide modificar los de otros docentes o los oficiales. */
export async function actualizarCaso(valores: unknown): Promise<ResultadoAccion<{ id: string }>> {
  await requerirDocente();

  const datos = actualizarCasoSchema.safeParse(valores);
  if (!datos.success) return { ok: false, error: MENSAJE_DATOS_INVALIDOS };

  const { escenario, npc } = filasDelCaso(datos.data.caso);
  const supabase = await createClient();

  const { data: actualizado, error } = await supabase
    .from('escenario')
    .update(escenario)
    .eq('id', datos.data.id)
    .eq('activo', true)
    .select('id');
  if (error || actualizado.length === 0) {
    if (error) console.error('[caso] No se pudo actualizar el escenario:', error.code);
    return { ok: false, error: 'No fue posible guardar los cambios del caso.' };
  }

  const { error: errorNpc } = await supabase
    .from('npc')
    .update(npc)
    .eq('escenario_id', datos.data.id);
  if (errorNpc) {
    console.error('[caso] No se pudo actualizar el paciente:', errorNpc.code);
    return { ok: false, error: 'No fue posible guardar los cambios del caso.' };
  }

  return { ok: true, datos: { id: datos.data.id } };
}

/**
 * "Elimina" un caso propio: lo archiva (`activo = false`) para conservar el historial de las
 * sesiones que ya lo usaron. Deja de aparecer en el configurador.
 */
export async function archivarCaso(valores: unknown): Promise<ResultadoAccion<{ id: string }>> {
  await requerirDocente();

  const datos = idCasoSchema.safeParse(valores);
  if (!datos.success) return { ok: false, error: MENSAJE_DATOS_INVALIDOS };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('escenario')
    .update({ activo: false })
    .eq('id', datos.data.id)
    .not('docente_id', 'is', null)
    .select('id');

  if (error || data.length === 0) {
    if (error) console.error('[caso] No se pudo archivar:', error.code);
    return { ok: false, error: 'No fue posible eliminar el caso.' };
  }
  return { ok: true, datos: { id: datos.data.id } };
}

/**
 * Guarda un escenario del catálogo, con el prompt que el docente ajustó, como caso propio. Copia
 * el paciente y el consultorio del escenario de origen; solo cambian el título y el prompt.
 */
export async function guardarVariante(valores: unknown): Promise<ResultadoAccion<{ id: string }>> {
  await requerirDocente();

  const datos = guardarVarianteSchema.safeParse(valores);
  if (!datos.success) return { ok: false, error: MENSAJE_DATOS_INVALIDOS };

  const supabase = await createClient();
  const { data: base, error } = await supabase
    .from('escenario')
    .select(
      'descripcion, categoria, dificultad, competencia_central, configuracion_3d, npc ( nombre, edad, perfil_clinico )'
    )
    .eq('id', datos.data.escenarioId)
    .eq('activo', true)
    .maybeSingle();

  if (error || !base?.npc) {
    return { ok: false, error: 'El escenario seleccionado ya no está disponible.' };
  }

  return insertarCaso(
    {
      titulo: datos.data.titulo,
      descripcion: base.descripcion,
      categoria: base.categoria,
      dificultad: base.dificultad,
      competencia_central: base.competencia_central,
      configuracion_3d: base.configuracion_3d,
      borrador: null,
    },
    {
      nombre: base.npc.nombre,
      edad: base.npc.edad,
      perfil_clinico: base.npc.perfil_clinico,
      prompt_sistema: datos.data.prompt,
    }
  );
}

const MENSAJES_ERROR_IA: Record<TipoErrorIA, string> = {
  tiempo_agotado: 'El paciente virtual tardó demasiado en responder. Inténtalo de nuevo.',
  autenticacion: 'El servicio de IA no está disponible.',
  limite: 'El servicio de IA está saturado. Inténtalo en unos segundos.',
  respuesta_invalida: 'El servicio de IA devolvió una respuesta inválida.',
  proveedor: 'El servicio de IA no está disponible.',
};

/**
 * Chat de prueba del constructor: responde con el prompt que se está redactando (más las reglas
 * fijas). No guarda nada ni necesita una sesión.
 */
export async function probarPaciente(
  valores: unknown
): Promise<ResultadoAccion<{ respuesta: string }>> {
  await requerirDocente();

  const datos = probarPacienteSchema.safeParse(valores);
  if (!datos.success) {
    return { ok: false, error: datos.error.issues[0]?.message ?? MENSAJE_DATOS_INVALIDOS };
  }

  try {
    const respuesta = await generarRespuestaPaciente({
      promptSistema: datos.data.prompt,
      historial: datos.data.historial,
      mensaje: datos.data.mensaje,
      nombrePaciente: datos.data.nombre,
    });
    return { ok: true, datos: { respuesta: respuesta.texto } };
  } catch (error) {
    const tipo = error instanceof ErrorIA ? error.tipo : 'proveedor';
    log.error('caso.prueba_ia_fallo', { tipo });
    return { ok: false, error: MENSAJES_ERROR_IA[tipo] };
  }
}
