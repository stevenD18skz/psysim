import 'server-only';

import { cache } from 'react';

import { createClient } from '@/lib/supabase/server';
import { borradorCasoSchema } from '@/schemas/caso.schema';
import { type EscenarioCatalogo, type MensajeConversacion, type SesionActiva } from '@/types';

/*
 * Consultas de lectura del Sprint 2. Todas usan el cliente con la sesión del docente, así que
 * RLS garantiza que cada docente solo ve el catálogo activo y sus propias filas.
 * Los errores de base de datos se relanzan: los captura el error boundary de la ruta.
 */

const COLUMNAS_ESCENARIO = `
  id, codigo, titulo, descripcion, categoria, dificultad, competencia_central, configuracion_3d,
  docente_id, borrador, creado_en,
  npc ( id, nombre, edad, perfil_clinico, prompt_sistema )
` as const;

/**
 * HU-06 · T02 — Escenarios activos con su paciente virtual: el catálogo oficial y los casos propios
 * del docente (RLS oculta los de otros), ordenados por código.
 */
export const obtenerCatalogoEscenarios = cache(async (): Promise<EscenarioCatalogo[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('escenario')
    .select(COLUMNAS_ESCENARIO)
    .eq('activo', true)
    .order('codigo');

  if (error) {
    throw new Error('No fue posible cargar los escenarios.', { cause: error });
  }

  return data.flatMap(fila => {
    // `npc` es 1:1 (FK única), pero PostgREST puede devolverlo nulo si falta el registro.
    if (!fila.npc) return [];
    return [
      {
        id: fila.id,
        codigo: fila.codigo,
        titulo: fila.titulo,
        descripcion: fila.descripcion,
        categoria: fila.categoria,
        dificultad: fila.dificultad,
        competenciaCentral: fila.competencia_central,
        configuracion3d: fila.configuracion_3d,
        propio: fila.docente_id !== null,
        borrador: leerBorrador(fila.borrador),
        creadoEn: fila.creado_en,
        npc: {
          id: fila.npc.id,
          nombre: fila.npc.nombre,
          edad: fila.npc.edad,
          perfilClinico: fila.npc.perfil_clinico,
          promptSistema: fila.npc.prompt_sistema,
        },
      },
    ];
  });
});

/** El borrador es JSON libre en la base de datos: si no cumple el esquema se ignora. */
function leerBorrador(valor: unknown) {
  const resultado = borradorCasoSchema.safeParse(valor);
  return resultado.success ? resultado.data : null;
}

const COLUMNAS_SESION = `
  id, inicio, comenzada, estado, codigo_estudiante, nombre_estudiante,
  escenario (
    id, codigo, titulo, descripcion, categoria, dificultad, competencia_central, configuracion_3d,
    npc ( id, nombre, edad )
  )
` as const;

/**
 * Carga una sesión en curso del docente autenticado. Devuelve `null` si no existe, no es
 * suya (RLS la oculta) o ya terminó.
 */
export const obtenerSesionEnCurso = cache(async (id: string): Promise<SesionActiva | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('sesion')
    .select(COLUMNAS_SESION)
    .eq('id', id)
    .eq('estado', 'en_curso')
    .maybeSingle();

  if (error) {
    throw new Error('No fue posible cargar la sesión.', { cause: error });
  }
  const escenario = data?.escenario;
  if (!data || !escenario?.npc) return null;

  return {
    id: data.id,
    inicio: data.inicio,
    comenzada: data.comenzada,
    estudiante: { codigo: data.codigo_estudiante, nombre: data.nombre_estudiante },
    escenario: {
      id: escenario.id,
      codigo: escenario.codigo,
      titulo: escenario.titulo,
      descripcion: escenario.descripcion,
      categoria: escenario.categoria,
      dificultad: escenario.dificultad,
      competenciaCentral: escenario.competencia_central,
      configuracion3d: escenario.configuracion_3d,
    },
    npc: { id: escenario.npc.id, nombre: escenario.npc.nombre, edad: escenario.npc.edad },
  };
});

/**
 * Historial de la conversación de una sesión, en orden cronológico. El mensaje del estudiante
 * y la respuesta del NPC se insertan juntos (mismo `creado_en`): el orden del enum
 * `remitente_mensaje` (estudiante < npc) desempata.
 */
export async function obtenerMensajesSesion(sesionId: string): Promise<MensajeConversacion[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('mensaje')
    .select('id, remitente, contenido, creado_en, latencia_ms')
    .eq('sesion_id', sesionId)
    .order('creado_en')
    .order('remitente');

  if (error) {
    throw new Error('No fue posible cargar la conversación.', { cause: error });
  }

  return data.map(fila => ({
    id: fila.id,
    remitente: fila.remitente,
    contenido: fila.contenido,
    timestamp: fila.creado_en,
    ...(fila.latencia_ms !== null && { latencia_ms: fila.latencia_ms }),
  }));
}

/** Id de la sesión en curso más reciente del docente, si tiene alguna. */
export async function obtenerIdUltimaSesionEnCurso(): Promise<string | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('sesion')
    .select('id')
    .eq('estado', 'en_curso')
    .order('inicio', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error('No fue posible consultar las sesiones en curso.', { cause: error });
  }
  return data?.id ?? null;
}
