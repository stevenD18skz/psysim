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
 * con el prompt completo en `context`). Aquí se crean y se vuelven a crear si desaparecen: Juan
 * José avisó que los datos de prueba se pueden borrar.
 *
 * Un perfil y un escenario ya creados NO se actualizan nunca. En PsySim cada práctica lleva su
 * copia del prompt, pero en el orquestador todas las prácticas de un caso comparten escenario: si
 * se sobrescribiera al editar el caso, el paciente de una práctica en curso cambiaría de
 * instrucciones a mitad de la consulta (y su filtro de fuga seguiría comparando con el prompt
 * viejo). Por eso cada versión del contenido tiene los suyos, identificados por la huella de lo
 * que se envió: un caso editado, o una versión nueva del mapeo, crea otros y las prácticas que
 * empiecen después los usan; las que ya estaban abiertas siguen con los de antes. Así tampoco se
 * pisan staging y producción cuando comparten la base con versiones distintas del mapeo.
 *
 * El prompt de una práctica es una copia hecha al asignarla, que el docente pudo ajustar. Si
 * difiere del prompt del caso, la práctica usa un escenario «variante» (mismo perfil, otro
 * contexto).
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

interface Opciones {
  /** Crea de nuevo el perfil y el escenario aunque estén anotados (tras un 404 al usarlos). */
  recrear?: boolean;
  cliente?: ClienteOrquestador;
}

/**
 * Lo que PsySim tiene anotado para exactamente este contenido. Cada versión se guarda bajo su
 * huella; `claveAnterior` es donde lo guardaban las versiones previas de este módulo (`''` para el
 * caso y la huella del prompt para una variante): si lo de ahí sigue correspondiendo a este
 * contenido se aprovecha, para no crear todo otra vez al desplegar.
 */
async function buscarSincronizado(
  escenarioId: string,
  huellaContenido: string,
  claveAnterior: string
): Promise<CasoSincronizado | null> {
  for (const clave of [huellaContenido, claveAnterior]) {
    const fila = await leerCasoSincronizado(escenarioId, clave);
    if (fila?.huella === huellaContenido) return fila;
  }
  return null;
}

/**
 * Deja listo en el orquestador el caso y, si hace falta, la variante de una práctica. `creado`
 * dice si hubo que crear algo (si no, no se llamó al orquestador).
 */
async function sincronizarCaso(
  escenarioId: string,
  promptPractica: string | null,
  { recrear = false, cliente = clienteOrquestador() }: Opciones
): Promise<CasoEnOrquestador & { creado: boolean }> {
  const guardado = await leerCasoParaOrquestador(escenarioId);
  if (!guardado) throw new Error('El caso no existe o no tiene paciente.');
  const { caso } = guardado;
  const docente = cuentaDocente(getOrquestadorEnv());
  let creado = false;

  // 1. El caso tal cual: su perfil y su escenario principal.
  const perfil = perfilDelCaso(caso);
  const escenario = escenarioDelCaso(caso);
  const huella = huellaDeSincronizacion(perfil, escenario);
  let principal = recrear ? null : await buscarSincronizado(escenarioId, huella, '');

  if (!principal) {
    principal = {
      huella,
      perfilId: await cliente.crearPerfil(docente, perfil),
      escenarioId: await cliente.crearEscenario(docente, escenario),
    };
    await guardarCasoSincronizado(escenarioId, huella, principal);
    creado = true;
    if (recrear) {
      log.warn('orquestador.caso_recreado', { escenario_id: escenarioId });
      await registrarEvento({ tipo: 'caso', detalle: 'recreado' });
    }
  }

  // 2. La práctica usa otro prompt (ajustes del docente, o el caso cambió después de asignarla).
  const delCaso = { perfilId: principal.perfilId, escenarioId: principal.escenarioId };
  if (promptPractica === null) return { ...delCaso, creado };
  const variante = huellaDelPrompt(promptPractica);
  if (variante === huellaDelPrompt(caso.prompt)) return { ...delCaso, creado };

  const escenarioVariante = escenarioDelCaso({ ...caso, prompt: promptPractica }, variante);
  const huellaVariante = huellaDeSincronizacion(perfil, escenarioVariante);
  const previa = recrear ? null : await buscarSincronizado(escenarioId, huellaVariante, variante);
  if (previa) return { perfilId: principal.perfilId, escenarioId: previa.escenarioId, creado };

  const escenarioVarianteId = await cliente.crearEscenario(docente, escenarioVariante);
  await guardarCasoSincronizado(escenarioId, huellaVariante, {
    huella: huellaVariante,
    perfilId: principal.perfilId,
    escenarioId: escenarioVarianteId,
  });
  return { perfilId: principal.perfilId, escenarioId: escenarioVarianteId, creado: true };
}

/**
 * Deja al día el caso y, si hace falta, la variante de una práctica. Devuelve los id del
 * orquestador con los que abrir la sesión. Si ese contenido ya estaba creado, no hace ninguna
 * llamada al orquestador; si cambió, crea un perfil y un escenario nuevos (nunca actualiza los que
 * pueden estar usando otras prácticas).
 */
export async function asegurarCaso(
  escenarioId: string,
  promptPractica: string | null,
  opciones: Opciones = {}
): Promise<CasoEnOrquestador> {
  const { perfilId, escenarioId: id } = await sincronizarCaso(
    escenarioId,
    promptPractica,
    opciones
  );
  return { perfilId, escenarioId: id };
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
    try {
      const { creado } = await sincronizarCaso(id, null, opciones);
      resultados.push({ codigo, estado: creado ? 'sincronizado' : 'al_dia' });
    } catch {
      resultados.push({ codigo, estado: 'error' });
    }
  }
  return resultados;
}
