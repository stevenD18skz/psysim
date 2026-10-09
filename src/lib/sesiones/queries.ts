import 'server-only';

import { cache } from 'react';

import { estadoAsignacion } from '@/lib/asignaciones/codigo';
import { obtenerMensajesSesion } from '@/lib/escenarios/queries';
import {
  CASO_NO_DISPONIBLE,
  leerEscenarioDeSesion,
  leerTitulosDeEscenarios,
} from '@/lib/sesiones/datos-privados';
import { createClient } from '@/lib/supabase/server';
import { type Asignacion, type DetalleSesion, type SesionHistorial } from '@/types';

/*
 * Consultas del seguimiento: historial de sesiones, códigos de acceso y detalle para revisar o
 * releer una sesión. Las filas se leen con RLS (el docente ve las de sus estudiantes; el
 * estudiante, las suyas y solo la retroalimentación publicada); los títulos de los casos, con la
 * clave secreta, porque el estudiante no puede leer `escenario`.
 */

const COLUMNAS_HISTORIAL = `
  id, estado, comenzada, inicio, fin, escenario_id,
  usuario ( nombre ),
  retroalimentacion ( publicada_en, nota )
` as const;

interface FilaHistorial {
  id: string;
  estado: SesionHistorial['estado'];
  comenzada: boolean;
  inicio: string;
  fin: string | null;
  escenario_id: string;
  usuario: { nombre: string } | null;
  retroalimentacion: { publicada_en: string | null; nota: number | null } | null;
}

async function aHistorial(filas: FilaHistorial[]): Promise<SesionHistorial[]> {
  const titulos = await leerTitulosDeEscenarios(filas.map(f => f.escenario_id));
  return filas.map(fila => ({
    id: fila.id,
    estado: fila.estado,
    comenzada: fila.comenzada,
    inicio: fila.inicio,
    fin: fila.fin,
    escenario: titulos.get(fila.escenario_id) ?? CASO_NO_DISPONIBLE,
    docente: fila.usuario?.nombre ?? null,
    retroalimentacion: fila.retroalimentacion
      ? {
          publicada: fila.retroalimentacion.publicada_en !== null,
          nota: fila.retroalimentacion.nota,
        }
      : null,
  }));
}

/** Prácticas del estudiante autenticado (de todos sus docentes), de la más reciente a la más antigua. */
export const obtenerPracticas = cache(async (): Promise<SesionHistorial[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('sesion')
    .select(COLUMNAS_HISTORIAL)
    .order('inicio', { ascending: false });

  if (error) {
    throw new Error('No fue posible cargar tus prácticas.', { cause: error });
  }
  return aHistorial(data);
});

/** Sesiones de un estudiante del docente, de la más reciente a la más antigua. */
export const obtenerSesionesDeEstudiante = cache(
  async (estudianteId: string): Promise<SesionHistorial[]> => {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('sesion')
      .select(COLUMNAS_HISTORIAL)
      .eq('estudiante_id', estudianteId)
      .order('inicio', { ascending: false });

    if (error) {
      throw new Error('No fue posible cargar las sesiones del estudiante.', { cause: error });
    }
    return aHistorial(data);
  }
);

/** Códigos de acceso que el docente generó para un estudiante, del más reciente al más antiguo. */
export const obtenerAsignacionesDeEstudiante = cache(
  async (estudianteId: string): Promise<Asignacion[]> => {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('asignacion')
      .select('id, codigo, expira_en, anulada_en, sesion_id, creado_en, escenario_id')
      .eq('estudiante_id', estudianteId)
      .order('creado_en', { ascending: false });

    if (error) {
      throw new Error('No fue posible cargar los códigos de acceso.', { cause: error });
    }

    const titulos = await leerTitulosDeEscenarios(data.map(f => f.escenario_id));
    const ahora = new Date();
    return data.map(fila => ({
      id: fila.id,
      codigo: fila.codigo,
      estado: estadoAsignacion(
        { sesionId: fila.sesion_id, anuladaEn: fila.anulada_en, expiraEn: fila.expira_en },
        ahora
      ),
      expiraEn: fila.expira_en,
      creadoEn: fila.creado_en,
      sesionId: fila.sesion_id,
      escenario: titulos.get(fila.escenario_id) ?? CASO_NO_DISPONIBLE,
    }));
  }
);

/**
 * Sesión completa: datos, conversación y retroalimentación con sus anotaciones. Sirve al docente
 * (revisión) y al estudiante (relectura). `null` si no existe o RLS la oculta.
 */
export const obtenerDetalleSesion = cache(async (id: string): Promise<DetalleSesion | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('sesion')
    .select(
      `id, estado, comenzada, inicio, fin, escenario_id, estudiante_id, codigo_estudiante,
       nombre_estudiante,
       usuario ( nombre ),
       retroalimentacion (
         comentario_general, nota, publicada_en, actualizado_en,
         anotacion ( id, mensaje_id, inicio, fin, fragmento, comentario )
       )`
    )
    .eq('id', id)
    .maybeSingle();

  if (error) {
    throw new Error('No fue posible cargar la sesión.', { cause: error });
  }
  if (!data) return null;

  const [escenario, mensajes] = await Promise.all([
    leerEscenarioDeSesion(data.escenario_id),
    obtenerMensajesSesion(data.id),
  ]);
  const retro = data.retroalimentacion;

  return {
    id: data.id,
    estado: data.estado,
    comenzada: data.comenzada,
    inicio: data.inicio,
    fin: data.fin,
    estudiante: {
      id: data.estudiante_id,
      codigo: data.codigo_estudiante,
      nombre: data.nombre_estudiante,
    },
    docente: data.usuario?.nombre ?? null,
    escenario: escenario
      ? {
          codigo: escenario.codigo,
          titulo: escenario.titulo,
          competenciaCentral: escenario.competenciaCentral,
          configuracion3d: escenario.configuracion3d,
        }
      : { ...CASO_NO_DISPONIBLE, competenciaCentral: '—', configuracion3d: '' },
    npc: escenario
      ? { nombre: escenario.npc.nombre, edad: escenario.npc.edad }
      : { nombre: 'Paciente', edad: 0 },
    mensajes,
    retroalimentacion: retro
      ? {
          comentarioGeneral: retro.comentario_general,
          nota: retro.nota,
          publicadaEn: retro.publicada_en,
          actualizadoEn: retro.actualizado_en,
          anotaciones: retro.anotacion.map(a => ({
            id: a.id,
            mensajeId: a.mensaje_id,
            inicio: a.inicio,
            fin: a.fin,
            fragmento: a.fragmento,
            comentario: a.comentario,
          })),
        }
      : null,
  };
});
