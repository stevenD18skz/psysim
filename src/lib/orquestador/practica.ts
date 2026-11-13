import 'server-only';

import { getOrquestadorEnv } from '@/lib/env/orquestador';
import { log } from '@/lib/log';
import { createAdminClient } from '@/lib/supabase/admin';

import { type ClienteOrquestador, clienteOrquestador } from './cliente';
import {
  cuentaDocente,
  type CuentaOrquestador,
  cuentaPorClave,
  cuentasDeConversacion,
} from './cuentas';
import {
  asignarCuenta,
  fijarGemini,
  leerSesionIa,
  marcarCerradaEnOrquestador,
  type SesionIa,
} from './datos';
import { ErrorOrquestador } from './errores';
import { asegurarCaso } from './sincronizar';
import { type CierreOrquestador } from './tipos';

/** Con qué va a conversar una práctica. */
export type Preparacion =
  | {
      estado: 'lista';
      cuenta: CuentaOrquestador;
      sesionOrquestador: string;
      /** Severidad con la que quedó el paciente en el turno anterior (o la inicial). */
      severidad: number | null;
    }
  /** La práctica es de Gemini (lo era, o acaba de pasar a serlo). */
  | { estado: 'gemini' }
  /** El Administrador activó el tope y todas las cuentas lo alcanzaron. */
  | { estado: 'sin_cupo'; enCurso: number };

export interface PracticaPorPreparar {
  sesionId: string;
  escenarioId: string;
  /** Prompt de la práctica (la copia que se hizo al asignarla). */
  prompt: string;
  /** La práctica ya tiene conversación guardada en PsySim. */
  hayHistorial: boolean;
  /** Lo que ya se leyó de `sesion_ia` en esta petición (evita leerlo dos veces). */
  sesionIa?: SesionIa | null;
  cliente?: ClienteOrquestador;
}

// Id de usuario del orquestador de cada cuenta del grupo. No cambia: se pregunta una vez por
// proceso (hace falta para asignarle la sesión con `user_id`).
const idsDeUsuario = new Map<string, string>();

async function idDeUsuario(cliente: ClienteOrquestador, cuenta: CuentaOrquestador) {
  let id = idsDeUsuario.get(cuenta.clave);
  if (!id) {
    id = (await cliente.yo(cuenta)).id;
    idsDeUsuario.set(cuenta.clave, id);
  }
  return id;
}

/**
 * Deja la práctica lista para conversar con el orquestador: le fija una cuenta (la de menos
 * prácticas activas), sincroniza su caso y abre la sesión. Si ya estaba lista, solo la devuelve.
 *
 * La sesión del orquestador solo se abre con el historial de PsySim vacío: el orquestador arma el
 * contexto con SU historial, así que una práctica que ya conversó con Gemini se queda en Gemini.
 * Lanza `ErrorOrquestador` si el orquestador falla; quien llama decide si responde Gemini.
 */
export async function prepararPractica({
  sesionId,
  escenarioId,
  prompt,
  hayHistorial,
  sesionIa,
  cliente = clienteOrquestador(),
}: PracticaPorPreparar): Promise<Preparacion> {
  const env = getOrquestadorEnv();
  const actual = sesionIa === undefined ? await leerSesionIa(sesionId) : sesionIa;
  if (actual?.proveedor === 'gemini') return { estado: 'gemini' };

  let clave = actual?.cuenta ?? null;
  if (actual?.sesionOrquestador && clave) {
    const cuenta = cuentaPorClave(env, clave);
    if (cuenta) {
      return {
        estado: 'lista',
        cuenta,
        sesionOrquestador: actual.sesionOrquestador,
        severidad: actual.severidad,
      };
    }
  }
  if (hayHistorial) {
    await fijarGemini(sesionId, actual ? 'sesion_incompleta' : 'historial_previo');
    return { estado: 'gemini' };
  }

  if (!clave) {
    const claves = cuentasDeConversacion(env).map(cuenta => cuenta.clave);
    const asignacion = await asignarCuenta(sesionId, claves);
    if (asignacion.lleno) return { estado: 'sin_cupo', enCurso: asignacion.enCurso };
    if (asignacion.sesion.proveedor === 'gemini') return { estado: 'gemini' };
    clave = asignacion.sesion.cuenta;
  }
  const cuenta = clave ? cuentaPorClave(env, clave) : null;
  if (!cuenta) {
    // La cuenta se quitó de la configuración: esta práctica ya no puede usar el orquestador.
    await fijarGemini(sesionId, 'cuenta_retirada');
    return { estado: 'gemini' };
  }

  const docente = cuentaDocente(env);
  const usuarioId = cuenta.esDocente ? undefined : await idDeUsuario(cliente, cuenta);
  let caso = await asegurarCaso(escenarioId, prompt, { cliente });
  let sesion;
  try {
    sesion = await cliente.abrirSesion(docente, { ...caso, usuarioId });
  } catch (error) {
    // 404: borraron el perfil o el escenario (son datos de prueba). Se crean de nuevo.
    if (!(error instanceof ErrorOrquestador) || error.tipo !== 'no_encontrado') throw error;
    caso = await asegurarCaso(escenarioId, prompt, { cliente, recrear: true });
    sesion = await cliente.abrirSesion(docente, { ...caso, usuarioId });
  }

  // Dos peticiones a la vez pueden abrir dos sesiones: gana la primera que la anota.
  const { data, error } = await createAdminClient()
    .from('sesion_ia')
    .update({ sesion_orquestador: sesion.id, severidad: sesion.current_severity })
    .eq('sesion_id', sesionId)
    .is('sesion_orquestador', null)
    .select('sesion_id');
  if (error) throw new Error('No pudimos guardar la sesión del orquestador.', { cause: error });
  if (data.length === 0) {
    await cliente.cerrarSesion(docente, sesion.id, 'success').catch(() => undefined);
    const ganadora = await leerSesionIa(sesionId);
    if (ganadora?.proveedor !== 'orquestador' || !ganadora.sesionOrquestador) {
      return { estado: 'gemini' };
    }
    return {
      estado: 'lista',
      cuenta,
      sesionOrquestador: ganadora.sesionOrquestador,
      severidad: ganadora.severidad,
    };
  }
  return {
    estado: 'lista',
    cuenta,
    sesionOrquestador: sesion.id,
    severidad: sesion.current_severity,
  };
}

/**
 * El estudiante va a comenzar la práctica: se le fija ya la cuenta del orquestador, para aplicar el
 * tope de prácticas simultáneas antes de que entre al consultorio y no en su primer mensaje.
 * Llamar solo con una práctica en curso que ya pasó por RLS. Si algo falla, deja comenzar: la ruta
 * del chat vuelve a intentarlo (la asignación es idempotente).
 */
export async function reservarCuentaAlComenzar(
  sesionId: string
): Promise<{ lleno: false } | { lleno: true; enCurso: number }> {
  try {
    const claves = cuentasDeConversacion(getOrquestadorEnv()).map(cuenta => cuenta.clave);
    const asignacion = await asignarCuenta(sesionId, claves);
    return asignacion.lleno ? { lleno: true, enCurso: asignacion.enCurso } : { lleno: false };
  } catch {
    log.warn('orquestador.cuenta_no_reservada', { sesion_id: sesionId });
    return { lleno: false };
  }
}

/** Olvida la sesión del orquestador de una práctica sin conversación (la borraron allá). */
export async function olvidarSesionOrquestador(sesionId: string): Promise<void> {
  const { error } = await createAdminClient()
    .from('sesion_ia')
    .update({ sesion_orquestador: null, severidad: null })
    .eq('sesion_id', sesionId);
  if (error) throw new Error('No pudimos reiniciar la sesión del orquestador.', { cause: error });
}

const CIERRE_POR_MOTIVO = { crisis: 'crisis', inapropiada: 'inappropriate' } as const;

/**
 * La práctica terminó en PsySim: reporta su duración (la que calculó la base de datos de PsySim)
 * y cierra la sesión del orquestador. No lee ni guarda la evaluación automática que el orquestador
 * calcula al cerrar: PsySim no evalúa al estudiante.
 *
 * No lanza: si algo falla, la sesión queda pendiente y `cerrarPendientes` lo reintenta después.
 */
export async function cerrarEnOrquestador(
  sesionId: string,
  cliente: ClienteOrquestador = clienteOrquestador()
): Promise<boolean> {
  try {
    const admin = createAdminClient();
    const [{ data: sesion, error }, sesionIa] = await Promise.all([
      admin
        .from('sesion')
        .select('estado, comenzada, inicio, fin')
        .eq('id', sesionId)
        .maybeSingle(),
      leerSesionIa(sesionId),
    ]);
    if (error) throw new Error('No pudimos leer la práctica.', { cause: error });
    if (!sesion || sesion.estado === 'en_curso') return false;
    if (!sesionIa?.sesionOrquestador || sesionIa.cerradaEnOrquestador) return false;

    const env = getOrquestadorEnv();
    const duenia = sesionIa.cuenta ? cuentaPorClave(env, sesionIa.cuenta) : null;
    const segundos =
      sesion.comenzada && sesion.fin
        ? (Date.parse(sesion.fin) - Date.parse(sesion.inicio)) / 1000
        : 0;
    // El tiempo solo lo acepta de la cuenta dueña; si el orquestador ya cerró la sesión, lo ignora.
    if (duenia && segundos > 0) {
      await cliente.reportarTiempo(duenia, sesionIa.sesionOrquestador, segundos);
    }
    const cierre: CierreOrquestador = sesionIa.cierreMotivo
      ? CIERRE_POR_MOTIVO[sesionIa.cierreMotivo]
      : 'success';
    // La cuenta `teacher` asignó la sesión (o es su dueña): puede cerrarla siempre.
    await cliente.cerrarSesion(cuentaDocente(env), sesionIa.sesionOrquestador, cierre);
    await marcarCerradaEnOrquestador(sesionId);
    return true;
  } catch (error) {
    if (error instanceof ErrorOrquestador && error.tipo === 'no_encontrado') {
      // Ya no existe allá: no queda nada por cerrar.
      await marcarCerradaEnOrquestador(sesionId);
      return true;
    }
    const tipo = error instanceof ErrorOrquestador ? error.tipo : 'desconocido';
    log.warn('orquestador.sesion_no_cerrada', { sesion_id: sesionId, tipo });
    return false;
  }
}

/**
 * Cierra en el orquestador las sesiones de prácticas que PsySim ya terminó por otro camino (el
 * barrido de inactividad, el docente, una pestaña cerrada). Se llama después de responder, cuando
 * empieza o termina alguna práctica.
 */
export async function cerrarPendientes(limite = 5): Promise<number> {
  try {
    const { data, error } = await createAdminClient()
      .from('sesion_ia')
      .select('sesion_id, sesion!inner ( estado )')
      .not('sesion_orquestador', 'is', null)
      .is('cerrada_en_orquestador', null)
      .neq('sesion.estado', 'en_curso')
      .order('creado_en')
      .limit(limite);
    if (error) throw new Error('No pudimos leer las sesiones por cerrar.', { cause: error });

    let cerradas = 0;
    for (const { sesion_id } of data) {
      if (await cerrarEnOrquestador(sesion_id)) cerradas++;
    }
    return cerradas;
  } catch {
    log.warn('orquestador.pendientes_no_cerradas', {});
    return 0;
  }
}
