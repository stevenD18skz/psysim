import 'server-only';

import { esMotivoCierre, type MotivoCierre } from '@/lib/conversacion/cierre';
import { type ProveedorIA } from '@/lib/env/orquestador';
import { log } from '@/lib/log';
import { createAdminClient } from '@/lib/supabase/admin';

import { CUPO_POR_MINUTO } from './cuentas';

/*
 * Lo que PsySim guarda sobre el orquestador. Ninguna de estas tablas es visible para el navegador
 * (sin políticas ni permisos para `authenticated`): se leen y se escriben con la clave secreta, y
 * SOLO después de que la práctica pasó por RLS con el cliente del usuario.
 */

export interface SesionIa {
  proveedor: ProveedorIA;
  /** Clave de la cuenta del orquestador dueña de la sesión. */
  cuenta: string | null;
  sesionOrquestador: string | null;
  severidad: number | null;
  cierreMotivo: MotivoCierre | null;
  cerradaEnOrquestador: boolean;
}

const COLUMNAS_SESION_IA =
  'proveedor, cuenta, sesion_orquestador, severidad, cierre_motivo, cerrada_en_orquestador';

interface FilaSesionIa {
  proveedor: string;
  cuenta: string | null;
  sesion_orquestador: string | null;
  severidad: number | null;
  cierre_motivo: string | null;
  cerrada_en_orquestador: string | null;
}

function aSesionIa(fila: FilaSesionIa): SesionIa {
  return {
    proveedor: fila.proveedor === 'orquestador' ? 'orquestador' : 'gemini',
    cuenta: fila.cuenta,
    sesionOrquestador: fila.sesion_orquestador,
    severidad: fila.severidad,
    cierreMotivo: esMotivoCierre(fila.cierre_motivo) ? fila.cierre_motivo : null,
    cerradaEnOrquestador: fila.cerrada_en_orquestador !== null,
  };
}

/** Proveedor y sesión del orquestador de una práctica ya autorizada (`null` si aún no tiene). */
export async function leerSesionIa(sesionId: string): Promise<SesionIa | null> {
  const { data, error } = await createAdminClient()
    .from('sesion_ia')
    .select(COLUMNAS_SESION_IA)
    .eq('sesion_id', sesionId)
    .maybeSingle();
  if (error) throw new Error('No pudimos leer el proveedor de la práctica.', { cause: error });
  return data ? aSesionIa(data) : null;
}

export type Asignacion =
  | { lleno: false; sesion: Pick<SesionIa, 'proveedor' | 'cuenta'> }
  /** Todas las cuentas alcanzaron el tope del Administrador. */
  | { lleno: true; enCurso: number };

/**
 * Fija la práctica a la cuenta del orquestador con menos prácticas activas (función atómica de la
 * base de datos). Si ya tenía cuenta o proveedor, devuelve lo que tenía.
 */
export async function asignarCuenta(sesionId: string, claves: string[]): Promise<Asignacion> {
  const { data, error } = await createAdminClient()
    .rpc('asignar_cuenta_orquestador', { p_sesion_id: sesionId, p_cuentas: claves })
    .maybeSingle();
  if (error || !data) {
    throw new Error('No pudimos asignar una cuenta del orquestador.', { cause: error });
  }
  if (data.sin_cupo) return { lleno: true, enCurso: data.practicas_en_curso };
  return {
    lleno: false,
    sesion: {
      proveedor: data.proveedor_fijado === 'orquestador' ? 'orquestador' : 'gemini',
      cuenta: data.cuenta_asignada,
    },
  };
}

/** Tipos de evento que ve el Administrador (`orquestador_evento.tipo`). */
export type TipoEvento = 'error' | 'respaldo' | 'espera' | 'limite' | 'cierre' | 'caso';

/**
 * Deja constancia de algo que pasó con el orquestador. `detalle` es un código corto (`red`,
 * `servidor`, `recreado`…), nunca texto de la conversación. Si falla, la práctica sigue.
 */
export async function registrarEvento(evento: {
  tipo: TipoEvento;
  detalle: string;
  sesionId?: string | null;
  cuenta?: string | null;
  esperaMs?: number;
}): Promise<void> {
  const { error } = await createAdminClient()
    .from('orquestador_evento')
    .insert({
      tipo: evento.tipo,
      detalle: evento.detalle,
      sesion_id: evento.sesionId ?? null,
      cuenta: evento.cuenta ?? null,
      espera_ms: evento.esperaMs === undefined ? null : Math.round(evento.esperaMs),
    });
  if (error) log.warn('orquestador.evento_no_registrado', { codigo: error.code });
}

/**
 * La práctica pasa a Gemini y se queda ahí: el orquestador arma el contexto con su propio
 * historial y, desde este turno, el historial completo solo lo tiene PsySim. Crea la fila si la
 * práctica todavía no tenía proveedor.
 */
export async function fijarGemini(sesionId: string, motivo: string): Promise<void> {
  const admin = createAdminClient();
  const cambio = {
    proveedor: 'gemini',
    cambio_motivo: motivo,
    cambio_en: new Date().toISOString(),
  };
  const { data, error } = await admin
    .from('sesion_ia')
    .update(cambio)
    .eq('sesion_id', sesionId)
    .eq('proveedor', 'orquestador')
    .select('sesion_id');
  if (error) throw new Error('No pudimos fijar el proveedor de la práctica.', { cause: error });
  if (data.length === 0) {
    // Sin fila (o ya en Gemini): se inserta solo si no existía, sin pisar un motivo anterior.
    const { error: errorAlta } = await admin
      .from('sesion_ia')
      .upsert(
        { sesion_id: sesionId, ...cambio },
        { onConflict: 'sesion_id', ignoreDuplicates: true }
      );
    if (errorAlta) {
      throw new Error('No pudimos fijar el proveedor de la práctica.', { cause: errorAlta });
    }
  }
  await registrarEvento({ tipo: 'respaldo', detalle: motivo, sesionId });
}

/**
 * Reserva un cupo de la cuenta en el último minuto. Devuelve 0 si quedó reservado o los
 * milisegundos que faltan para el siguiente. Si el conteo falla, devuelve 0: la práctica sigue y
 * el 429 del orquestador queda como red de seguridad.
 */
export async function reservarTurno(cuenta: string): Promise<number> {
  const { data, error } = await createAdminClient().rpc('reservar_turno_orquestador', {
    p_cuenta: cuenta,
    p_cupo: CUPO_POR_MINUTO,
  });
  if (error) {
    log.error('orquestador.turno_no_reservado', { codigo: error.code });
    return 0;
  }
  return Math.max(0, data);
}

/** La sesión del orquestador ya quedó cerrada (o ya no existe): no hay que volver a intentarlo. */
export async function marcarCerradaEnOrquestador(sesionId: string): Promise<void> {
  const { error } = await createAdminClient()
    .from('sesion_ia')
    .update({ cerrada_en_orquestador: new Date().toISOString() })
    .eq('sesion_id', sesionId);
  if (error) log.warn('orquestador.cierre_no_anotado', { codigo: error.code });
}

export interface CasoSincronizado {
  huella: string;
  perfilId: string;
  escenarioId: string;
}

/** Perfil y escenario del orquestador de un caso (`variante` vacía) o de una de sus variantes. */
export async function leerCasoSincronizado(
  escenarioId: string,
  variante: string
): Promise<CasoSincronizado | null> {
  const { data, error } = await createAdminClient()
    .from('orquestador_caso')
    .select('huella, perfil_id, escenario_orquestador_id')
    .eq('escenario_id', escenarioId)
    .eq('variante', variante)
    .maybeSingle();
  if (error) throw new Error('No pudimos leer la sincronización del caso.', { cause: error });
  return data
    ? { huella: data.huella, perfilId: data.perfil_id, escenarioId: data.escenario_orquestador_id }
    : null;
}

export async function guardarCasoSincronizado(
  escenarioId: string,
  variante: string,
  caso: CasoSincronizado
): Promise<void> {
  const { error } = await createAdminClient().from('orquestador_caso').upsert(
    {
      escenario_id: escenarioId,
      variante,
      huella: caso.huella,
      perfil_id: caso.perfilId,
      escenario_orquestador_id: caso.escenarioId,
      actualizado_en: new Date().toISOString(),
    },
    { onConflict: 'escenario_id,variante' }
  );
  if (error) throw new Error('No pudimos guardar la sincronización del caso.', { cause: error });
}
