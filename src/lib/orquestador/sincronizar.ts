import 'server-only';

import { getOrquestadorEnv } from '@/lib/env/orquestador';
import { log } from '@/lib/log';
import { createAdminClient } from '@/lib/supabase/admin';
import { borradorCasoSchema } from '@/schemas/caso.schema';

import { type ClienteOrquestador, clienteOrquestador } from './cliente';
import { cuentaDocente } from './cuentas';
import {
  type CasoSincronizado,
  guardarCasoSincronizado,
  leerCasoSincronizado,
  registrarEvento,
} from './datos';
import { ErrorOrquestador } from './errores';
import {
  type CasoParaOrquestador,
  escenarioDelCaso,
  huellaDelPrompt,
  huellaDeSincronizacion,
  perfilDelCaso,
} from './mapeo';

/*
 * Cada caso de PsySim tiene en el orquestador un perfil (el paciente) y un escenario (su situación,
 * con el prompt completo en `context`). Aquí se crean, se actualizan cuando el caso cambia y se
 * vuelven a crear si desaparecen: Juan José avisó que los datos de prueba se pueden borrar.
 *
 * El prompt de una práctica es una copia hecha al asignarla, que el docente pudo ajustar. Si
 * difiere del prompt del caso, la práctica usa un escenario «variante» (mismo perfil, otro
 * contexto), identificado por la huella de ese prompt.
 */

/** Lo que una práctica necesita para abrir su sesión en el orquestador. */
export interface CasoEnOrquestador {
  perfilId: string;
  escenarioId: string;
}

interface CasoGuardado {
  caso: CasoParaOrquestador;
  /** `true` si es un caso oficial (sin dueño). */
  oficial: boolean;
}

/** Lee el caso con la clave secreta: llamar solo con un id que ya pasó por RLS. */
export async function leerCasoParaOrquestador(escenarioId: string): Promise<CasoGuardado | null> {
  const { data, error } = await createAdminClient()
    .from('escenario')
    .select(
      `codigo, titulo, categoria, dificultad, borrador, docente_id,
       npc ( nombre, edad, perfil_clinico, prompt_sistema )`
    )
    .eq('id', escenarioId)
    .maybeSingle();
  if (error) throw new Error('No pudimos leer el caso para sincronizarlo.', { cause: error });
  if (!data?.npc) return null;

  // Los campos del constructor solo describen el caso si se guardó en modo guiado.
  const borrador = borradorCasoSchema.safeParse(data.borrador);
  const campos = borrador.success && !borrador.data.modoTexto ? borrador.data.campos : null;
  return {
    oficial: data.docente_id === null,
    caso: {
      codigo: data.codigo,
      titulo: data.titulo,
      categoria: data.categoria,
      dificultad: data.dificultad,
      paciente: {
        nombre: data.npc.nombre,
        edad: data.npc.edad,
        perfilClinico: data.npc.perfil_clinico,
      },
      prompt: data.npc.prompt_sistema,
      campos,
    },
  };
}

/** 404 (lo borraron) o 403 (lo creó otra cuenta): no se puede actualizar, hay que crearlo. */
function hayQueRecrear(error: unknown): boolean {
  return (
    error instanceof ErrorOrquestador &&
    (error.tipo === 'no_encontrado' || error.tipo === 'permiso')
  );
}

interface Opciones {
  /** No intenta actualizar: crea de nuevo el perfil y el escenario (tras un 404 al usarlos). */
  recrear?: boolean;
  cliente?: ClienteOrquestador;
}

/**
 * Deja al día el caso (fila principal) y, si hace falta, la variante de una práctica. Devuelve los
 * id del orquestador con los que abrir la sesión. Si nada cambió desde la última vez, no hace
 * ninguna llamada al orquestador.
 */
export async function asegurarCaso(
  escenarioId: string,
  promptPractica: string | null,
  { recrear = false, cliente = clienteOrquestador() }: Opciones = {}
): Promise<CasoEnOrquestador> {
  const guardado = await leerCasoParaOrquestador(escenarioId);
  if (!guardado) throw new Error('El caso no existe o no tiene paciente.');
  const { caso } = guardado;
  const docente = cuentaDocente(getOrquestadorEnv());

  // 1. El caso tal cual: su perfil y su escenario principal.
  const perfil = perfilDelCaso(caso);
  const escenario = escenarioDelCaso(caso);
  const huella = huellaDeSincronizacion(perfil, escenario);
  let principal = await leerCasoSincronizado(escenarioId, '');

  if (!principal || principal.huella !== huella || recrear) {
    let ids: Pick<CasoSincronizado, 'perfilId' | 'escenarioId'> | null = null;
    if (principal && !recrear) {
      try {
        await cliente.actualizarPerfil(docente, principal.perfilId, perfil);
        await cliente.actualizarEscenario(docente, principal.escenarioId, escenario);
        ids = principal;
      } catch (error) {
        if (!hayQueRecrear(error)) throw error;
      }
    }
    if (!ids) {
      ids = {
        perfilId: await cliente.crearPerfil(docente, perfil),
        escenarioId: await cliente.crearEscenario(docente, escenario),
      };
      if (principal) {
        log.warn('orquestador.caso_recreado', { escenario_id: escenarioId });
        await registrarEvento({ tipo: 'caso', detalle: 'recreado' });
      }
    }
    principal = { ...ids, huella };
    await guardarCasoSincronizado(escenarioId, '', principal);
  }

  // 2. La práctica usa otro prompt (ajustes del docente, o el caso cambió después de asignarla).
  const delCaso = { perfilId: principal.perfilId, escenarioId: principal.escenarioId };
  if (promptPractica === null) return delCaso;
  const variante = huellaDelPrompt(promptPractica);
  if (variante === huellaDelPrompt(caso.prompt)) return delCaso;

  const escenarioVariante = escenarioDelCaso({ ...caso, prompt: promptPractica }, variante);
  const huellaVariante = huellaDeSincronizacion(perfil, escenarioVariante);
  const previa = await leerCasoSincronizado(escenarioId, variante);
  if (previa && previa.huella === huellaVariante && !recrear) {
    return { perfilId: principal.perfilId, escenarioId: previa.escenarioId };
  }

  let escenarioVarianteId: string | null = null;
  if (previa && !recrear) {
    try {
      await cliente.actualizarEscenario(docente, previa.escenarioId, escenarioVariante);
      escenarioVarianteId = previa.escenarioId;
    } catch (error) {
      if (!hayQueRecrear(error)) throw error;
    }
  }
  escenarioVarianteId ??= await cliente.crearEscenario(docente, escenarioVariante);
  await guardarCasoSincronizado(escenarioId, variante, {
    huella: huellaVariante,
    perfilId: principal.perfilId,
    escenarioId: escenarioVarianteId,
  });
  return { perfilId: principal.perfilId, escenarioId: escenarioVarianteId };
}

/**
 * Tras crear o editar un caso: lo deja sincronizado sin frenar al docente. Si el orquestador no
 * responde, el caso queda guardado igual y se sincroniza cuando empiece su primera práctica.
 */
export async function sincronizarCasoGuardado(escenarioId: string): Promise<void> {
  try {
    await asegurarCaso(escenarioId, null);
  } catch (error) {
    const tipo = error instanceof ErrorOrquestador ? error.tipo : 'desconocido';
    log.warn('orquestador.caso_no_sincronizado', { escenario_id: escenarioId, tipo });
  }
}

export interface ResultadoSincronizacion {
  codigo: string;
  estado: 'al_dia' | 'sincronizado' | 'error';
}

/** Sincroniza los casos oficiales (E-01 a E-12). Lo usa `pnpm orquestador:sincronizar`. */
export async function sincronizarOficiales(
  opciones: Opciones = {}
): Promise<ResultadoSincronizacion[]> {
  const { data, error } = await createAdminClient()
    .from('escenario')
    .select('id, codigo')
    .is('docente_id', null)
    .eq('activo', true)
    .order('codigo');
  if (error) throw new Error('No pudimos leer los casos oficiales.', { cause: error });

  const resultados: ResultadoSincronizacion[] = [];
  for (const { id, codigo } of data) {
    const antes = await leerCasoSincronizado(id, '');
    try {
      await asegurarCaso(id, null, opciones);
      const despues = await leerCasoSincronizado(id, '');
      const igual = antes !== null && antes.huella === despues?.huella && !opciones.recrear;
      resultados.push({ codigo, estado: igual ? 'al_dia' : 'sincronizado' });
    } catch {
      resultados.push({ codigo, estado: 'error' });
    }
  }
  return resultados;
}
