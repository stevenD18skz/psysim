import 'server-only';

import { cache } from 'react';

import { CODIGO_PG } from '@/lib/acciones';
import { estadoAsignacion } from '@/lib/asignaciones/codigo';
import { requerirSuperadmin } from '@/lib/auth/dal';
import { type AvatarId, esAvatarId } from '@/lib/avatares/catalogo';
import { aEstudiante, COLUMNAS_RESUMEN, conAvataresDeCuenta } from '@/lib/estudiantes/queries';
import { log } from '@/lib/log';
import { CASO_NO_DISPONIBLE, leerTitulosDeEscenarios } from '@/lib/sesiones/datos-privados';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import {
  type Asignacion,
  type DocenteAdmin,
  type EstudianteRegistrado,
  type SesionHistorial,
} from '@/types';
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
    throw new Error('No pudimos cargar los docentes.', { cause: error });
  }
  const docentes = data.map(aDocente);
  if (docentes.length === 0) return docentes;

  const admin = createAdminClient();
  const { data: usuarios, error: errorAvatares } = await admin
    .from('usuario')
    .select('id, avatar_id')
    .in(
      'id',
      docentes.map(d => d.id)
    );
  if (errorAvatares && errorAvatares.code !== CODIGO_PG.UNDEFINED_COLUMN) {
    log.error('admin.avatares_docentes_no_disponibles', { codigo: errorAvatares.code });
  }
  const avatares = new Map<string, AvatarId>();
  for (const u of usuarios ?? []) {
    if (esAvatarId(u.avatar_id)) avatares.set(u.id, u.avatar_id);
  }
  return docentes.map(d => ({ ...d, avatarId: avatares.get(d.id) ?? null }));
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
    throw new Error('No pudimos cargar la ficha del docente.', {
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
      throw new Error('No pudimos cargar los estudiantes del docente.', { cause: error });
    }
    estudiantes = await conAvataresDeCuenta(data.flatMap(fila => aEstudiante(fila) ?? []));
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

/**
 * Todos los estudiantes registrados en la plataforma con sus métricas y el docente al que
 * pertenecen, para cuando el Administrador abre «Estudiantes» o «Asignar práctica».
 */
export const obtenerTodosLosEstudiantes = cache(async (): Promise<EstudianteRegistrado[]> => {
  await requerirSuperadmin();

  const admin = createAdminClient();
  const [resumen, vinculos] = await Promise.all([
    admin
      .from('estudiante_resumen')
      .select(COLUMNAS_RESUMEN)
      .order('ultima_sesion', { ascending: false, nullsFirst: false })
      .order('nombre'),
    admin
      .from('estudiante')
      .select('id, docente_id, usuario!estudiante_docente_id_fkey ( nombre )'),
  ]);
  if (resumen.error || vinculos.error) {
    throw new Error('No pudimos cargar los estudiantes. Inténtalo de nuevo.', {
      cause: resumen.error ?? vinculos.error,
    });
  }

  const docentesPorRegistro = new Map(
    vinculos.data.map(fila => [
      fila.id,
      fila.usuario ? { id: fila.docente_id, nombre: fila.usuario.nombre } : undefined,
    ])
  );

  const estudiantes = resumen.data.flatMap(fila => {
    const base = aEstudiante(fila);
    if (!base) return [];
    const docente = docentesPorRegistro.get(base.id);
    return [{ ...base, ...(docente && { docente }) }];
  });
  return conAvataresDeCuenta(estudiantes);
});

/**
 * Ficha completa de un estudiante para el Administrador (datos, docente al que pertenece,
 * prácticas y códigos de acceso), aunque pertenezca a otro docente.
 */
export async function obtenerFichaEstudianteAdmin(id: string): Promise<{
  estudiante: EstudianteRegistrado;
  sesiones: SesionHistorial[];
  asignaciones: Asignacion[];
} | null> {
  await requerirSuperadmin();

  const admin = createAdminClient();
  const [resumen, vinculo, sesionesRes, asignacionesRes] = await Promise.all([
    admin.from('estudiante_resumen').select(COLUMNAS_RESUMEN).eq('id', id).maybeSingle(),
    admin
      .from('estudiante')
      .select('docente_id, usuario!estudiante_docente_id_fkey ( nombre )')
      .eq('id', id)
      .maybeSingle(),
    admin
      .from('sesion')
      .select(
        `id, estado, comenzada, inicio, fin, escenario_id, ultima_actividad,
         usuario ( nombre ),
         retroalimentacion ( publicada_en, nota ),
         intervenciones:mensaje ( count )`
      )
      .eq('estudiante_id', id)
      .eq('intervenciones.remitente', 'estudiante')
      .is('intervenciones.descartado_en', null)
      .order('inicio', { ascending: false }),
    admin
      .from('asignacion')
      .select('id, codigo, expira_en, anulada_en, sesion_id, creado_en, escenario_id')
      .eq('estudiante_id', id)
      .order('creado_en', { ascending: false }),
  ]);

  if (resumen.error || vinculo.error || sesionesRes.error || asignacionesRes.error) {
    throw new Error('No pudimos cargar al estudiante. Inténtalo de nuevo.', {
      cause: resumen.error ?? vinculo.error ?? sesionesRes.error ?? asignacionesRes.error,
    });
  }
  if (!resumen.data) return null;

  const base = aEstudiante(resumen.data);
  if (!base) return null;

  const docente =
    vinculo.data && vinculo.data.usuario
      ? { id: vinculo.data.docente_id, nombre: vinculo.data.usuario.nombre }
      : undefined;

  const idsEscenarios = [
    ...sesionesRes.data.map(f => f.escenario_id),
    ...asignacionesRes.data.map(f => f.escenario_id),
  ];
  const [titulos, [estudiante]] = await Promise.all([
    leerTitulosDeEscenarios(idsEscenarios),
    conAvataresDeCuenta([base]),
  ]);
  const ahora = new Date();

  const sesiones: SesionHistorial[] = sesionesRes.data.map(fila => ({
    id: fila.id,
    estado: fila.estado,
    comenzada: fila.comenzada,
    intervenciones: fila.intervenciones?.[0]?.count ?? 0,
    inicio: fila.inicio,
    fin: fila.fin,
    ultimaActividad: fila.ultima_actividad,
    escenario: titulos.get(fila.escenario_id) ?? CASO_NO_DISPONIBLE,
    docente: fila.usuario?.nombre ?? null,
    retroalimentacion: fila.retroalimentacion
      ? {
          publicada: fila.retroalimentacion.publicada_en !== null,
          nota: fila.retroalimentacion.nota,
        }
      : null,
  }));

  const asignaciones: Asignacion[] = asignacionesRes.data.map(fila => ({
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

  return {
    estudiante: { ...(estudiante ?? base), ...(docente && { docente }) },
    sesiones,
    asignaciones,
  };
}
